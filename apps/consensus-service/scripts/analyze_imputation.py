import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sys
from pathlib import Path

# Add the parent directory to Python path to import from api
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))

from api.update_gac_scores import (
    generate_vote_matrix,
    impute_missing_votes
)

# Import test helpers directly instead of from module
def create_participants(num_participants, ids=None):
    if ids:
        return [{'uid': uid} for uid in ids]
    else:
        return [{'uid': f'participant{i}'} for i in range(1, num_participants + 1)]

def create_statements(num_statements, poll_id='poll1', ids=None):
    if ids:
        return [{'uid': uid, 'pollId': poll_id} for uid in ids]
    else:
        return [{'uid': f'statement{i}', 'pollId': poll_id} for i in range(1, num_statements + 1)]

def create_votes(participants, statements, vote_value_map):
    votes = []
    for participant in participants:
        participant_id = participant['uid']
        for statement in statements:
            statement_id = statement['uid']
            vote_value = vote_value_map.get((participant_id, statement_id))
            if vote_value:
                votes.append({
                    'participantId': participant_id,
                    'statementId': statement_id,
                    'voteValue': vote_value
                })
    return votes

def simulate_imputation(num_statements):
    participants = create_participants(4, ids=['p1', 'p2', 'p3', 'p4'])
    statements = create_statements(num_statements, ids=[f's{i+1}' for i in range(num_statements)])
    
    # Create a voting pattern where p1 and p2 always agree, p3 and p4 always disagree
    vote_value_map = {}
    for i in range(num_statements - 1):  # -1 because we'll remove the last vote
        vote_value_map[('p1', f's{i+1}')] = 'AGREE'
        vote_value_map[('p2', f's{i+1}')] = 'AGREE'
        vote_value_map[('p3', f's{i+1}')] = 'DISAGREE'
        vote_value_map[('p4', f's{i+1}')] = 'DISAGREE'
    
    # Add the final vote for p1 but not p2 or p4 (this is what we'll test imputation on)
    vote_value_map[('p1', f's{num_statements}')] = 'AGREE'
    vote_value_map[('p3', f's{num_statements}')] = 'DISAGREE'
    
    votes = create_votes(participants, statements, vote_value_map)
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed = impute_missing_votes(vote_matrix)
    
    return imputed.loc['p2', f's{num_statements}'], imputed.loc['p4', f's{num_statements}']

def plot_imputation_trend(max_statements):
    num_statements_range = range(2, max_statements + 1)
    imputed_values_p2 = []
    imputed_values_p4 = []
    
    for n in num_statements_range:
        imputed_p2, imputed_p4 = simulate_imputation(n)
        imputed_values_p2.append(imputed_p2)
        imputed_values_p4.append(imputed_p4)
    
    plt.figure(figsize=(10, 6))
    plt.plot(num_statements_range, imputed_values_p2, marker='o', label='p2')
    plt.plot(num_statements_range, imputed_values_p4, marker='o', label='p4', color='red')
    plt.title('Imputed Value vs. Number of Statements')
    plt.xlabel('Number of Statements')
    plt.ylabel('Imputed Value on last statement')
    plt.grid(True)
    plt.legend()
    
    # Save the plot
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)
    plt.savefig(output_dir / 'imputation_trend.png')
    plt.close()

if __name__ == "__main__":
    # Run the simulation and plot for up to 20 statements
    plot_imputation_trend(20)