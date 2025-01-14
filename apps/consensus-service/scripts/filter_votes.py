import pandas as pd

def filter_votes(input_csv, min_votes_per_participant=1):
    """
    Filter the votes CSV to keep only actual votes (non-NULL) and participants with minimum vote counts.
    """
    # Read original CSV
    df = pd.read_csv(input_csv)
    print(f"\nOriginal data:")
    print(f"Total rows: {len(df)}")
    print(f"Unique participants: {df['participant_id'].nunique()}")
    
    # Count only actual votes (non-NULL values)
    actual_votes = df[df['vote_value'].notna()]
    vote_counts = actual_votes.groupby('participant_id').size()
    
    print("\nActual vote count distribution:")
    print(vote_counts.describe())
    print(f"\nTop 10 participants by vote count:")
    print(vote_counts.sort_values(ascending=False).head(10))
    
    # Filter participants by minimum actual votes
    qualified_participants = vote_counts[vote_counts >= min_votes_per_participant].index
    
    # Create filtered dataframe with only actual votes from qualified participants
    df_filtered = actual_votes[actual_votes['participant_id'].isin(qualified_participants)]
    
    # Generate output filename
    output_csv = input_csv.replace('.csv', f'_min{min_votes_per_participant}actual_votes.csv')
    
    # Show detailed stats before saving
    print(f"\nParticipants with {min_votes_per_participant}+ actual votes: {len(qualified_participants)}")
    print(f"Vote counts for filtered participants:")
    filtered_counts = vote_counts[vote_counts >= min_votes_per_participant]
    print(filtered_counts.describe())
    
    df_filtered.to_csv(output_csv, index=False)
    print(f"\nFiltered data saved to: {output_csv}")
    print(f"Total actual votes in filtered data: {len(df_filtered)}")
    print(f"Unique participants in filtered data: {df_filtered['participant_id'].nunique()}")
    
    return df_filtered

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Filter votes CSV to keep only actual votes')
    parser.add_argument('input_csv', help='Path to the votes CSV file')
    parser.add_argument('--min-votes', type=int, default=2, 
                      help='Minimum actual votes required per participant (default: 2)')
    parser.add_argument('--show-all-counts', action='store_true',
                      help='Show vote counts for all participants')
    
    args = parser.parse_args()
    df_filtered = filter_votes(args.input_csv, args.min_votes)
    
    if args.show_all_counts:
        print("\nAll participant actual vote counts:")
        vote_counts = df_filtered.groupby('participant_id').size().sort_values(ascending=False)
        print(vote_counts) 