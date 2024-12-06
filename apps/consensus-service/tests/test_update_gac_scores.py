import pytest
import numpy as np
import pandas as pd

from api.update_gac_scores import (
    generate_vote_matrix,
    impute_missing_votes,
    perform_clustering,
    calculate_gac_scores,
    is_constitutionable
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
    assert is_constitutionable(gac_scores['statement1'])

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
    assert not is_constitutionable(gac_scores['statement1'])

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
    assert is_constitutionable(gac_scores['statement1'])

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
    assert is_constitutionable(gac_scores['statement1'])

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
    assert is_constitutionable(gac_scores['statement1'])

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
    assert not is_constitutionable(gac_scores['statement1'])

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

def test_all_pass():
    # Scenario: All participants pass on a statement
    participants = [{'uid': f'participant{i}'} for i in range(1,6)]
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    
    votes = [
        {'participantId': participant['uid'], 'statementId': 'statement1', 'voteValue': 'PASS'}
        for participant in participants
    ]
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_simple_majority_agree():
    # Scenario: Simple majority agree on a statement
    participants = [{'uid': f'participant{i}'} for i in range(1,15)]
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    
    # First 10 participants agree, last 5 disagree
    votes = []
    for i, participant in enumerate(participants):
        if i < 10:
            vote_value = 'AGREE'
        else:
            vote_value = 'DISAGREE'
        votes.append({'participantId': participant['uid'], 'statementId': 'statement1', 'voteValue': vote_value})
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_equal_split_agree_disagree():
    # Scenario: Equal number of participants agree and disagree
    participants = [{'uid': f'participant{i}'} for i in range(1,11)]
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    
    votes = []
    for i, participant in enumerate(participants):
        if i % 2 == 0:
            vote_value = 'AGREE'
        else:
            vote_value = 'DISAGREE'
        votes.append({'participantId': participant['uid'], 'statementId': 'statement1', 'voteValue': vote_value})
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_all_disagree():
    # Scenario: All participants disagree on a statement
    participants = [{'uid': f'participant{i}'} for i in range(1,6)]
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    
    votes = [
        {'participantId': participant['uid'], 'statementId': 'statement1', 'voteValue': 'DISAGREE'}
        for participant in participants
    ]
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_one_pass_rest_agree():
    # Scenario: One participant passes, the rest agree
    participants = [{'uid': f'participant{i}'} for i in range(1,6)]
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    
    votes = []
    for i, participant in enumerate(participants):
        if i == 0:
            vote_value = 'PASS'
        else:
            vote_value = 'AGREE'
        votes.append({'participantId': participant['uid'], 'statementId': 'statement1', 'voteValue': vote_value})
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement should be constitutionable
    assert is_constitutionable(gac_scores['statement1'])

def test_one_disagree_rest_pass():
    # Scenario: One participant disagrees, the rest pass
    participants = [{'uid': f'participant{i}'} for i in range(1,6)]
    statements = [{'uid': 'statement1', 'pollId': 'poll1'}]
    
    votes = []
    for i, participant in enumerate(participants):
        if i == 0:
            vote_value = 'DISAGREE'
        else:
            vote_value = 'PASS'
        votes.append({'participantId': participant['uid'], 'statementId': 'statement1', 'voteValue': vote_value})
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statement should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_distributed_pass_votes():
    # Scenario: Each participant passes on one unique statement, agrees on all others
    # Number of participants and statements are equal (using 5 each)
    participants = [{'uid': f'participant{i}'} for i in range(1,6)]
    statements = [{'uid': f'statement{i}', 'pollId': 'poll1'} for i in range(1,6)]
    
    votes = []
    # For each participant i, they will PASS on statement i and AGREE on all others
    for i, participant in enumerate(participants):
        for j, statement in enumerate(statements):
            vote_value = 'PASS' if i == j else 'AGREE'
            votes.append({
                'participantId': participant['uid'],
                'statementId': statement['uid'],
                'voteValue': vote_value
            })
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # All statements should be constitutionable
    for statement in statements:
        assert is_constitutionable(gac_scores[statement['uid']])
    
def test_distributed_missing_votes():
    # Scenario: Each participant has one missing vote, agrees on all others
    # Number of participants and statements are equal (using 5 each)
    participants = [{'uid': f'participant{i}'} for i in range(1,6)]
    statements = [{'uid': f'statement{i}', 'pollId': 'poll1'} for i in range(1,6)]
    
    votes = []
    # For each participant i, they will skip statement i and AGREE on all others
    for i, participant in enumerate(participants):
        for j, statement in enumerate(statements):
            if i != j:  # Skip voting when indices match
                votes.append({
                    'participantId': participant['uid'],
                    'statementId': statement['uid'],
                    'voteValue': 'AGREE'
                })
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # All statements should be constitutionable
    for statement in statements:
        assert is_constitutionable(gac_scores[statement['uid']])
    
def test_large_dataset_consensus_across_clusters():
    # Scenario: Two clusters; both agree on certain statements
    num_participants_per_cluster = 50
    total_participants = num_participants_per_cluster * 2
    participants_cluster1 = [{'uid': f'participant{i}'} for i in range(1, num_participants_per_cluster + 1)]
    participants_cluster2 = [{'uid': f'participant{i}'} for i in range(num_participants_per_cluster + 1, total_participants + 1)]
    participants = participants_cluster1 + participants_cluster2
    
    # Generate statements
    num_statements = 10
    statements = [{'uid': f'statement{i}', 'pollId': 'poll1'} for i in range(1, num_statements + 1)]
    
    votes = []
    
    # Both clusters agree on the first 5 statements
    for statement in statements[:5]:
        for participant in participants:
            votes.append({
                'participantId': participant['uid'],
                'statementId': statement['uid'],
                'voteValue': 'AGREE'
            })
    
    # Create divergence on other statements to form clusters
    for statement in statements[5:]:
        # Cluster 1 agrees, Cluster 2 disagrees
        for participant in participants_cluster1:
            votes.append({
                'participantId': participant['uid'],
                'statementId': statement['uid'],
                'voteValue': 'AGREE'
            })
        for participant in participants_cluster2:
            votes.append({
                'participantId': participant['uid'],
                'statementId': statement['uid'],
                'voteValue': 'DISAGREE'
            })
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # Statements 1-5 should be constitutionable
    for statement in statements[:5]:
        assert is_constitutionable(gac_scores[statement['uid']]), f"{statement['uid']} should be constitutionable"
    
    # Statements 6-10 should not be constitutionable
    for statement in statements[5:]:
        assert not is_constitutionable(gac_scores[statement['uid']]), f"{statement['uid']} should not be constitutionable"
    
def test_large_dataset_disagreement_between_clusters():
    # Scenario: Two clusters; each agrees on different statements
    num_participants_per_cluster = 50
    total_participants = num_participants_per_cluster * 2
    participants_cluster1 = [{'uid': f'participant{i}'} for i in range(1, num_participants_per_cluster + 1)]
    participants_cluster2 = [{'uid': f'participant{i}'} for i in range(num_participants_per_cluster + 1, total_participants + 1)]
    participants = participants_cluster1 + participants_cluster2
    
    # Generate statements
    num_statements = 10
    statements = [{'uid': f'statement{i}', 'pollId': 'poll1'} for i in range(1, num_statements + 1)]
    
    votes = []
    
    # Cluster 1 agrees on statements 1-5, Cluster 2 disagrees
    for statement in statements[:5]:
        for participant in participants_cluster1:
            votes.append({
                'participantId': participant['uid'],
                'statementId': statement['uid'],
                'voteValue': 'AGREE'
            })
        for participant in participants_cluster2:
            votes.append({
                'participantId': participant['uid'],
                'statementId': statement['uid'],
                'voteValue': 'DISAGREE'
            })
    
    # Cluster 2 agrees on statements 6-10, Cluster 1 disagrees
    for statement in statements[5:]:
        for participant in participants_cluster2:
            votes.append({
                'participantId': participant['uid'],
                'statementId': statement['uid'],
                'voteValue': 'AGREE'
            })
        for participant in participants_cluster1:
            votes.append({
                'participantId': participant['uid'],
                'statementId': statement['uid'],
                'voteValue': 'DISAGREE'
            })
    
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    
    # None of the statements should be constitutionable due to inter-cluster disagreement
    for statement in statements:
        assert not is_constitutionable(gac_scores[statement['uid']]), f"{statement['uid']} should not be constitutionable"
    