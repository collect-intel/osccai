import sys
import logging
from pathlib import Path
import contextlib
import numpy as np
import pandas as pd
from datetime import datetime
import json
from tqdm import tqdm
from itertools import combinations

# Add the parent directory to Python path to import from api
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))

from api.update_gac_scores import (
    impute_missing_votes,
    generate_vote_matrix,
    setup_logging as gac_setup_logging
)

# Keep the existing logging suppression
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
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO if verbose else logging.WARNING)
    
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
    
    formatter = logging.Formatter('[%(levelname)s] %(message)s')
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)
    
    return logging.getLogger(__name__)

logger = setup_logging(False)

def load_vote_data(csv_path, min_votes=3):
    """Load vote data and identify qualified participants"""
    df = pd.read_csv(csv_path)
    
    # First identify participants with sufficient votes
    vote_counts = df.groupby('participant_id').size()
    qualified_participants = vote_counts[vote_counts >= min_votes].index
    
    # Filter to only include votes from qualified participants
    df_qualified = df[df['participant_id'].isin(qualified_participants)]
    
    # Convert to format expected by generate_vote_matrix
    votes = [
        {
            'statementId': row['statement_id'],
            'participantId': row['participant_id'],
            'voteValue': row['vote_value'],
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        for _, row in df_qualified.iterrows()
    ]
    
    participants = [
        {'uid': pid, 'createdAt': datetime.now().isoformat()}
        for pid in qualified_participants
    ]
    
    statements = [
        {
            'uid': sid,
            'pollId': 'dummy_poll_id',
            'createdAt': datetime.now().isoformat()
        } 
        for sid in df_qualified['statement_id'].unique()
    ]
    
    return df_qualified, participants, statements, votes, qualified_participants

def get_participant_vote_counts(df):
    """Get vote counts per participant, sorted by count"""
    return df.groupby('participant_id').size().sort_values(ascending=False)

def evaluate_participant_imputation(participant_id, df, vote_matrix, k_values=[1, 2, 3]):
    """
    Evaluate imputation for a single participant using leave-k-out cross validation
    """
    participant_votes = df[df['participant_id'] == participant_id]
    n_votes = len(participant_votes)
    results = []
    
    for k in k_values:
        if k >= n_votes:
            continue
            
        # Generate all possible combinations of k votes to mask
        from itertools import combinations
        vote_indices = range(n_votes)
        for mask_indices in combinations(vote_indices, k):
            # Create a copy of the vote matrix
            test_matrix = vote_matrix.copy()
            
            # Get the votes to mask
            masked_votes = participant_votes.iloc[list(mask_indices)]
            
            # Mask the selected votes
            for _, vote in masked_votes.iterrows():
                test_matrix.loc[vote['participant_id'], vote['statement_id']] = np.nan
            
            # Run imputation
            with suppress_gac_logging():
                imputed_matrix = impute_missing_votes(test_matrix)
            
            # Compare results
            for _, vote in masked_votes.iterrows():
                true_value = 1.0 if vote['vote_value'] == 'AGREE' else (-1.0 if vote['vote_value'] == 'DISAGREE' else 0.0)
                imputed_value = imputed_matrix.loc[vote['participant_id'], vote['statement_id']]
                
                results.append({
                    'participant_id': participant_id,
                    'statement_id': vote['statement_id'],
                    'k_value': k,
                    'n_available_votes': n_votes - k,
                    'true_value': true_value,
                    'imputed_value': imputed_value,
                    'confidence': abs(imputed_value),
                    'correct_sign': (true_value * imputed_value) > 0 if true_value != 0 else abs(imputed_value) < 0.3
                })
    
    return results

def evaluate_imputation_quality(df, participants, statements, votes, sample_size=None, max_k=3, random_state=42):
    """
    Evaluate imputation quality using leave-k-out cross validation.
    """
    np.random.seed(random_state)
    
    # Get all qualified participants and their vote counts
    print("Preparing participant data...")
    participant_votes = df.groupby('participant_id')
    all_participants = list(participant_votes.groups.keys())
    
    # Pre-process data for faster access
    print("Pre-processing data structures...")
    statement_map = {sid: i for i, sid in enumerate(df['statement_id'].unique())}
    participant_map = {pid: i for i, pid in enumerate(all_participants)}
    
    # Pre-calculate participant vote data
    participant_data = {}
    print("Caching participant vote data...")
    for pid in tqdm(all_participants, desc="Processing participants"):
        p_votes = df[df['participant_id'] == pid]
        participant_data[pid] = {
            'votes': p_votes,
            'statement_ids': p_votes['statement_id'].unique(),
            'n_votes': len(p_votes)
        }
    
    all_results = []
    n_scenarios = sample_size or len(all_participants)
    
    # Evaluate scenarios with better progress tracking
    print("\nEvaluating imputation scenarios...")
    with tqdm(total=n_scenarios, desc="Progress", unit="scenarios", mininterval=1.0) as pbar:
        scenario_count = 0
        last_time = datetime.now()
        
        while scenario_count < n_scenarios:
            try:
                current_time = datetime.now()
                if (current_time - last_time).total_seconds() >= 5:
                    print(f"\nProcessing scenario {scenario_count + 1}/{n_scenarios}")
                    last_time = current_time
                
                # Randomly select a participant
                participant_id = np.random.choice(all_participants)
                p_data = participant_data[participant_id]
                
                if p_data['n_votes'] < 2:  # Skip if not enough votes to mask
                    continue
                
                # Randomly select k (number of votes to mask)
                k = np.random.randint(1, min(max_k + 1, p_data['n_votes']))
                
                print(f"Processing participant {participant_id} with {p_data['n_votes']} votes, masking {k} votes")
                
                # Randomly select k votes to mask
                mask_indices = np.random.choice(range(p_data['n_votes']), size=k, replace=False)
                masked_votes = p_data['votes'].iloc[mask_indices]
                
                # Get relevant votes for this participant's statements
                relevant_df = df[df['statement_id'].isin(p_data['statement_ids'])]
                print(f"Found {len(relevant_df)} relevant votes for {len(p_data['statement_ids'])} statements")
                
                # Create focused vote data
                focused_votes = [
                    {
                        'statementId': row['statement_id'],
                        'participantId': row['participant_id'],
                        'voteValue': row['vote_value'],
                        'createdAt': datetime.now().isoformat(),
                        'updatedAt': datetime.now().isoformat()
                    }
                    for _, row in relevant_df.iterrows()
                ]
                
                focused_statements = [
                    {'uid': sid, 'pollId': 'dummy_poll_id', 'createdAt': datetime.now().isoformat()}
                    for sid in p_data['statement_ids']
                ]
                
                print("Running imputation...")
                # Generate focused vote matrix and run imputation
                with suppress_gac_logging():
                    test_matrix = generate_vote_matrix(focused_statements, focused_votes, participants)
                    print(f"Generated test matrix of shape {test_matrix.shape}")
                    
                    # Mask the selected votes
                    for _, vote in masked_votes.iterrows():
                        test_matrix.loc[vote['participant_id'], vote['statement_id']] = np.nan
                    
                    imputed_matrix = impute_missing_votes(test_matrix)
                
                # Compare results
                for _, vote in masked_votes.iterrows():
                    true_value = 1.0 if vote['vote_value'] == 'AGREE' else (-1.0 if vote['vote_value'] == 'DISAGREE' else 0.0)
                    imputed_value = imputed_matrix.loc[vote['participant_id'], vote['statement_id']]
                    
                    all_results.append({
                        'participant_id': participant_id,
                        'statement_id': vote['statement_id'],
                        'k_value': k,
                        'n_available_votes': p_data['n_votes'] - k,
                        'true_value': true_value,
                        'imputed_value': imputed_value,
                        'confidence': abs(imputed_value),
                        'correct_sign': (true_value * imputed_value) > 0 if true_value != 0 else abs(imputed_value) < 0.3
                    })
                
                scenario_count += 1
                pbar.update(1)
                
            except Exception as e:
                print(f"\nError processing scenario: {str(e)}")
                print(f"Continuing with next scenario...")
                continue
    
    return all_results, None

def calculate_metrics(results):
    """Calculate detailed metrics from evaluation results"""
    # Convert results to DataFrame and ensure native Python types
    df_results = pd.DataFrame(results)
    
    metrics = {
        'overall': {
            'total_predictions': int(len(results)),  # Convert to native int
            'correct_predictions': int(sum(r['correct_sign'] for r in results)),
            'mean_confidence': float(np.mean([r['confidence'] for r in results])),  # Convert to native float
            'rmse': float(np.sqrt(np.mean([(r['true_value'] - r['imputed_value'])**2 for r in results])))
        }
    }
    
    # Stratify by number of available votes
    vote_strata = df_results.groupby('n_available_votes')
    for n_votes, stratum in vote_strata:
        metrics[f'votes_{int(n_votes)}'] = {  # Convert key to native int
            'total_predictions': int(len(stratum)),
            'accuracy': float(np.mean(stratum['correct_sign'])),
            'mean_confidence': float(np.mean(stratum['confidence'])),
            'rmse': float(np.sqrt(np.mean((stratum['true_value'] - stratum['imputed_value'])**2)))
        }
    
    # Stratify by k value
    k_strata = df_results.groupby('k_value')
    for k, stratum in k_strata:
        metrics[f'k_{int(k)}'] = {  # Convert key to native int
            'total_predictions': int(len(stratum)),
            'accuracy': float(np.mean(stratum['correct_sign'])),
            'mean_confidence': float(np.mean(stratum['confidence'])),
            'rmse': float(np.sqrt(np.mean((stratum['true_value'] - stratum['imputed_value'])**2)))
        }
    
    # Confidence level analysis
    confidence_levels = [(0.6, 'high'), (0.3, 'medium'), (0.0, 'low')]
    
    for threshold, level in confidence_levels:
        mask = df_results['confidence'] >= threshold
        if sum(mask) > 0:
            metrics[f'confidence_{level}'] = {
                'total_predictions': int(sum(mask)),
                'accuracy': float(np.mean(df_results[mask]['correct_sign'])),
                'mean_confidence': float(np.mean(df_results[mask]['confidence']))
            }
    
    return metrics

def print_results(metrics, matrix_stats):
    """Print detailed evaluation results"""
    print("\nMatrix Statistics:")
    print(f"Shape: {matrix_stats['matrix_shape']}")
    print(f"Sparsity: {matrix_stats['sparsity']:.2%}")
    
    print("\nOverall Performance:")
    print(f"Total Predictions: {metrics['overall']['total_predictions']}")
    print(f"Accuracy: {metrics['overall']['correct_predictions'] / metrics['overall']['total_predictions']:.3f}")
    print(f"Mean Confidence: {metrics['overall']['mean_confidence']:.3f}")
    print(f"RMSE: {metrics['overall']['rmse']:.3f}")
    
    print("\nPerformance by Available Votes:")
    for key in sorted([k for k in metrics.keys() if k.startswith('votes_')]):
        n_votes = key.split('_')[1]
        print(f"\n{n_votes} votes:")
        print(f"    Predictions: {metrics[key]['total_predictions']}")
        print(f"    Accuracy: {metrics[key]['accuracy']:.3f}")
        print(f"    Mean Confidence: {metrics[key]['mean_confidence']:.3f}")
        print(f"    RMSE: {metrics[key]['rmse']:.3f}")
    
    print("\nPerformance by k-value:")
    for key in sorted([k for k in metrics.keys() if k.startswith('k_')]):
        k = key.split('_')[1]
        print(f"\nk={k}:")
        print(f"    Predictions: {metrics[key]['total_predictions']}")
        print(f"    Accuracy: {metrics[key]['accuracy']:.3f}")
        print(f"    Mean Confidence: {metrics[key]['mean_confidence']:.3f}")
        print(f"    RMSE: {metrics[key]['rmse']:.3f}")
    
    print("\nConfidence Level Analysis:")
    for level in ['high', 'medium', 'low']:
        key = f'confidence_{level}'
        if key in metrics:
            print(f"\n{level.title()}:")
            print(f"    Predictions: {metrics[key]['total_predictions']}")
            print(f"    Accuracy: {metrics[key]['accuracy']:.3f}")
            print(f"    Mean Confidence: {metrics[key]['mean_confidence']:.3f}")

def main(csv_path, sample_size=None, min_votes=3, max_k=3, random_state=42, verbose=False):
    """Main function to evaluate imputation quality"""
    global logger
    logger = setup_logging(verbose)
    
    # Load and prepare data
    df, participants, statements, votes, qualified_participants = load_vote_data(csv_path, min_votes)
    
    # Print initial stats
    print(f"\nFound {len(qualified_participants)} participants with {min_votes}+ votes")
    print(f"Total qualified votes: {len(df)}")
    
    # Calculate total possible scenarios
    total_scenarios = 0
    vote_counts = df.groupby('participant_id').size()
    for participant_votes in vote_counts[vote_counts >= min_votes]:
        for k in range(1, min(max_k + 1, participant_votes)):
            total_scenarios += len(list(combinations(range(participant_votes), k)))
    
    print(f"Total possible imputation scenarios: {total_scenarios}")
    
    if sample_size:
        print(f"Will evaluate {min(sample_size, total_scenarios)} random scenarios")
    
    start_time = datetime.now()
    
    # Run evaluation
    results, _ = evaluate_imputation_quality(
        df, participants, statements, votes, sample_size, max_k, random_state
    )
    
    # Calculate metrics
    metrics = calculate_metrics(results)
    
    # Calculate matrix stats from the original data
    total_possible_votes = len(qualified_participants) * len(df['statement_id'].unique())
    actual_votes = len(df)
    matrix_stats = {
        'matrix_shape': (len(qualified_participants), len(df['statement_id'].unique())),
        'sparsity': 1 - (actual_votes / total_possible_votes)
    }
    
    # Save results
    output = {
        'metadata': {
            'sample_size': sample_size or 'full',
            'min_votes': min_votes,
            'max_k': max_k,
            'random_state': random_state,
            'duration_seconds': (datetime.now() - start_time).total_seconds(),
            'matrix_stats': matrix_stats
        },
        'metrics': metrics
    }
    
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f'imputation_results_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nResults saved to {output_file}")
    print_results(metrics, matrix_stats)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Evaluate vote imputation quality')
    parser.add_argument('csv_path', help='Path to the votes CSV file')
    parser.add_argument('--sample-size', type=int, help='Number of rows to sample (default: use all)')
    parser.add_argument('--min-votes', type=int, default=3, help='Minimum votes required for participant evaluation')
    parser.add_argument('--max-k', type=int, default=3, help='Maximum number of votes to mask at once')
    parser.add_argument('--random-state', type=int, default=42, help='Random seed for reproducibility')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed progress logs')
    
    args = parser.parse_args()
    main(args.csv_path, args.sample_size, args.min_votes, args.max_k, args.random_state, args.verbose)