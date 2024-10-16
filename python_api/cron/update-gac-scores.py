import logging
import os
import sys
from datetime import datetime
import pg8000
from urllib.parse import urlparse
import numpy as np
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import pandas as pd
from kneed import KneeLocator

print("Starting update_gac_scores.py")

# Configure logging to output to stdout
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

# Database connection settings
DATABASE_URL = os.getenv("DATABASE_URL")

def handler(request):
    print("handler(request)")
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

def create_connection():
    # Parse the DATABASE_URL
    url = urlparse(DATABASE_URL)
    conn = pg8000.connect(
        user=url.username,
        password=url.password,
        host=url.hostname,
        port=url.port or 5432,
        database=url.path[1:]  # Remove the leading '/'
    )
    return conn

def main():
    print("main")
    logger.info("Starting update_gac_scores.py script")

    # Connect to the database
    try:
        conn = create_connection()
        cursor = conn.cursor()
        logger.info("Connected to the database successfully")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

    # Fetch polls with changes
    try:
        polls = fetch_polls_with_changes(cursor)
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

            update_statements(cursor, conn, statements, gac_scores, votes)
            logger.info(f"Updated GAC scores for poll ID: {poll['uid']}")
        except Exception as e:
            logger.error(f"Error processing poll ID {poll['uid']}: {e}")

    # Close database connection
    cursor.close()
    conn.close()
    logger.info("Completed update_gac_scores.py script successfully")

def fetch_polls_with_changes(cursor):
    query = """
        SELECT DISTINCT "Poll".uid
        FROM "Poll"
        JOIN "Statement" ON "Poll".uid = "Statement"."pollId"
        LEFT JOIN "Vote" ON "Statement".uid = "Vote"."statementId"
        WHERE "Statement"."lastCalculatedAt" IS NULL
           OR "Statement"."lastCalculatedAt" < "Vote"."createdAt" 
           OR "Statement"."lastCalculatedAt" < "Vote"."updatedAt";
    """
    cursor.execute(query)
    columns = [col[0] for col in cursor.description]
    polls = [dict(zip(columns, row)) for row in cursor.fetchall()]
    return polls

def fetch_poll_data(cursor, poll_id):
    cursor.execute("""
        SELECT * FROM "Statement" WHERE "pollId" = %s;
    """, (poll_id,))
    columns = [col[0] for col in cursor.description]
    statements = [dict(zip(columns, row)) for row in cursor.fetchall()]

    cursor.execute("""
        SELECT * FROM "Vote" WHERE "statementId" IN (
            SELECT uid FROM "Statement" WHERE "pollId" = %s
        );
    """, (poll_id,))
    columns = [col[0] for col in cursor.description]
    votes = [dict(zip(columns, row)) for row in cursor.fetchall()]

    cursor.execute("""
        SELECT * FROM "Participant" WHERE uid IN (
            SELECT "participantId" FROM "Vote" WHERE "statementId" IN (
                SELECT uid FROM "Statement" WHERE "pollId" = %s
            )
        );
    """, (poll_id,))
    columns = [col[0] for col in cursor.description]
    participants = [dict(zip(columns, row)) for row in cursor.fetchall()]

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
        participant_id = vote['participantId']
        statement_id = vote['statementId']
        vote_value = vote['voteValue']

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
    binary_matrix = vote_matrix.copy()
    binary_matrix[binary_matrix == 1] = 1
    binary_matrix[binary_matrix == -1] = 0
    binary_matrix[binary_matrix != 0] = 0  # Treat 'PASS' and None as 0

    # Calculate Jaccard similarity between participants
    similarity_matrix = binary_matrix.fillna(0).dot(binary_matrix.fillna(0).T)
    norm = np.array([np.sqrt(np.diagonal(similarity_matrix))])
    similarity_matrix = similarity_matrix / (norm.T * norm)

    # Impute missing votes
    imputed_matrix = vote_matrix.copy()

    for participant in vote_matrix.index:
        for statement in vote_matrix.columns:
            if pd.isna(vote_matrix.at[participant, statement]):
                # Find top n_neighbors similar participants who have voted on this statement
                similar_participants = similarity_matrix.loc[participant].dropna().sort_values(ascending=False).index
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

def perform_clustering(imputed_vote_matrix):
    """
    Perform PCA and K-means clustering on the imputed vote matrix.
    Returns cluster labels.
    """
    logger.info("Performing PCA and K-means clustering")

    n_samples, n_features = imputed_vote_matrix.shape
    logger.info(f"Vote matrix has {n_samples} samples and {n_features} features")
    # Log the imputed vote matrix without index or column labels
    logger.info(f"Imputed vote matrix: {imputed_vote_matrix.to_string(index=False, header=False)}")

    # Determine the maximum number of PCA components
    max_pca_components = min(n_samples, n_features, 10)
    if max_pca_components < 1:
        max_pca_components = 1

    # Perform PCA with maximum components to get explained variance ratio
    pca_full = PCA(n_components=max_pca_components)
    pca_full.fit(imputed_vote_matrix.fillna(0))
    explained_variance_ratio = pca_full.explained_variance_ratio_
    n_components_range = range(1, max_pca_components + 1)

    # Use elbow method to determine optimal number of components
    kneedle = KneeLocator(n_components_range, explained_variance_ratio, S=1.0, curve="convex", direction="decreasing")
    optimal_components = kneedle.elbow or max_pca_components
    logger.info(f"Optimal number of PCA components determined to be {optimal_components}")

    # Ensure optimal_components is valid
    optimal_components = min(max(optimal_components, 1), max_pca_components)

    # Perform PCA with optimal number of components
    pca = PCA(n_components=optimal_components)
    principal_components = pca.fit_transform(imputed_vote_matrix.fillna(0))
    logger.info(f"PCA explained variance ratio: {pca.explained_variance_ratio_}")

    # Determine optimal number of clusters using Silhouette Score
    silhouette_scores = []
    max_k = min(10, n_samples)
    K = range(2, max_k + 1)
    for k in K:
        if n_samples >= k:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init='auto')
            labels = kmeans.fit_predict(principal_components)
            score = silhouette_score(principal_components, labels)
            silhouette_scores.append(score)
            logger.info(f"Silhouette Score for k={k}: {score}")
        else:
            break

    if silhouette_scores:
        optimal_k = K[np.argmax(silhouette_scores)]
    else:
        optimal_k = 1
    logger.info(f"Optimal number of clusters determined to be {optimal_k}")

    # Perform K-means with optimal K
    if n_samples >= optimal_k:
        kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init='auto')
        cluster_labels = kmeans.fit_predict(principal_components)
    else:
        cluster_labels = [0] * n_samples

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
            cluster_votes = statement_votes[np.array(clusters) == cluster]
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

def update_statements(cursor, conn, statements, gac_scores, votes):
    # Create a set of statement IDs that have votes
    statements_with_votes = set(vote['statementId'] for vote in votes)

    for statement in statements:
        statement_id = statement['uid']
        if statement_id in statements_with_votes:
            if statement_id in gac_scores:
                gac_score = gac_scores[statement_id]
                is_constitutionable = gac_score >= 0.66
                cursor.execute("""
                    UPDATE "Statement"
                    SET "gacScore" = %s,
                        "lastCalculatedAt" = NOW(),
                        "isConstitutionable" = %s
                    WHERE uid = %s;
                """, (gac_score, is_constitutionable, statement_id))
        else:
            # For statements without votes, ensure gacScore and lastCalculatedAt remain null
            cursor.execute("""
                UPDATE "Statement"
                SET "gacScore" = NULL,
                    "lastCalculatedAt" = NULL,
                    "isConstitutionable" = FALSE
                WHERE uid = %s;
            """, (statement_id,))
    conn.commit()

if __name__ == "__main__":
    main()

print("Finished update_gac_scores.py")
