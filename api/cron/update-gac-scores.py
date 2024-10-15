import logging
import os
import sys
from datetime import datetime
import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor
import numpy as np
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.metrics import jaccard_score
from sklearn.preprocessing import MultiLabelBinarizer
import pandas as pd

# Configure logging to output to stdout
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

# Database connection settings
DATABASE_URL = os.getenv("DATABASE_URL")

def handler(request):
    logger.info("Received request to update GAC scores")
    try:
        main()
        return {
            "statusCode": 200,
            "body": "GAC scores updated successfully"
        }
    except Exception as e:
        logger.error(f"Error updating GAC scores: {e}")
        return {
            "statusCode": 500,
            "body": "Error updating GAC scores"
        }

def main():
    logger.info("Starting update_gac_scores.py script")
    
    # Connect to the database
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        logger.info("Connected to the database successfully")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

    # Fetch polls with changes
    try:
        last_calculated_at = fetch_last_calculated_at(cursor)
        polls = fetch_polls_with_changes(cursor, last_calculated_at)
        logger.info(f"Fetched {len(polls)} polls with changes")
    except Exception as e:
        logger.error(f"Error fetching polls: {e}")
        cursor.close()
        conn.close()
        raise

    # Process each poll
    for poll in polls:
        try:
            logger.info(f"Processing poll ID: {poll['uid']}")
            statements, votes, participants = fetch_poll_data(cursor, poll['uid'])
            logger.info(f"Fetched data for poll ID: {poll['uid']}")
            
            if not statements or not votes or not participants:
                logger.warning(f"Insufficient data for poll ID: {poll['uid']}, skipping.")
                continue
            
            vote_matrix = generate_vote_matrix(statements, votes, participants)
            logger.info(f"Generated vote matrix for poll ID: {poll['uid']}")
            
            if vote_matrix is None or vote_matrix.empty:
                logger.warning(f"Empty vote matrix for poll ID: {poll['uid']}, skipping.")
                continue
            
            imputed_vote_matrix = impute_missing_votes(vote_matrix)
            logger.info(f"Imputed missing votes for poll ID: {poll['uid']}")
            
            clusters = perform_clustering(imputed_vote_matrix)
            logger.info(f"Performed clustering for poll ID: {poll['uid']}")
            
            gac_scores = calculate_gac_scores(imputed_vote_matrix, clusters)
            logger.info(f"Calculated GAC scores for poll ID: {poll['uid']}")
            
            update_statements(cursor, conn, statements, gac_scores)
            logger.info(f"Updated GAC scores for poll ID: {poll['uid']}")
        except Exception as e:
            logger.error(f"Error processing poll ID {poll['uid']}: {e}")

    # Close database connection
    cursor.close()
    conn.close()
    logger.info("Completed update_gac_scores.py script successfully")

def fetch_last_calculated_at(cursor):
    cursor.execute("""
        SELECT MAX(last_calculated_at) AS last_calculated_at FROM "Statement";
    """)
    result = cursor.fetchone()
    return result['last_calculated_at'] if result and result['last_calculated_at'] else datetime.min

def fetch_polls_with_changes(cursor, last_calculated_at):
    query = sql.SQL("""
        SELECT DISTINCT "Poll".uid
        FROM "Poll"
        JOIN "Statement" ON "Poll".uid = "Statement".poll_id
        JOIN "Vote" ON "Statement".uid = "Vote".statement_id
        WHERE "Statement".last_calculated_at < "Vote".created_at 
           OR "Statement".last_calculated_at < "Vote".updated_at;
    """)
    cursor.execute(query)
    polls = cursor.fetchall()
    return polls

def fetch_poll_data(cursor, poll_id):
    cursor.execute("""
        SELECT * FROM "Statement" WHERE poll_id = %s;
    """, (poll_id,))
    statements = cursor.fetchall()
    
    cursor.execute("""
        SELECT * FROM "Vote" WHERE statement_id IN (
            SELECT uid FROM "Statement" WHERE poll_id = %s
        );
    """, (poll_id,))
    votes = cursor.fetchall()
    
    cursor.execute("""
        SELECT * FROM "Participant" WHERE uid IN (
            SELECT participant_id FROM "Vote" WHERE statement_id IN (
                SELECT uid FROM "Statement" WHERE poll_id = %s
            )
        );
    """, (poll_id,))
    participants = cursor.fetchall()
    
    return statements, votes, participants

def generate_vote_matrix(statements, votes, participants):
    """
    Generate a vote matrix where rows represent participants and columns represent statements.
    Values:
        1  - Agree
       -1  - Disagree
        0  - Pass
       None - No vote
    """
    logger.info("Generating vote matrix")
    
    # Create mappings from IDs to indices
    participant_ids = [participant['uid'] for participant in participants]
    statement_ids = [statement['uid'] for statement in statements]
    
    participant_index = {pid: idx for idx, pid in enumerate(participant_ids)}
    statement_index = {sid: idx for idx, sid in enumerate(statement_ids)}
    
    # Initialize matrix with None
    vote_matrix = np.full((len(participant_ids), len(statement_ids)), None)
    
    for vote in votes:
        participant_id = vote['participant_id']
        statement_id = vote['statement_id']
        vote_value = vote['vote_value']
        
        row = participant_index.get(participant_id)
        col = statement_index.get(statement_id)
        
        if row is not None and col is not None:
            if vote_value == "AGREE":
                vote_matrix[row][col] = 1
            elif vote_value == "DISAGREE":
                vote_matrix[row][col] = -1
            elif vote_value == "PASS":
                vote_matrix[row][col] = 0
    
    # Convert to DataFrame for easier handling
    vote_df = pd.DataFrame(vote_matrix, index=participant_ids, columns=statement_ids)
    
    return vote_df

def impute_missing_votes(vote_matrix, n_neighbors=5):
    """
    Impute missing votes using Jaccard Similarity.
    Participants with similar voting patterns are used to estimate missing votes.
    """
    logger.info("Imputing missing votes using Jaccard Similarity")
    
    # Binarize votes for Jaccard similarity
    # Consider only 'AGREE' and 'DISAGREE' for similarity
    binary_matrix = vote_matrix.copy()
    binary_matrix[binary_matrix == 1] = 1
    binary_matrix[binary_matrix == -1] = 0
    binary_matrix[binary_matrix != 0] = 0  # Treat 'PASS' and None as 0
    
    # Calculate Jaccard similarity between participants
    similarity_matrix = binary_matrix.apply(lambda row: binary_matrix.apply(lambda x: jaccard_similarity(row, x), axis=1), axis=1)
    
    # Impute missing votes
    imputed_matrix = vote_matrix.copy()
    
    for participant in vote_matrix.index:
        for statement in vote_matrix.columns:
            if pd.isna(vote_matrix.at[participant, statement]):
                # Find top n_neighbors similar participants who have voted on this statement
                similar_participants = similarity_matrix.loc[participant].sort_values(ascending=False).index
                votes = []
                weights = []
                for similar in similar_participants:
                    vote = vote_matrix.at[similar, statement]
                    if not pd.isna(vote):
                        votes.append(vote)
                        weights.append(similarity_matrix.at[participant, similar])
                    if len(votes) >= n_neighbors:
                        break
                if votes:
                    # Weighted average
                    weighted_avg = np.average(votes, weights=weights)
                    # Round to nearest integer (-1, 0, 1)
                    imputed_vote = int(round(weighted_avg))
                    imputed_matrix.at[participant, statement] = imputed_vote
                else:
                    # Default to 'PASS' if no similar votes found
                    imputed_matrix.at[participant, statement] = 0
    return imputed_matrix

def jaccard_similarity(row1, row2):
    """
    Calculate Jaccard similarity between two vote rows.
    Only consider 'AGREE' and 'DISAGREE' votes for similarity.
    """
    # Convert to sets of voted statements
    set1 = set(row1.index[row1 == 1].tolist() + row1.index[row1 == -1].tolist())
    set2 = set(row2.index[row2 == 1].tolist() + row2.index[row2 == -1].tolist())
    
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    
    return intersection / union if union != 0 else 0

def perform_clustering(imputed_vote_matrix):
    """
    Perform PCA and K-means clustering on the imputed vote matrix.
    Returns cluster labels.
    """
    logger.info("Performing PCA and K-means clustering")
    
    # Perform PCA
    pca = PCA(n_components=min(5, imputed_vote_matrix.shape[1]))
    principal_components = pca.fit_transform(imputed_vote_matrix.fillna(0))
    logger.info(f"PCA explained variance ratio: {pca.explained_variance_ratio_}")
    
    # Determine optimal number of clusters using Silhouette Score
    silhouette_scores = []
    K = range(2, min(10, len(imputed_vote_matrix)))
    for k in K:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init='auto')
        labels = kmeans.fit_predict(principal_components)
        score = silhouette_score(principal_components, labels)
        silhouette_scores.append(score)
        logger.info(f"Silhouette Score for k={k}: {score}")
    
    if silhouette_scores:
        optimal_k = K[np.argmax(silhouette_scores)]
    else:
        optimal_k = 1
    logger.info(f"Optimal number of clusters determined to be {optimal_k}")
    
    # Perform K-means with optimal K
    kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init='auto')
    cluster_labels = kmeans.fit_predict(principal_components)
    
    return cluster_labels

def calculate_gac_scores(imputed_vote_matrix, clusters):
    """
    Calculate Group-Aware Consensus (GAC) scores for each statement.
    """
    logger.info("Calculating GAC scores")
    
    gac_scores = {}
    unique_clusters = np.unique(clusters)
    
    for statement in imputed_vote_matrix.columns:
        statement_votes = imputed_vote_matrix[statement].values
        gac = 1.0
        
        for cluster in unique_clusters:
            cluster_votes = statement_votes[clusters == cluster]
            # Exclude 'PASS' votes
            relevant_votes = cluster_votes[cluster_votes != 0]
            
            sum_agrees = np.sum(relevant_votes > 0)
            sum_abs_votes = np.sum(np.abs(relevant_votes))
            
            if sum_abs_votes == 0:
                p_agree = 0.5  # Neutral if no votes
            else:
                p_agree = (1 + sum_agrees) / (2 + sum_abs_votes)
            
            gac *= p_agree
        
        gac_scores[statement] = gac
    
    return gac_scores

def update_statements(cursor, conn, statements, gac_scores):
    for statement in statements:
        statement_id = statement['uid']
        if statement_id in gac_scores:
            gac_score = gac_scores[statement_id]
            is_constitutionable = gac_score >= 0.66
            cursor.execute("""
                UPDATE "Statement"
                SET gac_score = %s,
                    last_calculated_at = NOW(),
                    is_constitutionable = %s
                WHERE uid = %s;
            """, (gac_score, is_constitutionable, statement_id))
    conn.commit()
