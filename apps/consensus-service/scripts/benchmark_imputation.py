import numpy as np
import time
import pandas as pd
from typing import Callable, Dict, List, Tuple
import sys
import os
from tabulate import tabulate
import logging
import contextlib
import multiprocessing
from joblib import Parallel, delayed

# Add parent directory to path to import from api
from api.update_gac_scores import cosine_impute

@contextlib.contextmanager
def silence_logger(logger_name):
    """Temporarily silence a logger"""
    logger = logging.getLogger(logger_name)
    original_level = logger.getEffectiveLevel()
    logger.setLevel(logging.WARNING)  # Only show warnings and errors
    try:
        yield
    finally:
        logger.setLevel(original_level)

def sds_impute(vote_matrix: pd.DataFrame,
               k_user: float = 3.0,
               k_statement: float = 2.0,
               w_user: float = 0.6,
               w_statement: float = 0.4) -> pd.DataFrame:
    """SDS implementation with parallel processing"""
    matrix_values = vote_matrix.values
    
    # Pre-calculate masks and indices once
    missing_mask = np.isnan(matrix_values)
    missing_indices = np.where(missing_mask)
    n_users = len(matrix_values)
    
    # Pre-calculate valid votes masks for all users
    valid_votes_masks = ~np.isnan(matrix_values)
    user_valid_votes = [matrix_values[i][valid_votes_masks[i]] for i in range(n_users)]
    user_vote_patterns = np.array([
        np.mean(votes) * (len(votes) / (len(votes) + k_statement))
        if len(votes) > 0 else 0.0
        for votes in user_valid_votes
    ])
    
    def calculate_user_similarities(user_idx: int) -> np.ndarray:
        """Calculate similarities for a user against all other users vectorized"""
        user_votes = matrix_values[user_idx]
        
        # Calculate overlaps for all users at once
        overlaps = valid_votes_masks[user_idx] & valid_votes_masks
        n_overlaps = np.sum(overlaps, axis=1)
        
        # Where there are no overlaps, we'll get 0 similarity
        no_overlap_mask = n_overlaps == 0
        similarities = np.zeros(n_users)
        
        # Only calculate for users with overlaps
        has_overlaps = ~no_overlap_mask
        if np.any(has_overlaps):
            # Calculate agreement ratios vectorized
            votes_i = user_votes[None, :]  # Add dimension for broadcasting
            agreement_ratios = np.zeros(n_users)
            
            # Calculate only for users with overlaps
            overlap_indices = np.where(has_overlaps)[0]
            for idx in overlap_indices:
                common_mask = overlaps[idx]
                if np.any(common_mask):
                    votes1 = user_votes[common_mask]
                    votes2 = matrix_values[idx][common_mask]
                    agreement_ratios[idx] = np.mean(votes1 * votes2)
            
            # Calculate confidence factors
            confidence = n_overlaps / (n_overlaps + k_user)
            
            # Combine for final similarities
            similarities[has_overlaps] = agreement_ratios[has_overlaps] * confidence[has_overlaps]
        
        return similarities
    
    def process_missing_value(user_idx: int, statement_idx: int) -> Tuple[int, int, float]:
        """Process a single missing value and return indices with result"""
        similarities = calculate_user_similarities(user_idx)
        
        # Get relevant votes for this statement
        statement_votes = matrix_values[:, statement_idx]
        valid_votes_mask = ~np.isnan(statement_votes)
        valid_votes_mask[user_idx] = False
        
        # Calculate user-based prediction
        if np.any(valid_votes_mask):
            relevant_similarities = similarities[valid_votes_mask]
            relevant_votes = statement_votes[valid_votes_mask]
            weighted_votes = relevant_similarities * relevant_votes
            abs_sum = np.sum(np.abs(relevant_similarities))
            user_pred = np.sum(weighted_votes) / (abs_sum + 1e-10) if abs_sum > 0 else 0.0
        else:
            user_pred = 0.0
        
        # Get statement-based prediction
        statement_pred = user_vote_patterns[user_idx]
        
        # Combine predictions
        imputed_value = w_user * user_pred + w_statement * statement_pred
        return user_idx, statement_idx, np.clip(imputed_value, -0.99, 0.99)
    
    # Pre-allocate output matrix
    imputed_matrix = matrix_values.copy()
    
    # Process missing values in parallel
    n_jobs = min(multiprocessing.cpu_count(), 8)  # Cap at 8 cores
    missing_coords = list(zip(*missing_indices))
    
    if len(missing_coords) > 100:  # Only parallelize for larger datasets
        results = Parallel(n_jobs=n_jobs)(
            delayed(process_missing_value)(user_idx, statement_idx)
            for user_idx, statement_idx in missing_coords
        )
        
        # Update matrix with results
        for user_idx, statement_idx, value in results:
            imputed_matrix[user_idx, statement_idx] = value
    else:
        # Use original sequential processing for small datasets
        for user_idx, statement_idx in missing_coords:
            _, _, value = process_missing_value(user_idx, statement_idx)
            imputed_matrix[user_idx, statement_idx] = value
    
    return pd.DataFrame(imputed_matrix, index=vote_matrix.index, columns=vote_matrix.columns)

def generate_test_matrix(n_users: int, n_statements: int, missing_ratio: float = 0.3) -> pd.DataFrame:
    """Generate a test vote matrix with specified dimensions and missing ratio"""
    # Generate random votes (-1, 0, 1)
    matrix = np.random.choice([-1, 0, 1], size=(n_users, n_statements))
    
    # Create random mask for missing values
    mask = np.random.random(size=(n_users, n_statements)) < missing_ratio
    matrix = matrix.astype(float)
    matrix[mask] = np.nan
    
    # Convert to DataFrame
    return pd.DataFrame(
        matrix,
        index=[f'user_{i}' for i in range(n_users)],
        columns=[f'statement_{i}' for i in range(n_statements)]
    )

def time_algorithm(algo: Callable, matrix: pd.DataFrame, n_runs: int = 3) -> Dict:
    """Time an algorithm's execution with multiple runs"""
    times = []
    for _ in range(n_runs):
        start = time.perf_counter()
        _ = algo(matrix)
        end = time.perf_counter()
        times.append(end - start)
    
    return {
        'min': min(times),
        'max': max(times),
        'avg': sum(times) / len(times)
    }

def format_time(seconds: float) -> str:
    """Format time in seconds to appropriate units"""
    if seconds < 0.001:
        return f"{seconds*1000000:.2f}µs"
    elif seconds < 1:
        return f"{seconds*1000:.2f}ms"
    else:
        return f"{seconds:.2f}s"

def run_benchmarks():
    # Silence the update_gac_scores logger during benchmarking
    with silence_logger('api.update_gac_scores'):  # Changed from '__main__' to 'api.update_gac_scores'
        # Test scenarios
        scenarios = [
            (10, 5),     # Very small
            (20, 10),    # Small
            (50, 25),    # Medium
            (100, 50),   # Large
            (200, 100),  # Very large
            (500, 250),  # Even larger
        ]
        
        results = []
        
        print("\nRunning benchmarks...\n")
        
        for n_users, n_statements in scenarios:
            print(f"Testing {n_users} users × {n_statements} statements...")
            
            # Generate test matrix
            matrix = generate_test_matrix(n_users, n_statements)
            
            # Time both algorithms
            cosine_times = time_algorithm(
                lambda m: cosine_impute(m, min(5, n_users-1)), 
                matrix
            )
            sds_times = time_algorithm(sds_impute, matrix)
            
            # Store results
            results.append({
                'Size': f"{n_users}×{n_statements}",
                'Cosine Min': format_time(cosine_times['min']),
                'Cosine Avg': format_time(cosine_times['avg']),
                'Cosine Max': format_time(cosine_times['max']),
                'SDS Min': format_time(sds_times['min']),
                'SDS Avg': format_time(sds_times['avg']),
                'SDS Max': format_time(sds_times['max'])
            })
        
        # Print results table
        print("\nBenchmark Results:")
        print(tabulate(
            results,
            headers='keys',
            tablefmt='grid',
            numalign='right'
        ))

if __name__ == "__main__":
    run_benchmarks() 