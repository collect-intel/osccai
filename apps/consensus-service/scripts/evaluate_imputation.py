import sys
import logging

def setup_logging(verbose):
    """Configure logging based on verbosity"""
    # Configure root logger to control all loggers including imported modules
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO if verbose else logging.WARNING)
    
    # Clear any existing handlers
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
    
    formatter = logging.Formatter('[%(levelname)s] %(message)s')
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)
    
    # Get logger for this module
    logger = logging.getLogger(__name__)
    return logger

# Set up logging with default settings before any imports
logger = setup_logging(False)

import pandas as pd
import numpy as np
from pathlib import Path
from scipy.sparse import csr_matrix
from datetime import datetime
import json
from tqdm import tqdm

# Add the parent directory to Python path to import from api
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))

def calculate_cosine_similarity(matrix):
    """
    Calculate pairwise cosine similarities between participants.
    Includes uncertainty scaling based on number of common votes.
    """
    # Get participation mask
    valid_votes_mask = ~np.isnan(matrix.values)
    
    # Replace nans with 0 for computation
    vote_matrix_filled = np.nan_to_num(matrix.values, nan=0, copy=True)
    
    # Calculate vote similarity
    norms = np.linalg.norm(vote_matrix_filled, axis=1)
    norms[norms == 0] = 1
    vote_matrix_normalized = vote_matrix_filled / norms[:, np.newaxis]
    vote_similarities = np.dot(vote_matrix_normalized, vote_matrix_normalized.T)
    
    # Calculate number of common votes
    n_common_votes = valid_votes_mask @ valid_votes_mask.T
    
    # Scale similarities by uncertainty factor
    uncertainty_factor = 1 - (1 / (1 + n_common_votes))
    similarities = vote_similarities * uncertainty_factor
    
    return pd.DataFrame(similarities, index=matrix.index, columns=matrix.index)

def impute_missing_votes(vote_matrix):
    """
    Impute missing votes with adaptive neighbor selection using cosine similarity.
    Works for all group sizes.
    """
    n_participants = len(vote_matrix)
    logger.debug(f"Imputing missing votes for {n_participants} participants")
    
    # Adaptive number of neighbors - for small groups, use n-1 neighbors
    n_neighbors = min(n_participants - 1, max(2, int(np.log2(n_participants))))
    logger.debug(f"Using {n_neighbors} neighbors for imputation")
    
    try:
        imputed = cosine_impute(vote_matrix, n_neighbors)
        logger.debug("Successfully imputed missing votes")
        return imputed
    except Exception as e:
        logger.error(f"Imputation failed: {e}")
        logger.debug("Falling back to simple imputation")
        return vote_matrix.fillna(0)

def load_vote_data(csv_path, sample_size=None, random_state=42):
    """
    Load and process vote data efficiently from CSV.
    Returns sparse matrix and mappings for participants and statements.
    """
    # Read CSV in chunks if sample_size is None (full dataset)
    if sample_size is None:
        df = pd.read_csv(csv_path)
    else:
        # Read the CSV in chunks and sample
        chunk_size = min(100000, sample_size * 2)  # Adjust chunk size based on sample
        chunks = []
        total_rows = 0
        
        for chunk in pd.read_csv(csv_path, chunksize=chunk_size):
            if total_rows < sample_size:
                chunks.append(chunk)
                total_rows += len(chunk)
            else:
                break
        
        df = pd.concat(chunks)
        if len(df) > sample_size:
            df = df.sample(n=sample_size, random_state=random_state)

    # Create mappings for participants and statements
    participant_map = {pid: idx for idx, pid in enumerate(df['participant_id'].unique())}
    statement_map = {sid: idx for idx, sid in enumerate(df['statement_id'].unique())}
    
    # Convert vote values to numeric
    vote_map = {'AGREE': 1, 'DISAGREE': -1, 'PASS': 0}
    df['numeric_vote'] = df['vote_value'].map(vote_map)
    
    # Create sparse matrix
    rows = [participant_map[pid] for pid in df['participant_id']]
    cols = [statement_map[sid] for sid in df['statement_id']]
    data = df['numeric_vote'].fillna(np.nan)
    
    matrix = csr_matrix(
        (data, (rows, cols)),
        shape=(len(participant_map), len(statement_map))
    )
    
    return matrix.toarray(), participant_map, statement_map

def create_test_splits(vote_matrix, test_ratio=0.2, random_state=42):
    """
    Create train/test splits from the vote matrix.
    Returns training matrix (with masked values) and test indices.
    """
    rng = np.random.RandomState(random_state)
    
    # Find indices of non-null values
    non_null_indices = np.where(~np.isnan(vote_matrix))
    n_non_null = len(non_null_indices[0])
    
    # Randomly select indices for test set
    test_size = int(n_non_null * test_ratio)
    test_idx = rng.choice(n_non_null, test_size, replace=False)
    
    # Create masked matrix for training
    train_matrix = vote_matrix.copy()
    test_rows = non_null_indices[0][test_idx]
    test_cols = non_null_indices[1][test_idx]
    
    # Store true values and mask them in training data
    true_values = train_matrix[test_rows, test_cols]
    train_matrix[test_rows, test_cols] = np.nan
    
    return train_matrix, (test_rows, test_cols, true_values)

def evaluate_imputation(imputed_values, true_values):
    """
    Evaluate imputation quality using multiple metrics.
    """
    # Convert true values to classification targets
    true_classes = np.where(true_values > 0, 'AGREE',
                           np.where(true_values < 0, 'DISAGREE', 'PASS'))
    
    # Convert imputed values to predicted classes using different thresholds
    strict_pred = np.where(imputed_values > 0.5, 'AGREE',
                          np.where(imputed_values < -0.5, 'DISAGREE', 'PASS'))
    loose_pred = np.where(imputed_values > 0, 'AGREE',
                         np.where(imputed_values < 0, 'DISAGREE', 'PASS'))
    
    # Calculate various metrics
    metrics = {
        'strict_accuracy': np.mean(strict_pred == true_classes),
        'loose_accuracy': np.mean(loose_pred == true_classes),
        'rmse': np.sqrt(np.mean((imputed_values - true_values) ** 2)),
        'directional_accuracy': np.mean(np.sign(imputed_values) == np.sign(true_values)),
    }
    
    # Calculate weighted accuracy (confidence-based)
    confidence_scores = np.abs(imputed_values)
    correct_predictions = (np.sign(imputed_values) == np.sign(true_values))
    metrics['weighted_accuracy'] = np.mean(confidence_scores * correct_predictions)
    
    # Calculate confusion matrices for both strict and loose predictions
    def get_confusion_stats(pred_classes):
        confusion = {
            'agree': {'correct': 0, 'total': 0},
            'disagree': {'correct': 0, 'total': 0},
            'pass': {'correct': 0, 'total': 0}
        }
        
        for true, pred in zip(true_classes, pred_classes):
            if true == 'AGREE':
                confusion['agree']['total'] += 1
                if pred == true:
                    confusion['agree']['correct'] += 1
            elif true == 'DISAGREE':
                confusion['disagree']['total'] += 1
                if pred == true:
                    confusion['disagree']['correct'] += 1
            else:
                confusion['pass']['total'] += 1
                if pred == true:
                    confusion['pass']['correct'] += 1
        
        return confusion
    
    metrics['strict_confusion'] = get_confusion_stats(strict_pred)
    metrics['loose_confusion'] = get_confusion_stats(loose_pred)
    
    return metrics

def cosine_impute(vote_matrix, n_neighbors):
    """
    Impute missing votes using cosine similarity between participants.
    Uses both similar and opposite voting patterns as signals.
    """
    similarity_matrix = calculate_cosine_similarity(vote_matrix)
    logger.debug(f"Similarity matrix:\n{similarity_matrix}")
    
    imputed_matrix = vote_matrix.copy()
    missing_count = vote_matrix.isna().sum().sum()
    
    with tqdm(total=missing_count, desc="Imputing values", disable=not logger.isEnabledFor(logging.INFO)) as pbar:
        for participant in vote_matrix.index:
            missing_statements = vote_matrix.columns[vote_matrix.loc[participant].isna()]
            
            if len(missing_statements) == 0:
                continue
                
            correlations = similarity_matrix[participant].drop(participant)
            strongest_correlations = correlations[correlations.abs().nlargest(n_neighbors).index]
            logger.debug(f"\nFor {participant}:")
            logger.debug(f"Strongest correlations:\n{strongest_correlations}")
            
            for statement in missing_statements:
                similar_votes = vote_matrix.loc[strongest_correlations.index, statement].dropna()
                
                if not similar_votes.empty:
                    # For each correlated participant, use their vote but flip it if correlation is negative
                    adjusted_votes = similar_votes * np.sign(strongest_correlations[similar_votes.index])
                    weights = strongest_correlations[similar_votes.index].abs()
                    
                    if weights.sum() > 0:
                        # Calculate weighted vote without additional confidence scaling
                        imputed_matrix.at[participant, statement] = np.average(adjusted_votes, weights=weights)
                    else:
                        logger.debug("No similar votes - defaulting to 0")
                        imputed_matrix.at[participant, statement] = 0
                else:
                    logger.debug("No similar votes - defaulting to 0")
                    imputed_matrix.at[participant, statement] = 0
                pbar.update(1)
    
    return imputed_matrix

def get_matrix_stats(matrix):
    """Calculate statistics about the vote matrix"""
    total_cells = matrix.size
    non_null_cells = np.count_nonzero(~np.isnan(matrix))
    sparsity = 1 - (non_null_cells / total_cells)
    
    votes_per_participant = (~np.isnan(matrix)).sum(axis=1)
    votes_per_statement = (~np.isnan(matrix)).sum(axis=0)
    
    return {
        'matrix_shape': matrix.shape,
        'total_cells': total_cells,
        'filled_cells': non_null_cells,
        'sparsity': sparsity,
        'votes_per_participant': {
            'mean': float(votes_per_participant.mean()),
            'median': float(np.median(votes_per_participant)),
            'min': int(votes_per_participant.min()),
            'max': int(votes_per_participant.max())
        },
        'votes_per_statement': {
            'mean': float(votes_per_statement.mean()),
            'median': float(np.median(votes_per_statement)),
            'min': int(votes_per_statement.min()),
            'max': int(votes_per_statement.max())
        }
    }

def main(csv_path, sample_size=None, test_ratio=0.2, random_state=42, verbose=False):
    """
    Main function to evaluate imputation quality.
    """
    global logger
    logger = setup_logging(verbose)
    
    # Set random seeds for all sources of randomness
    np.random.seed(random_state)
    
    start_time = datetime.now()
    logger.info(f"Starting imputation evaluation at {start_time}")
    
    with tqdm(total=4, desc="Overall progress", disable=not logger.isEnabledFor(logging.WARNING)) as pbar:
        logger.info(f"Loading data from {csv_path}")
        # Load and prepare data
        vote_matrix, participant_map, statement_map = load_vote_data(
            csv_path, sample_size, random_state
        )
        matrix_stats = get_matrix_stats(vote_matrix)
        pbar.update(1)
        
        logger.info(f"Loaded vote matrix with shape {vote_matrix.shape}")
        logger.info(f"Creating test splits with {test_ratio:.0%} test ratio")
        
        # Create train/test splits
        train_matrix, (test_rows, test_cols, true_values) = create_test_splits(
            vote_matrix, test_ratio, random_state
        )
        pbar.update(1)
        
        # Convert to pandas DataFrame for imputation
        train_df = pd.DataFrame(
            train_matrix,
            index=list(participant_map.keys()),
            columns=list(statement_map.keys())
        )
        
        logger.info("Running imputation")
        imputed_df = impute_missing_votes(train_df)
        pbar.update(1)
        
        # Extract imputed values for test indices
        imputed_values = imputed_df.values[test_rows, test_cols]
        
        # Evaluate results
        logger.info("Evaluating imputation results")
        metrics = evaluate_imputation(imputed_values, true_values)
        pbar.update(1)
    
    # Log results
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    results = {
        'metadata': {
            'sample_size': sample_size or 'full',
            'test_ratio': test_ratio,
            'random_state': random_state,
            'duration_seconds': duration,
            'matrix_stats': matrix_stats
        },
        'metrics': metrics
    }
    
    # Save results
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = output_dir / f'imputation_results_{timestamp}.json'
    
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to {output_file}")
    print("\nMatrix Statistics:")
    print(f"Shape: {matrix_stats['matrix_shape']} ({matrix_stats['total_cells']} cells)")
    print(f"Sparsity: {matrix_stats['sparsity']:.3%} ({matrix_stats['filled_cells']} filled cells)")
    print("\nVotes per Participant:")
    print(f"    Mean: {matrix_stats['votes_per_participant']['mean']:.1f}")
    print(f"    Median: {matrix_stats['votes_per_participant']['median']:.1f}")
    print(f"    Range: {matrix_stats['votes_per_participant']['min']} - {matrix_stats['votes_per_participant']['max']}")
    print("\nVotes per Statement:")
    print(f"    Mean: {matrix_stats['votes_per_statement']['mean']:.1f}")
    print(f"    Median: {matrix_stats['votes_per_statement']['median']:.1f}")
    print(f"    Range: {matrix_stats['votes_per_statement']['min']} - {matrix_stats['votes_per_statement']['max']}")
    
    print("\nKey metrics:")
    print(f"Strict Accuracy: {metrics['strict_accuracy']:.3f}")
    print("    (% correct using thresholds of ±0.5 to classify AGREE/DISAGREE/PASS)")
    print(f"Loose Accuracy: {metrics['loose_accuracy']:.3f}")
    print("    (% correct using just the sign of imputed value to classify)")
    print(f"Weighted Accuracy: {metrics['weighted_accuracy']:.3f}")
    print("    (accuracy weighted by confidence of predictions)")
    print(f"RMSE: {metrics['rmse']:.3f}")
    print("    (Root Mean Square Error: lower values = better predictions)")
    print(f"Directional Accuracy: {metrics['directional_accuracy']:.3f}")
    print("    (% of times we correctly predict AGREE vs DISAGREE, ignoring PASS)")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Evaluate vote imputation quality')
    parser.add_argument('csv_path', help='Path to the votes CSV file')
    parser.add_argument('--sample-size', type=int, help='Number of rows to sample (default: use all)')
    parser.add_argument('--test-ratio', type=float, default=0.2, help='Ratio of data to use for testing')
    parser.add_argument('--random-state', type=int, default=42, help='Random seed for reproducibility')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed progress logs')
    
    args = parser.parse_args()
    main(args.csv_path, args.sample_size, args.test_ratio, args.random_state, args.verbose) 