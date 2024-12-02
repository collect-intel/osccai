import logging
from http.server import BaseHTTPRequestHandler
import os
import sys
from datetime import datetime
import pg8000
from urllib.parse import urlparse
import numpy as np
import pandas as pd

VERSION = "1.0.1"  # Update this when making changes
print(f"Starting update-gac-scores.py version {VERSION}")

# Configure logging to output to stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',  # Simplified format for Vercel
    handlers=[
        logging.StreamHandler(sys.stdout)  # Force output to stdout
    ]
)
logger = logging.getLogger(__name__)

logger.info("TEST: This should appear in Vercel logs")
print("TEST: This is a print statement")

# Database connection settings
DATABASE_URL = os.getenv("DATABASE_URL")

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            main()
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'GAC scores updated successfully')
        except Exception as e:
            logger.error(f"Error updating GAC scores: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Error updating GAC scores')
        return


def create_connection():
    # Reload DATABASE_URL at runtime
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set")
    
    try:
        url = urlparse(DATABASE_URL)
        db_info = dict(
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port or 5432,
            database='postgres'  # Explicitly set for Supabase
        )
        
        # Remove None values
        db_info = {k: v for k, v in db_info.items() if v is not None}
        
        conn = pg8000.connect(**db_info)
        return conn
    except Exception as e:
        logger.error(f"Failed to parse DATABASE_URL: {e}")
        raise

def main():
    print("main")
    logger.info("Starting update-gac-scores.py script")

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
    logger.info("Completed update-gac-scores.py script successfully")

def fetch_polls_with_changes(cursor):
    query = """
        SELECT DISTINCT "Poll".uid
        FROM "Poll"
        JOIN "Statement" ON "Poll".uid = "Statement"."pollId"
        JOIN "Vote" ON "Statement".uid = "Vote"."statementId"
        WHERE (
            "Statement"."lastCalculatedAt" IS NULL
            OR "Statement"."lastCalculatedAt" < "Vote"."createdAt"
            OR "Statement"."lastCalculatedAt" < "Vote"."updatedAt"
        )
        AND EXISTS (
            SELECT 1 FROM "Vote" v
            WHERE v."statementId" = "Statement".uid
        );
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

    # Fill NA values and infer proper data types
    filled_binary_matrix = binary_matrix.fillna(0).infer_objects(copy=False)
    
    # Calculate Jaccard similarity between participants
    similarity_matrix = filled_binary_matrix.dot(filled_binary_matrix.T)
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

def perform_pca(data, n_components):
    """
    Perform PCA using numpy.
    """
    logger.info("Performing PCA")
    # Center the data
    data_meaned = data - np.mean(data , axis = 0)
    # Compute covariance matrix
    cov_mat = np.cov(data_meaned , rowvar = False)
    # Compute eigenvalues and eigenvectors
    eigen_values , eigen_vectors = np.linalg.eigh(cov_mat)
    # Sort eigenvalues and eigenvectors
    sorted_index = np.argsort(eigen_values)[::-1]
    sorted_eigenvalues = eigen_values[sorted_index]
    sorted_eigenvectors = eigen_vectors[:,sorted_index]
    # Select the first n_components eigenvectors
    eigenvector_subset = sorted_eigenvectors[:,0:n_components]
    # Transform the data
    data_reduced = np.dot(eigenvector_subset.transpose(), data_meaned.transpose()).transpose()
    return data_reduced

def perform_kmeans(data, k, max_iterations=100):
    """
    Perform KMeans clustering using numpy.
    """
    logger.info(f"Performing KMeans clustering with k={k}")
    # Randomly initialize centroids
    centroids = data[np.random.choice(data.shape[0], k, replace=False)]
    for i in range(max_iterations):
        # Calculate distances and assign clusters
        distances = np.linalg.norm(data[:, np.newaxis] - centroids, axis=2)
        labels = np.argmin(distances, axis=1)
        # Update centroids
        new_centroids = np.array([data[labels == j].mean(axis=0) for j in range(k)])
        # Check for convergence
        if np.allclose(centroids, new_centroids, atol=1e-6):
            break
        centroids = new_centroids
    return labels

def compute_silhouette_score(data, labels):
    """
    Compute silhouette score manually.
    """
    logger.info("Computing silhouette score")
    from collections import defaultdict
    a = np.zeros(data.shape[0])
    b = np.zeros(data.shape[0])
    clusters = np.unique(labels)
    for i in range(data.shape[0]):
        same_cluster = data[labels == labels[i]]
        other_clusters = data[labels != labels[i]]
        a[i] = np.mean(np.linalg.norm(same_cluster - data[i], axis=1))
        if len(other_clusters) > 0:
            b[i] = np.min([np.mean(np.linalg.norm(data[labels == label] - data[i], axis=1)) for label in clusters if label != labels[i]])
        else:
            b[i] = 0
    s = (b - a) / np.maximum(a, b)
    s = np.nan_to_num(s)  # Handle division by zero
    return np.mean(s)

def perform_clustering(imputed_vote_matrix):
    """
    Perform PCA and K-means clustering on the imputed vote matrix.
    Returns cluster labels.
    """
    logger.info("Performing PCA and K-means clustering")
    
    n_participants, n_statements = imputed_vote_matrix.shape
    logger.info(f"Vote matrix has {n_participants} participants and {n_statements} statements")
    # Log the imputed vote matrix without index and header
    logger.info(f"Imputed vote matrix:\n{imputed_vote_matrix.to_string(index=False, header=False)}")
    
    if n_participants == 1:
        # Only one participant, assign to a single cluster
        cluster_labels = [0]
        return np.array(cluster_labels)
    
    # Determine the maximum number of PCA components
    max_components = min(n_participants, n_statements)
    optimal_components = min(2, max_components)
    logger.info(f"Using {optimal_components} PCA components")
    
    data = imputed_vote_matrix.fillna(0).values
    principal_components = perform_pca(data, optimal_components)
    
    # Determine optimal number of clusters using silhouette score
    silhouette_scores = []
    max_k = min(5, n_participants)
    K = range(2, max_k+1)
    best_k = 2
    best_score = -1
    
    for k in K:
        labels = perform_kmeans(principal_components, k)
        score = compute_silhouette_score(principal_components, labels)
        silhouette_scores.append(score)
        logger.info(f"Silhouette Score for k={k}: {score}")
        if score > best_score:
            best_score = score
            best_k = k
    
    logger.info(f"Optimal number of clusters determined to be {best_k}")
    
    # Perform final KMeans clustering with optimal k
    cluster_labels = perform_kmeans(principal_components, best_k)
    
    return cluster_labels

def calculate_gac_scores(imputed_vote_matrix, clusters):
    """
    Calculate Group-Aware Consensus (GAC) scores for each statement.
    """
    logger.info("Calculating GAC scores")

    gac_scores = {}
    unique_clusters = np.unique(clusters)
    n_participants = imputed_vote_matrix.shape[0]

    for statement in imputed_vote_matrix.columns:
        statement_votes = imputed_vote_matrix[statement].values

        if n_participants == 1:
            # Only one participant
            vote = statement_votes[0]
            if vote == 1:
                gac = 1.0
            elif vote == -1:
                gac = 0.0
            elif vote == 0:
                gac = 0.5
            else:
                # Should not happen
                gac = 0.5
        else:
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

print("Finished update-gac-scores.py")