import logging
import sys
import json
from http.server import BaseHTTPRequestHandler
import os
import argparse
from datetime import datetime
import pg8000
from urllib.parse import urlparse
import numpy as np
import pandas as pd
import math

# Set pandas option for future-proof behavior with downcasting
pd.set_option('future.no_silent_downcasting', True)

VERSION = "1.0.2"  # Update this when making changes

def setup_logging():
    # Configure logging to output to stdout
    logging.basicConfig(
        level=logging.INFO,
        format='[%(levelname)s] %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True  # Ensure this configuration is applied
    )
    return logging.getLogger(__name__)

logger = setup_logging()

def log_gac(message, data=None, poll_id=None):
    """Helper function to format GAC calculation logs consistently"""
    log_data = {
        'poll_id': poll_id,
        'message': message,
        'data': data
    }
    logger.info(json.dumps(log_data))

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

def verify_poll_exists(cursor, poll_id):
    """Verify if a poll exists and is valid for processing."""
    cursor.execute(
        'SELECT "uid", "deleted" FROM "Poll" WHERE "uid" = %s',
        (poll_id,)
    )
    result = cursor.fetchone()
    
    if not result:
        raise ValueError(f"Poll with ID {poll_id} not found")
    
    poll_data = dict(zip(['uid', 'deleted'], result))
    if poll_data['deleted']:
        raise ValueError(f"Poll {poll_id} has been deleted")
    
    return True

def main(poll_id=None, dry_run=False):
    """
    Main function to update GAC scores.
    Args:
        poll_id: Optional specific poll to process
        dry_run: If True, only show calculations without modifying data
    """
    logger.info(f"Starting update-gac-scores.py script version {VERSION}")
    logger.info(f"Mode: {'Dry Run' if dry_run else 'Normal'}")
    logger.info(f"Target: {'Specific Poll: ' + poll_id if poll_id else 'All Modified Polls'}")

    try:
        conn = create_connection()
        cursor = conn.cursor()
        logger.info("Connected to the database successfully")

        if poll_id:
            # Verify poll exists and is valid
            verify_poll_exists(cursor, poll_id)
            polls = [{'uid': poll_id}]
            logger.info(f"Processing specific poll: {poll_id}")
        else:
            # Fetch polls with changes
            polls = fetch_polls_with_changes(cursor)
            logger.info(f"Fetched {len(polls)} polls with changes")

        # Process each poll
        for poll in polls:
            try:
                poll_id = poll['uid']
                logger.info(f"Processing poll ID: {poll_id}")
                statements, votes, participants = fetch_poll_data(cursor, poll_id)
                logger.info(f"Fetched data for poll ID: {poll_id}")

                if not statements or not votes or not participants:
                    logger.warning(f"Insufficient data for poll ID: {poll_id}, skipping.")
                    continue

                vote_matrix = generate_vote_matrix(statements, votes, participants)
                logger.info(f"Generated vote matrix for poll ID: {poll_id}")

                if vote_matrix is None or vote_matrix.empty:
                    logger.warning(f"Empty vote matrix for poll ID: {poll_id}, skipping.")
                    continue

                imputed_vote_matrix = impute_missing_votes(vote_matrix)
                logger.info(f"Imputed missing votes for poll ID: {poll_id}")

                clusters = perform_clustering(imputed_vote_matrix)
                logger.info(f"Performed clustering for poll ID: {poll_id}")

                gac_scores = calculate_gac_scores(imputed_vote_matrix, clusters)
                logger.info(f"Calculated GAC scores for poll ID: {poll_id}")

                if not dry_run:
                    update_statements(cursor, conn, statements, gac_scores, votes)
                    logger.info(f"Updated GAC scores for poll ID: {poll_id}")
                else:
                    # Log what would have been updated in dry run mode
                    for statement in statements:
                        statement_id = statement['uid']
                        if statement_id in gac_scores:
                            gac_score = gac_scores[statement_id]
                            is_constitutionable = is_constitutionable(gac_score)
                            logger.info(f"[DRY RUN] Would update statement {statement_id}:")
                            logger.info(f"  - GAC Score: {gac_score}")
                            logger.info(f"  - Is Constitutionable: {is_constitutionable}")

            except Exception as e:
                logger.error(f"Error processing poll ID {poll_id}: {e}")
                continue

        # Close database connection
        cursor.close()
        conn.close()
        logger.info("Completed update-gac-scores.py script successfully")

    except Exception as e:
        logger.error(f"Error in main function: {e}")
        sys.exit(1)

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
    poll_id = statements[0]['pollId'] if statements else None
    
    log_gac("Starting vote matrix generation", {
        'statement_count': len(statements),
        'vote_count': len(votes),
        'participant_count': len(participants)
    }, poll_id)
    
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
    
    log_gac("Completed vote matrix generation", {
        'matrix_shape': vote_df.shape
    }, poll_id)
    
    return vote_df

def impute_missing_votes(vote_matrix, n_neighbors=5):
    """
    Impute missing votes using Jaccard Similarity.
    Participants with similar voting patterns are used to estimate missing votes.
    """
    logger.info("Imputing missing votes using Jaccard Similarity")
    
    n_participants = len(vote_matrix.index)
    n_neighbors = min(n_neighbors, n_participants - 1)
    
    # Handle single participant case
    if n_participants == 1:
        logger.info("Single participant detected, using simple imputation")
        imputed_matrix = vote_matrix.copy()
        # For single participant, impute missing votes with PASS (0)
        imputed_matrix = imputed_matrix.fillna(0)
        return imputed_matrix

    # Binarize votes for Jaccard similarity
    binary_matrix = vote_matrix.copy()
    binary_matrix[binary_matrix == 1] = 1
    binary_matrix[binary_matrix == -1] = 0
    binary_matrix[binary_matrix != 0] = 0  # Treat 'PASS' and None as 0

    # Convert to float type before calculations
    filled_binary_matrix = binary_matrix.fillna(0).astype(float)
    
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
    Perform PCA using numpy, with handling for edge cases.
    """
    logger.info("Performing PCA")
    
    # If data is too small or lacks variance, return original data
    if data.shape[1] <= n_components or np.allclose(data, data[0]):
        logger.info("Data lacks sufficient variance for PCA, using original data")
        return data
    
    # Center the data
    data_meaned = data - np.mean(data, axis=0)
    
    # Compute covariance matrix
    cov_mat = np.cov(data_meaned, rowvar=False)
    
    # Handle case where covariance matrix is scalar or 1D
    if not isinstance(cov_mat, np.ndarray) or cov_mat.ndim < 2:
        logger.info("Insufficient variance in data for PCA, using original data")
        return data
    
    # Compute eigenvalues and eigenvectors
    try:
        eigen_values, eigen_vectors = np.linalg.eigh(cov_mat)
        # Sort eigenvalues and eigenvectors
        sorted_index = np.argsort(eigen_values)[::-1]
        sorted_eigenvalues = eigen_values[sorted_index]
        sorted_eigenvectors = eigen_vectors[:,sorted_index]
        
        # Check if we have enough meaningful components
        meaningful_components = np.sum(sorted_eigenvalues > 1e-10)
        if meaningful_components < n_components:
            logger.info(f"Only {meaningful_components} meaningful components found, adjusting dimensionality")
            n_components = max(1, meaningful_components)
        
        # Select components and transform
        eigenvector_subset = sorted_eigenvectors[:,0:n_components]
        data_reduced = np.dot(eigenvector_subset.transpose(), data_meaned.transpose()).transpose()
        return data_reduced
        
    except np.linalg.LinAlgError:
        logger.info("Linear algebra error in PCA, using original data")
        return data

def perform_kmeans(data, k, max_iterations=100):
    """
    Perform KMeans clustering using numpy with improved stability.
    """
    logger.info(f"Performing KMeans clustering with k={k}")
    
    n_samples = data.shape[0]
    
    # Handle edge cases
    if n_samples < k:
        logger.info(f"Too few samples ({n_samples}) for {k} clusters, adjusting k")
        k = max(2, n_samples)
    
    try:
        # Initialize centroids using better sampling
        centroid_indices = np.random.choice(n_samples, k, replace=False)
        centroids = data[centroid_indices]
        
        # Handle case where initial centroids are identical
        if np.allclose(centroids, centroids[0]):
            logger.info("Initial centroids are identical, adding small random noise")
            centroids += np.random.normal(0, 1e-4, centroids.shape)
        
        prev_labels = None
        
        for iteration in range(max_iterations):
            # Calculate distances with numerical stability
            distances = np.zeros((n_samples, k))
            for i in range(k):
                distances[:, i] = np.sum(np.square(data - centroids[i]), axis=1)
            
            # Assign clusters
            labels = np.argmin(distances, axis=1)
            
            # Check for convergence
            if prev_labels is not None and np.array_equal(labels, prev_labels):
                logger.info(f"KMeans converged after {iteration + 1} iterations")
                break
                
            prev_labels = labels.copy()
            
            # Update centroids with handling for empty clusters
            for i in range(k):
                cluster_points = data[labels == i]
                if len(cluster_points) > 0:
                    centroids[i] = cluster_points.mean(axis=0)
                else:
                    # If cluster is empty, reinitialize its centroid
                    logger.info(f"Reinitializing empty cluster {i}")
                    centroids[i] = data[np.random.choice(n_samples)]
        
        return labels
        
    except Exception as e:
        logger.error(f"KMeans clustering failed: {e}")
        # Fallback to single cluster
        return np.zeros(n_samples)

def compute_silhouette_score(data, labels):
    """
    Compute silhouette score manually.
    """
    logger.info("Computing silhouette score")
    a = np.zeros(data.shape[0])
    b = np.zeros(data.shape[0])
    clusters = np.unique(labels)
    for i in range(data.shape[0]):
        same_cluster = data[labels == labels[i]]
        other_clusters = data[labels != labels[i]]
        a[i] = np.mean(np.linalg.norm(same_cluster - data[i], axis=1))
        if len(other_clusters) > 0:
            b[i] = np.min([
                np.mean(np.linalg.norm(data[labels == label] - data[i], axis=1))
                for label in clusters if label != labels[i]
            ])
        else:
            b[i] = 0
    with np.errstate(divide='ignore', invalid='ignore'):
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
    
    # Special case: 5 or fewer participants get a single cluster
    if n_participants <= 5:
        logger.info("Small group detected, using single cluster")
        return np.zeros(n_participants)
    
    # Convert to numpy array and ensure float type with no missing values
    try:
        data = imputed_vote_matrix.fillna(0).astype(float).values
        logger.info("Successfully converted vote matrix to numerical format")
    except Exception as e:
        logger.error(f"Error converting vote matrix: {e}")
        # Fallback to single cluster if conversion fails
        return np.zeros(n_participants)
    
    # Determine the maximum number of PCA components
    max_components = min(n_participants, n_statements)
    optimal_components = min(2, max_components)
    logger.info(f"Using {optimal_components} PCA components")
    
    try:
        principal_components = perform_pca(data, optimal_components)
        logger.info("PCA completed successfully")
    except Exception as e:
        logger.error(f"PCA failed: {e}")
        # Fallback to original data if PCA fails
        principal_components = data
    
    # Limit K
    max_k = min(5, n_participants // 2)
    max_k = max(2, max_k)  # Ensure max_k is at least 2

    best_k = 2  # Default to 2 clusters if optimization fails

    try:
        silhouette_scores = []
        K = range(2, max_k + 1)
        best_score = -1

        for k in K:
            labels = perform_kmeans(principal_components, k)
            score = compute_silhouette_score(principal_components, labels)
            logger.info(f"Silhouette Score for k={k}: {score}")
            if score > best_score:
                best_score = score
                best_k = k

        logger.info(f"Optimal number of clusters determined to be {best_k}")
    except Exception as e:
        logger.error(f"Cluster optimization failed: {e}")
        # Keep default best_k value

    # Perform final clustering
    try:
        cluster_labels = perform_kmeans(principal_components, best_k)
        logger.info("Final clustering completed successfully")
    except Exception as e:
        logger.error(f"Final clustering failed: {e}")
        # Fallback to basic clustering
        cluster_labels = np.zeros(n_participants)

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

                group_size = len(cluster_votes)
                # Compute pseudocount as a function of group size
                if group_size <= 1:
                    pseudocount = 0.1  # Small positive value to avoid division by zero
                else:
                    pseudocount = 0.5 * math.log10(group_size)

                if sum_abs_votes == 0:
                    p_agree = 0.5  # Neutral if no votes
                else:
                    p_agree = (pseudocount + sum_agrees) / (2 * pseudocount + sum_abs_votes)

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
                is_constitutionable = is_constitutionable(gac_score)
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

def is_constitutionable(gac_score, threshold=0.66):
    """
    Determine if a statement is constitutionable based on its GAC score.
    Args:
        gac_score (float): The GAC score of the statement.
        threshold (float): The threshold above which a statement is considered constitutionable.
    Returns:
        bool: True if the statement is constitutionable, False otherwise.
    """
    return gac_score >= threshold

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Update GAC scores for statements')
    parser.add_argument('--poll-id', help='Specific poll ID to process')
    parser.add_argument('--dry-run', action='store_true', help='Show calculations without modifying data')
    args = parser.parse_args()
    
    main(poll_id=args.poll_id, dry_run=args.dry_run)