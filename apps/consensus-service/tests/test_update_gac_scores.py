import pytest
import numpy as np
import pandas as pd

from api.update_gac_scores import (
    generate_vote_matrix,
    impute_missing_votes,
    perform_clustering,
    calculate_gac_scores,
)

def test_single_participant_agree():
    # Scenario: Single participant agrees on a statement
    participants = [{'uid': 'participant1'}]
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    votes = [{'participantId': 'participant1', 'statementId': 'statement1', 'voteValue': 'AGREE'}]
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement should be constitutionable
    assert gac_scores['statement1'] >= 0.66

def test_single_participant_disagree():
    # Scenario: Single participant disagrees on a statement
    participants = [{'uid': 'participant1'}]
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    votes = [{'participantId': 'participant1', 'statementId': 'statement1', 'voteValue': 'DISAGREE'}]
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement should not be constitutionable
    assert gac_scores['statement1'] < 0.66

def test_all_agree():
    # Scenario: All participants agree on a statement
    participants = [{'uid': f'participant{i}'} for i in range(1,6)]
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    votes = [
        {'participantId': participant['uid'], 'statementId': 'statement1', 'voteValue': 'AGREE'}
        for participant in participants
    ]
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement should be constitutionable
    assert gac_scores['statement1'] >= 0.66

def test_most_agree_one_no_vote():
    # Scenario: Most participants agree, one participant did not vote
    participants = [{'uid': f'participant{i}'} for i in range(1,6)]
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    votes = [
        {'participantId': participant['uid'], 'statementId': 'statement1', 'voteValue': 'AGREE'}
        for participant in participants[:-1]  # All but the last participant
    ]
    # Last participant did not vote
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement should be constitutionable
    assert gac_scores['statement1'] >= 0.66

def test_two_clusters_agree():
    # Scenario: Two clusters; both agree on a statement
    # Create two clusters of participants
    participants_cluster1 = [{'uid': f'participant{i}'} for i in range(1,11)]
    participants_cluster2 = [{'uid': f'participant{i}'} for i in range(11,21)]
    participants = participants_cluster1 + participants_cluster2
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    
    # All participants agree on statement1
    votes = [
        {'participantId': participant['uid'], 'statementId': 'statement1', 'voteValue': 'AGREE'}
        for participant in participants
    ]
    
    # Create divergence on other statements to form clusters
    for i in range(2,6):
        statements.append({'uid': f'statement{i}', 'pollId': 'poll1'})
        # Cluster 1 agrees, Cluster 2 disagrees
        for participant in participants_cluster1:
            votes.append({'participantId': participant['uid'], 'statementId': f'statement{i}', 'voteValue': 'AGREE'})
        for participant in participants_cluster2:
            votes.append({'participantId': participant['uid'], 'statementId': f'statement{i}', 'voteValue': 'DISAGREE'})
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement1 should be constitutionable
    assert gac_scores['statement1'] >= 0.66

def test_one_cluster_agree_other_disagree():
    # Scenario: Two clusters; one agrees, one disagrees on a statement
    # Create two clusters of participants
    participants_cluster1 = [{'uid': f'participant{i}'} for i in range(1,11)]
    participants_cluster2 = [{'uid': f'participant{i}'} for i in range(11,21)]
    participants = participants_cluster1 + participants_cluster2
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    
    # Cluster 1 agrees on statement1, Cluster 2 disagrees
    votes = []
    for participant in participants_cluster1:
        votes.append({'participantId': participant['uid'], 'statementId': 'statement1', 'voteValue': 'AGREE'})
    for participant in participants_cluster2:
        votes.append({'participantId': participant['uid'], 'statementId': 'statement1', 'voteValue': 'DISAGREE'})
    
    # Create divergence on other statements to form clusters
    for i in range(2,6):
        statements.append({'uid': f'statement{i}', 'pollId': 'poll1'})
        # Cluster 1 agrees, Cluster 2 disagrees
        for participant in participants_cluster1:
            votes.append({'participantId': participant['uid'], 'statementId': f'statement{i}', 'voteValue': 'AGREE'})
        for participant in participants_cluster2:
            votes.append({'participantId': participant['uid'], 'statementId': f'statement{i}', 'voteValue': 'DISAGREE'})
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement1 should not be constitutionable
    assert gac_scores['statement1'] < 0.66

def test_no_votes():
    # Scenario: Statement with no votes
    participants = [{'uid': f'participant{i}'} for i in range(1,6)]
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    votes = []  # No votes
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    
    # Since there are no votes, the vote matrix should be empty or None
    # We can check that the vote matrix is empty and test that calculation is skipped
    assert vote_matrix.isnull().values.all()
    
    # Proceeding further would not make sense, so we consider the GAC score to be None or 0
    # For the test, we can check if the GAC score calculation handles this case gracefully 