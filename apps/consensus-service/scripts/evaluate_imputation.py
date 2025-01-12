import sys
import logging
from pathlib import Path

# Add the parent directory to Python path to import from api
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))

import contextlib
from api.update_gac_scores import (
    impute_missing_votes,
    generate_vote_matrix,
    setup_logging as gac_setup_logging
)

@contextlib.contextmanager
def suppress_gac_logging():
    """Temporarily suppress logging from update_gac_scores"""
    logger = gac_setup_logging()
    original_level = logger.level
    logger.setLevel(logging.ERROR)
    try:
        yield
    finally:
        logger.setLevel(original_level)

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

# Set up logging with default settings
logger = setup_logging(False)

import pandas as pd
import numpy as np
from datetime import datetime
import json
from tqdm import tqdm


def load_vote_data(csv_path, sample_size=None, random_state=42):
    """Load vote data and convert to format expected by update_gac_scores"""
    df = pd.read_csv(csv_path)
    if sample_size:
        df = df.sample(n=sample_size, random_state=random_state)
    
    # Convert to format expected by generate_vote_matrix
    votes = [
        {
            'statementId': row['statement_id'],
            'participantId': row['participant_id'],
            'voteValue': row['vote_value'],
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        for _, row in df.iterrows()
    ]
    
    # Get unique participants and statements with required fields
    participants = [
        {
            'uid': pid,
            'createdAt': datetime.now().isoformat()
        } 
        for pid in df['participant_id'].unique()
    ]
    
    statements = [
        {
            'uid': sid,
            'pollId': 'dummy_poll_id',  # Add required field
            'createdAt': datetime.now().isoformat()
        } 
        for sid in df['statement_id'].unique()
    ]
    
    return participants, statements, votes

def create_test_splits(vote_matrix, test_ratio=0.2, random_state=42):
    """Create train/test splits from the vote matrix"""
    rng = np.random.RandomState(random_state)
    
    # Find indices of non-null values
    non_null_mask = ~vote_matrix.isna()
    non_null_indices = np.where(non_null_mask)
    n_non_null = len(non_null_indices[0])
    
    # Randomly select indices for test set
    test_size = int(n_non_null * test_ratio)
    test_idx = rng.choice(n_non_null, test_size, replace=False)
    
    # Create masked matrix for training
    train_matrix = vote_matrix.copy()
    test_rows = non_null_indices[0][test_idx]
    test_cols = non_null_indices[1][test_idx]
    
    # Get row and column labels
    row_labels = train_matrix.index[test_rows]
    col_labels = train_matrix.columns[test_cols]
    
    # Store true values and mask them in training data
    true_values = np.array([train_matrix.loc[row, col] 
                           for row, col in zip(row_labels, col_labels)])
    
    # Mask values in training data
    for row, col in zip(row_labels, col_labels):
        train_matrix.loc[row, col] = np.nan
    
    return train_matrix, (test_rows, test_cols, true_values)

def evaluate_imputation(imputed_values, true_values):
    """
    Evaluate imputation quality with separate metrics for each vote type.
    """
    # Convert values to classifications
    true_classes = np.where(true_values > 0, 'AGREE',
                           np.where(true_values < 0, 'DISAGREE', 'PASS'))
    
    strict_pred = np.where(imputed_values > 0.5, 'AGREE',
                          np.where(imputed_values < -0.5, 'DISAGREE', 'PASS'))
    
    # Calculate metrics per class
    metrics = {
        'agree': {
            'correct': 0,
            'total': 0,
            'false_positives': 0
        },
        'disagree': {
            'correct': 0,
            'total': 0,
            'false_positives': 0
        },
        'pass': {
            'correct': 0,
            'total': 0,
            'false_positives': 0
        }
    }
    
    # Calculate detailed metrics
    for true, pred in zip(true_classes, strict_pred):
        # Count totals
        metrics[true.lower()]['total'] += 1
        
        # Count correct predictions
        if true == pred:
            metrics[true.lower()]['correct'] += 1
        
        # Count false positives
        if true != pred and pred != 'PASS':
            metrics[pred.lower()]['false_positives'] += 1
    
    # Calculate accuracies and precisions
    for vote_type in ['agree', 'disagree', 'pass']:
        total = metrics[vote_type]['total']
        correct = metrics[vote_type]['correct']
        false_pos = metrics[vote_type]['false_positives']
        
        metrics[vote_type]['accuracy'] = correct / total if total > 0 else 0
        metrics[vote_type]['precision'] = (
            correct / (correct + false_pos) if (correct + false_pos) > 0 else 0
        )
    
    # Add overall metrics
    metrics['rmse'] = np.sqrt(np.mean((imputed_values - true_values) ** 2))
    metrics['overall_accuracy'] = np.mean(strict_pred == true_classes)
    
    return metrics



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

def print_results(metrics, matrix_stats):
    """Print detailed evaluation results with emphasis on per-class performance"""
    print("\nMatrix Statistics:")
    print(f"Shape: {matrix_stats['matrix_shape']}")
    print(f"Sparsity: {matrix_stats['sparsity']:.2%}")
    
    print("\nVotes per Participant:")
    print(f"    Mean: {matrix_stats['votes_per_participant']['mean']:.1f}")
    print(f"    Median: {matrix_stats['votes_per_participant']['median']:.1f}")
    print(f"    Range: {matrix_stats['votes_per_participant']['min']} - {matrix_stats['votes_per_participant']['max']}")
    
    print("\nPer-Class Performance:")
    for vote_type in ['agree', 'disagree', 'pass']:
        total = metrics[vote_type]['total']
        correct = metrics[vote_type]['correct']
        accuracy = metrics[vote_type]['accuracy']
        precision = metrics[vote_type]['precision']
        false_pos = metrics[vote_type]['false_positives']
        
        print(f"\n{vote_type.upper()}:")
        print(f"    Accuracy: {accuracy:.3f} ({correct}/{total} correct)")
        print(f"    Precision: {precision:.3f}")
        print(f"    False Positives: {false_pos}")
    
    print(f"\nOverall RMSE: {metrics['rmse']:.3f}")

def main(csv_path, sample_size=None, test_ratio=0.2, random_state=42, verbose=False):
    """Main function to evaluate imputation quality."""
    global logger
    logger = setup_logging(verbose)
    
    # Set random seeds for all sources of randomness
    np.random.seed(random_state)
    
    start_time = datetime.now()
    logger.info(f"Starting imputation evaluation at {start_time}")
    
    with tqdm(total=4, desc="Overall progress", disable=not logger.isEnabledFor(logging.WARNING)) as pbar:
        logger.info(f"Loading data from {csv_path}")
        # Load and prepare data
        participants, statements, votes = load_vote_data(csv_path, sample_size, random_state)
        
        # Generate initial vote matrix using update_gac_scores function
        with suppress_gac_logging():
            vote_matrix = generate_vote_matrix(statements, votes, participants)
        
        matrix_stats = get_matrix_stats(vote_matrix)
        pbar.update(1)
        
        logger.info(f"Creating test splits with {test_ratio:.0%} test ratio")
        train_matrix, (test_rows, test_cols, true_values) = create_test_splits(
            vote_matrix, test_ratio, random_state
        )
        pbar.update(1)
        
        logger.info("Running imputation")
        # Run imputation using update_gac_scores function
        with suppress_gac_logging():
            imputed_matrix = impute_missing_votes(train_matrix)
        pbar.update(1)
        
        # Extract imputed values for test indices
        imputed_values = np.array([imputed_matrix.iloc[row, col] 
                                 for row, col in zip(test_rows, test_cols)])
        
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
    print_results(metrics, matrix_stats)


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