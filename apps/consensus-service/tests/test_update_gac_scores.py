import pytest
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Union

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

def create_test_scenario(
    participants: int,
    statements_data: Dict[str, Dict[str, Union[List[Tuple[str, str]], bool, str]]],
    description: str
) -> dict:
    """Create a well-structured test scenario"""
    scenario = {
        'participants': participants,
        'statements': statements_data,
        'description': description
    }
    validate_scenario(scenario)
    return scenario

def validate_scenario(scenario: dict) -> None:
    """Validate scenario structure and data"""
    assert isinstance(scenario['participants'], int) and scenario['participants'] > 0
    assert isinstance(scenario['statements'], dict) and scenario['statements']
    
    for statement_id, statement_data in scenario['statements'].items():
        assert 'votes' in statement_data
        if 'expected_constitutionable' in statement_data:
            assert isinstance(statement_data['expected_constitutionable'], bool)

@pytest.mark.parametrize("scenario", [
    # Single participant scenarios
    create_test_scenario(
        participants=1,
        statements_data={
            'statement1': {
                'votes': [
                    ('participant1', 'AGREE')
                ],
                'expected_constitutionable': True,
                'description': 'Single participant agrees'
            }
        },
        description='Single participant agreeing'
    ),
    create_test_scenario(
        participants=1,
        statements_data={
            'statement1': {
                'votes': [
                    ('participant1', 'DISAGREE')
                ],
                'expected_constitutionable': False,
                'description': 'Single participant disagrees'
            }
        },
        description='Single participant disagreeing'
    ),
    create_test_scenario(
        participants=1,
        statements_data={
            'statement1': {
                'votes': [
                    ('participant1', 'PASS')
                ],
                'expected_constitutionable': False,
                'description': 'Single participant passes'
            }
        },
        description='Single participant passing'
    ),
    
    # Two participant scenarios
    create_test_scenario(
        participants=2,
        statements_data={
            'statement1': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'AGREE')
                ],
                'expected_constitutionable': True,
                'description': 'Both participants agree'
            }
        },
        description='Two participants both agreeing'
    ),
    create_test_scenario(
        participants=2,
        statements_data={
            'statement1': {
                'votes': [
                    ('participant1', 'DISAGREE'),
                    ('participant2', 'DISAGREE')
                ],
                'expected_constitutionable': False,
                'description': 'Both participants disagree'
            }
        },
        description='Two participants both disagreeing'
    ),
    create_test_scenario(
        participants=2,
        statements_data={
            'statement1': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'PASS')
                ],
                'expected_constitutionable': False,
                'description': 'One agrees, one passes'
            }
        },
        description='Two participants: agree and pass'
    ),
    create_test_scenario(
        participants=2,
        statements_data={
            'statement1': {
                'votes': [
                    ('participant1', 'AGREE')
                    # participant2 doesn't vote
                ],
                'expected_constitutionable': False,
                'description': 'One agrees, one no vote'
            }
        },
        description='Two participants: one votes, one abstains'
    ),

    # Three participant scenarios
    create_test_scenario(
        participants=3,
        statements_data={
            'statement1': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'AGREE'),
                    ('participant3', 'AGREE')
                ],
                'expected_constitutionable': True,
                'description': 'All agree'
            },
            'statement2': {
                'votes': [
                    ('participant1', 'DISAGREE'),
                    ('participant2', 'PASS')
                ]
            }
        },
        description='Three participants unanimous agree on one statement'
    ),
        # Three participants with diverse voting patterns
    create_test_scenario(
        participants=3,
        statements_data={
            'statement1': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'AGREE'),
                    ('participant3', 'AGREE')
                ],
                'expected_constitutionable': True,
                'description': 'All agree'
            },
            'statement2': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'DISAGREE'),
                    ('participant3', 'PASS')
                ],
                'expected_constitutionable': False,
                'description': 'Mixed votes with disagree'
            },
            'statement3': {
                'votes': [
                    ('participant1', 'PASS'),
                    ('participant2', 'PASS'),
                    ('participant3', 'DISAGREE')
                ],
                'expected_constitutionable': False,
                'description': 'No agrees, should not be constitutionable'
            },
            'statement4': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'PASS'),
                    ('participant3', 'PASS')
                ]
                # No expected_constitutionable test
            },
            'statement5': {
                'votes': [
                    ('participant1', 'DISAGREE'),
                    ('participant2', 'AGREE'),
                    ('participant3', 'AGREE')
                ],
                'expected_constitutionable': False,
                'description': 'Majority agree but one disagrees'
            }
        },
        description='Three participants with unique voting patterns'
    ),

    # Three participants with varying participation levels
    create_test_scenario(
        participants=3,
        statements_data={
            'statement1': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'AGREE'),
                    ('participant3', 'AGREE')
                ],
                'expected_constitutionable': True,
                'description': 'All vote and agree'
            },
            'statement2': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'AGREE')
                    # participant3 doesn't vote
                ],
                'expected_constitutionable': True,
                'description': 'Two agree, one no vote'
            },
            'statement3': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'DISAGREE')
                    # participant3 doesn't vote
                ],
                'expected_constitutionable': False,
                'description': 'One agree, one disagree, one no vote'
            },
            'statement4': {
                'votes': [
                    ('participant1', 'PASS'),
                    ('participant2', 'PASS')
                    # participant3 doesn't vote
                ]
                # No expected_constitutionable test
            },
            'statement5': {
                'votes': [
                    ('participant1', 'AGREE')
                    # Others don't vote
                ],
                'expected_constitutionable': False,
                'description': 'Single agree, others no vote'
            },
            'statement6': {
                'votes': [
                    ('participant1', 'DISAGREE'),
                    ('participant2', 'PASS')
                ]
                # No expected_constitutionable test
            },
            'statement7': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant3', 'AGREE')
                ],
                'expected_constitutionable': True,
                'description': 'Two non-adjacent agree'
            },
            'statement8': {
                'votes': [
                    ('participant1', 'PASS')
                ]
                # No expected_constitutionable test
            },
            'statement9': {
                'votes': [
                    ('participant1', 'DISAGREE')
                ]
                # No expected_constitutionable test
            },
            'statement10': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'PASS'),
                    ('participant3', 'AGREE')
                ],
                'expected_constitutionable': False,
                'description': 'Two agree with pass in between'
            }
        },
        description='Three participants with varying participation levels'
    ),

    # Edge cases and special scenarios
    create_test_scenario(
        participants=3,
        statements_data={
            'statement1': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'AGREE'),
                    ('participant3', 'AGREE')
                ],
                'expected_constitutionable': True,
                'description': 'All agree baseline'
            },
            'statement2': {
                'votes': []  # No votes at all
                # No expected_constitutionable test - should not generate GAC score
            },
            'statement3': {
                'votes': [
                    ('participant1', 'PASS'),
                    ('participant2', 'PASS'),
                    ('participant3', 'PASS')
                ],
                'expected_constitutionable': False,
                'description': 'All pass'
            },
            'statement4': {
                'votes': [
                    ('participant1', 'AGREE'),
                    ('participant2', 'AGREE'),
                    ('participant3', 'AGREE')
                ],
                'expected_constitutionable': True,
                'description': 'Second unanimous agreement'
            },
            'statement5': {
                'votes': [
                    ('participant1', 'DISAGREE'),
                    ('participant2', 'DISAGREE'),
                    ('participant3', 'DISAGREE')
                ],
                'expected_constitutionable': False,
                'description': 'Unanimous disagree'
            }
        },
        description='Three participants with unanimous votes'
    )
    # Add more scenarios here
])
def test_scenarios(scenario: dict) -> None:
    """
    Test various voting scenarios.
    Each scenario can include:
    - Any number of participants
    - Any number of statements
    - Optional constitutionability testing per statement
    - Mixed voting patterns
    """
    participants = create_participants(
        scenario['participants'],
        ids=[f'participant{i+1}' for i in range(scenario['participants'])]
    )
    
    statements = create_statements(
        len(scenario['statements']),
        ids=list(scenario['statements'].keys())
    )
    
    vote_value_map = {}
    for statement_id, statement_data in scenario['statements'].items():
        for participant_id, vote_value in statement_data['votes']:
            vote_value_map[(participant_id, statement_id)] = vote_value
    
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)
    
    for statement_id, statement_data in scenario['statements'].items():
        if 'expected_constitutionable' in statement_data:
            test_description = statement_data.get('description', f'Statement {statement_id}')
            
            if statement_id in gac_scores:
                assert is_constitutionable(gac_scores[statement_id]) == statement_data['expected_constitutionable'], \
                    f"Failed: {scenario['description']} - {test_description}"
            else:
                assert not statement_data['expected_constitutionable'], \
                    f"Failed: {scenario['description']} - {test_description} (no GAC score)"

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

def test_three_participants_mixed_votes():
    # Scenario: 3 participants with unique voting patterns
    participants = create_participants(3, ids=['p1', 'p2', 'p3'])
    statements = create_statements(10, ids=[f's{i}' for i in range(1, 11)])
    
    vote_value_map = {
        # Two statements with all AGREEs (should be constitutionable)
        ('p1', 's1'): 'AGREE', ('p2', 's1'): 'AGREE', ('p3', 's1'): 'AGREE',
        ('p1', 's2'): 'AGREE', ('p2', 's2'): 'AGREE', ('p3', 's2'): 'AGREE',
        
        # Two statements with 2 AGREEs and 1 No Vote (constitutionability TBD)
        ('p1', 's3'): 'AGREE', ('p2', 's3'): 'AGREE',  # p3 no vote
        ('p1', 's4'): 'AGREE', ('p3', 's4'): 'AGREE',  # p2 no vote
        
        # One statement with 1 AGREE and 2 No Votes (should not be constitutionable)
        ('p1', 's5'): 'AGREE',  # p2, p3 no vote
        
        # Remaining statements with mixed DISAGREE/PASS (should not be constitutionable)
        ('p1', 's6'): 'AGREE', ('p2', 's6'): 'DISAGREE', ('p3', 's6'): 'PASS',
        ('p1', 's7'): 'PASS', ('p2', 's7'): 'AGREE', ('p3', 's7'): 'DISAGREE',
        ('p1', 's8'): 'DISAGREE', ('p2', 's8'): 'PASS', ('p3', 's8'): 'AGREE',
        ('p1', 's9'): 'PASS', ('p2', 's9'): 'DISAGREE', ('p3', 's9'): 'AGREE',
        ('p1', 's10'): 'DISAGREE', ('p2', 's10'): 'AGREE', ('p3', 's10'): 'PASS',
    }
    
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)
    
    # Validate full agreement cases
    assert is_constitutionable(gac_scores['s1'])
    assert is_constitutionable(gac_scores['s2'])
    
    # Store but don't validate 2 AGREE + 1 No Vote cases
    two_agrees_score_s3 = is_constitutionable(gac_scores['s3'])
    two_agrees_score_s4 = is_constitutionable(gac_scores['s4'])
    
    # Validate one AGREE case
    assert not is_constitutionable(gac_scores['s5'])
    
    # Validate mixed vote cases
    for i in range(6, 11):
        assert not is_constitutionable(gac_scores[f's{i}'])

def test_six_participants_mixed_votes():
    # Scenario: 6 participants with unique voting patterns
    participants = create_participants(6, ids=['p1', 'p2', 'p3', 'p4', 'p5', 'p6'])
    statements = create_statements(16, ids=[f's{i}' for i in range(1, 17)])
    
    vote_value_map = {
        # Two statements with all AGREEs (should be constitutionable)
        ('p1', 's1'): 'AGREE', ('p2', 's1'): 'AGREE', ('p3', 's1'): 'AGREE',
        ('p4', 's1'): 'AGREE', ('p5', 's1'): 'AGREE', ('p6', 's1'): 'AGREE',
        ('p1', 's2'): 'AGREE', ('p2', 's2'): 'AGREE', ('p3', 's2'): 'AGREE',
        ('p4', 's2'): 'AGREE', ('p5', 's2'): 'AGREE', ('p6', 's2'): 'AGREE',
        
        # Two statements with 5 AGREEs and 1 No Vote (constitutionability TBD)
        ('p1', 's3'): 'AGREE', ('p2', 's3'): 'AGREE', ('p3', 's3'): 'AGREE',
        ('p4', 's3'): 'AGREE', ('p5', 's3'): 'AGREE',  # p6 no vote
        ('p1', 's4'): 'AGREE', ('p2', 's4'): 'AGREE', ('p3', 's4'): 'AGREE',
        ('p4', 's4'): 'AGREE', ('p6', 's4'): 'AGREE',  # p5 no vote
        
        # One statement with 1 AGREE and 5 No Votes (should not be constitutionable)
        ('p1', 's5'): 'AGREE',  # p2-p6 no vote
        
        # Remaining statements with mixed DISAGREE/PASS (should not be constitutionable)
        ('p1', 's6'): 'AGREE', ('p2', 's6'): 'DISAGREE', ('p3', 's6'): 'PASS',
        ('p4', 's6'): 'AGREE', ('p5', 's6'): 'DISAGREE', ('p6', 's6'): 'PASS',
        
        ('p1', 's7'): 'PASS', ('p2', 's7'): 'AGREE', ('p3', 's7'): 'DISAGREE',
        ('p4', 's7'): 'PASS', ('p5', 's7'): 'AGREE', ('p6', 's7'): 'DISAGREE',
        
        ('p1', 's8'): 'DISAGREE', ('p2', 's8'): 'PASS', ('p3', 's8'): 'AGREE',
        ('p4', 's8'): 'DISAGREE', ('p5', 's8'): 'PASS', ('p6', 's8'): 'AGREE',
        
        # Additional mixed patterns
        ('p1', 's9'): 'AGREE', ('p2', 's9'): 'AGREE', ('p3', 's9'): 'DISAGREE',
        ('p4', 's9'): 'PASS', ('p5', 's9'): 'PASS',  # p6 no vote
        
        ('p1', 's10'): 'PASS', ('p2', 's10'): 'DISAGREE', ('p3', 's10'): 'AGREE',
        ('p4', 's10'): 'AGREE', ('p5', 's10'): 'PASS',  # p6 no vote
        
        ('p1', 's11'): 'DISAGREE', ('p2', 's11'): 'AGREE', ('p3', 's11'): 'PASS',
        ('p4', 's11'): 'DISAGREE',  # p5, p6 no vote
        
        ('p1', 's12'): 'PASS', ('p2', 's12'): 'PASS', ('p3', 's12'): 'AGREE',
        ('p4', 's12'): 'DISAGREE', ('p5', 's12'): 'AGREE', ('p6', 's12'): 'DISAGREE',
        
        ('p1', 's13'): 'AGREE', ('p2', 's13'): 'DISAGREE', ('p3', 's13'): 'PASS',
        ('p4', 's13'): 'AGREE', ('p5', 's13'): 'DISAGREE',  # p6 no vote
        
        ('p1', 's14'): 'DISAGREE', ('p2', 's14'): 'PASS', ('p3', 's14'): 'AGREE',
        # p4-p6 no vote
        
        ('p1', 's15'): 'PASS', ('p2', 's15'): 'AGREE', ('p3', 's15'): 'DISAGREE',
        ('p4', 's15'): 'PASS', ('p5', 's15'): 'AGREE',  # p6 no vote
        
        ('p1', 's16'): 'AGREE', ('p2', 's16'): 'PASS', ('p3', 's16'): 'DISAGREE',
        ('p4', 's16'): 'AGREE', ('p5', 's16'): 'PASS', ('p6', 's16'): 'DISAGREE',
    }
    
    votes = create_votes(participants, statements, vote_value_map)
    gac_scores = process_votes(participants, statements, votes)
    
    # Validate full agreement cases
    assert is_constitutionable(gac_scores['s1'])
    assert is_constitutionable(gac_scores['s2'])
    
    # Store but don't validate 5 AGREE + 1 No Vote cases
    five_agrees_score_s3 = is_constitutionable(gac_scores['s3'])
    five_agrees_score_s4 = is_constitutionable(gac_scores['s4'])
    
    # Validate one AGREE case
    assert not is_constitutionable(gac_scores['s5'])
    
    # Validate mixed vote cases
    for i in range(6, 17):
        assert not is_constitutionable(gac_scores[f's{i}'])

def test_is_constitutionable_input():
    # Test that is_constitutionable requires proper dictionary input
    with pytest.raises(ValueError):
        is_constitutionable(0.5)  # Should raise error for non-dict input
        
    # Test with proper dictionary input
    gac_data = {
        'score': 0.9,
        'n_votes': 5,
        'n_participants': 5
    }
    assert is_constitutionable(gac_data)  # Should work with proper dict
    