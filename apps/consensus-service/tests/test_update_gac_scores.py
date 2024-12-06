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

def process_votes(participants, statements, votes):
    vote_matrix = generate_vote_matrix(statements, votes, participants)
    if vote_matrix.empty or vote_matrix.isnull().values.all():
        return {}
    imputed_matrix = impute_missing_votes(vote_matrix)
    clusters = perform_clustering(imputed_matrix)
    gac_scores = calculate_gac_scores(imputed_matrix, clusters)
    return gac_scores

def test_helpers():
    # Test basic helper functionality
    participants = create_participants(2)
    statements = create_statements(2)
    vote_value_map = {
        (participants[0]['uid'], statements[0]['uid']): 'AGREE',
        (participants[1]['uid'], statements[1]['uid']): 'DISAGREE'
    }
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)
    assert isinstance(gac_scores, dict)

def test_single_participant_agree():
    # Scenario: Single participant agrees on a statement
    participants = create_participants(1, ids=['participant1'])
    statements = create_statements(1, ids=['statement1'])
    vote_value_map = {
        ('participant1', 'statement1'): 'AGREE'
    }
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)
    
    # Statement should be constitutionable
    assert is_constitutionable(gac_scores['statement1'])

def test_single_participant_disagree():
    # Scenario: Single participant disagrees on a statement
    participants = create_participants(1, ids=['participant1'])
    statements = create_statements(1, ids=['statement1'])
    vote_value_map = {
        ('participant1', 'statement1'): 'DISAGREE'
    }
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)
    
    # Statement should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_all_agree():
    # Scenario: All participants agree on a statement
    participants = create_participants(5)
    statements = create_statements(1, ids=['statement1'])
    vote_value_map = {
        (participant['uid'], 'statement1'): 'AGREE'
        for participant in participants
    }
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)
    
    # Statement should be constitutionable
    assert is_constitutionable(gac_scores['statement1'])

def test_most_agree_one_no_vote():
    # Scenario: Most participants agree, one participant did not vote
    participants = create_participants(5)
    statements = create_statements(1, ids=['statement1'])
    # All but the last participant agree
    vote_value_map = {
        (participant['uid'], 'statement1'): 'AGREE'
        for participant in participants[:-1]
    }
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # Statement should be constitutionable
    assert is_constitutionable(gac_scores['statement1'])

def test_two_clusters_agree():
    # Scenario: Two clusters; both agree on a statement
    participants_cluster1 = create_participants(10)
    participants_cluster2 = create_participants(10, ids=[f'participant{i}' for i in range(11, 21)])
    participants = participants_cluster1 + participants_cluster2
    statements = create_statements(5)
    
    # All participants agree on statement1
    vote_value_map = {
        (participant['uid'], 'statement1'): 'AGREE'
        for participant in participants
    }
    # Create divergence on other statements to form clusters
    for i in range(2, 6):
        statement_id = f'statement{i}'
        for participant in participants_cluster1:
            vote_value_map[(participant['uid'], statement_id)] = 'AGREE'
        for participant in participants_cluster2:
            vote_value_map[(participant['uid'], statement_id)] = 'DISAGREE'
    
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # Statement1 should be constitutionable
    assert is_constitutionable(gac_scores['statement1'])

def test_one_cluster_agree_other_disagree():
    # Scenario: Two clusters; one agrees, one disagrees on a statement
    participants_cluster1 = create_participants(10)
    participants_cluster2 = create_participants(10, ids=[f'participant{i}' for i in range(11, 21)])
    participants = participants_cluster1 + participants_cluster2
    statements = create_statements(5)
    
    # Cluster 1 agrees on statement1, Cluster 2 disagrees
    vote_value_map = {}
    for participant in participants_cluster1:
        vote_value_map[(participant['uid'], 'statement1')] = 'AGREE'
    for participant in participants_cluster2:
        vote_value_map[(participant['uid'], 'statement1')] = 'DISAGREE'
    # Create divergence on other statements to form clusters
    for i in range(2, 6):
        statement_id = f'statement{i}'
        for participant in participants_cluster1:
            vote_value_map[(participant['uid'], statement_id)] = 'AGREE'
        for participant in participants_cluster2:
            vote_value_map[(participant['uid'], statement_id)] = 'DISAGREE'
    
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # Statement1 should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_no_votes():
    # Scenario: Statement with no votes
    participants = create_participants(5)
    statements = create_statements(1, ids=['statement1'])
    vote_value_map = {}  # No votes
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # Since there are no votes, the GAC scores should not contain the statement
    assert 'statement1' not in gac_scores

def test_all_pass():
    # Scenario: All participants pass on a statement
    participants = create_participants(5)
    statements = create_statements(1, ids=['statement1'])
    vote_value_map = {
        (participant['uid'], 'statement1'): 'PASS'
        for participant in participants
    }
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # Statement should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_simple_majority_agree():
    # Scenario: Simple majority agree on a statement
    participants = create_participants(15)
    statements = create_statements(1, ids=['statement1'])
    # First 10 participants agree, last 5 disagree
    vote_value_map = {}
    for i, participant in enumerate(participants):
        vote_value = 'AGREE' if i < 10 else 'DISAGREE'
        vote_value_map[(participant['uid'], 'statement1')] = vote_value
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # Statement should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_equal_split_agree_disagree():
    # Scenario: Equal number of participants agree and disagree
    participants = create_participants(10)
    statements = create_statements(1, ids=['statement1'])
    vote_value_map = {}
    for i, participant in enumerate(participants):
        vote_value = 'AGREE' if i % 2 == 0 else 'DISAGREE'
        vote_value_map[(participant['uid'], 'statement1')] = vote_value
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # Statement should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_all_disagree():
    # Scenario: All participants disagree on a statement
    participants = create_participants(5)
    statements = create_statements(1, ids=['statement1'])
    vote_value_map = {
        (participant['uid'], 'statement1'): 'DISAGREE'
        for participant in participants
    }
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # Statement should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_one_pass_rest_agree():
    # Scenario: One participant passes, the rest agree
    participants = create_participants(5)
    statements = create_statements(1, ids=['statement1'])
    vote_value_map = {}
    for i, participant in enumerate(participants):
        vote_value = 'PASS' if i == 0 else 'AGREE'
        vote_value_map[(participant['uid'], 'statement1')] = vote_value
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # Statement should be constitutionable
    assert is_constitutionable(gac_scores['statement1'])

def test_one_disagree_rest_pass():
    # Scenario: One participant disagrees, the rest pass
    participants = create_participants(5)
    statements = create_statements(1, ids=['statement1'])
    vote_value_map = {}
    for i, participant in enumerate(participants):
        vote_value = 'DISAGREE' if i == 0 else 'PASS'
        vote_value_map[(participant['uid'], 'statement1')] = vote_value
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # Statement should not be constitutionable
    assert not is_constitutionable(gac_scores['statement1'])

def test_distributed_pass_votes():
    # Scenario: Each participant passes on one unique statement, agrees on all others
    participants = create_participants(5)
    statements = create_statements(5)
    vote_value_map = {}
    for i, participant in enumerate(participants):
        for j, statement in enumerate(statements):
            vote_value = 'PASS' if i == j else 'AGREE'
            vote_value_map[(participant['uid'], statement['uid'])] = vote_value
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # All statements should be constitutionable
    for statement in statements:
        assert is_constitutionable(gac_scores[statement['uid']])

def test_distributed_missing_votes():
    # Scenario: Each participant has one missing vote, agrees on all others
    participants = create_participants(5)
    statements = create_statements(5)
    vote_value_map = {}
    for i, participant in enumerate(participants):
        for j, statement in enumerate(statements):
            if i != j:
                vote_value_map[(participant['uid'], statement['uid'])] = 'AGREE'
            # Missing vote when i == j
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # All statements should be constitutionable
    for statement in statements:
        assert is_constitutionable(gac_scores[statement['uid']])

def test_large_dataset_consensus_across_clusters():
    # Scenario: Two clusters; both agree on certain statements
    num_participants_per_cluster = 50
    participants_cluster1 = create_participants(
        num_participants_per_cluster,
        ids=[f'participant{i}' for i in range(1, num_participants_per_cluster + 1)]
    )
    participants_cluster2 = create_participants(
        num_participants_per_cluster,
        ids=[f'participant{i}' for i in range(num_participants_per_cluster + 1, num_participants_per_cluster * 2 + 1)]
    )
    participants = participants_cluster1 + participants_cluster2
    statements = create_statements(10)

    vote_value_map = {}
    # Both clusters agree on the first 5 statements
    for statement in statements[:5]:
        for participant in participants:
            vote_value_map[(participant['uid'], statement['uid'])] = 'AGREE'
    # Clusters diverge on other statements
    for statement in statements[5:]:
        for participant in participants_cluster1:
            vote_value_map[(participant['uid'], statement['uid'])] = 'AGREE'
        for participant in participants_cluster2:
            vote_value_map[(participant['uid'], statement['uid'])] = 'DISAGREE'
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # Statements 1-5 should be constitutionable
    for statement in statements[:5]:
        assert is_constitutionable(gac_scores[statement['uid']]), f"{statement['uid']} should be constitutionable"
    # Statements 6-10 should not be constitutionable
    for statement in statements[5:]:
        assert not is_constitutionable(gac_scores[statement['uid']]), f"{statement['uid']} should not be constitutionable"

def test_large_dataset_disagreement_between_clusters():
    # Scenario: Two clusters; each agrees on different statements
    num_participants_per_cluster = 50
    participants_cluster1 = create_participants(
        num_participants_per_cluster,
        ids=[f'participant{i}' for i in range(1, num_participants_per_cluster + 1)]
    )
    participants_cluster2 = create_participants(
        num_participants_per_cluster,
        ids=[f'participant{i}' for i in range(num_participants_per_cluster + 1, num_participants_per_cluster * 2 + 1)]
    )
    participants = participants_cluster1 + participants_cluster2
    statements = create_statements(10)

    vote_value_map = {}
    # Cluster 1 agrees on statements 1-5, Cluster 2 disagrees
    for statement in statements[:5]:
        for participant in participants_cluster1:
            vote_value_map[(participant['uid'], statement['uid'])] = 'AGREE'
        for participant in participants_cluster2:
            vote_value_map[(participant['uid'], statement['uid'])] = 'DISAGREE'
    # Cluster 2 agrees on statements 6-10, Cluster 1 disagrees
    for statement in statements[5:]:
        for participant in participants_cluster1:
            vote_value_map[(participant['uid'], statement['uid'])] = 'DISAGREE'
        for participant in participants_cluster2:
            vote_value_map[(participant['uid'], statement['uid'])] = 'AGREE'
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)

    # None of the statements should be constitutionable
    for statement in statements:
        assert not is_constitutionable(gac_scores[statement['uid']]), f"{statement['uid']} should not be constitutionable"
    