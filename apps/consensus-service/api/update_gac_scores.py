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

VERSION = "1.1.0"  # Update this when making changes

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

                gac_scores = process_votes(participants, statements, votes)
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

def calculate_jaccard_similarity(matrix):
    """Calculate pairwise Jaccard similarities between participants."""
    n_participants = len(matrix)
    similarity_matrix = np.zeros((n_participants, n_participants))
    
    for i in range(n_participants):
        for j in range(i, n_participants):
            # Convert to boolean arrays for intersection/union
            a = matrix.iloc[i].values != 0
            b = matrix.iloc[j].values != 0
            
            intersection = np.sum(a & b)
            union = np.sum(a | b)
            
            # Handle edge case of empty union
            similarity = intersection / union if union > 0 else 0
            
            similarity_matrix[i, j] = similarity
            similarity_matrix[j, i] = similarity  # Matrix is symmetric
    
    return similarity_matrix

def jaccard_impute(vote_matrix, n_neighbors):
    # Binarize the vote matrix for Jaccard similarity calculation
    binary_matrix = vote_matrix.map(lambda x: 1 if x == 1 else (0 if x == -1 else np.nan))
    binary_matrix = binary_matrix.fillna(0)

    # Calculate Jaccard similarity between participants
    similarity_matrix = calculate_jaccard_similarity(binary_matrix)
    np.fill_diagonal(similarity_matrix, 1)

    # Convert the similarity matrix to a DataFrame for easier indexing
    similarity_df = pd.DataFrame(similarity_matrix, index=vote_matrix.index, columns=vote_matrix.index)

    # Impute missing votes
    imputed_matrix = vote_matrix.copy()
    for participant in vote_matrix.index:
        missing_statements = vote_matrix.columns[imputed_matrix.loc[participant].isna()]
        for statement in missing_statements:
            # Find similar participants who have voted on this statement
            similar_participants = similarity_df[participant].drop(participant).nlargest(n_neighbors).index
            similar_votes = vote_matrix.loc[similar_participants, statement].dropna()
            if not similar_votes.empty:
                # Use weighted average of similar participants' votes
                weights = similarity_df.loc[similar_votes.index, participant]
                if weights.sum() == 0:
                    continue  # Avoid division by zero
                weighted_vote = np.average(similar_votes, weights=weights)
                # Round to nearest integer (-1, 0, 1)
                imputed_vote = int(round(weighted_vote))
                imputed_matrix.at[participant, statement] = imputed_vote
            else:
                # Default to 'PASS' if no similar votes found
                imputed_matrix.at[participant, statement] = 0
    return imputed_matrix

def impute_missing_votes(vote_matrix):
    """
    Impute missing votes with adaptive neighbor selection.
    """
    n_participants = len(vote_matrix)
    logger.info(f"Imputing missing votes for {n_participants} participants")
    
    if n_participants < 4:
        logger.info("Small group detected, using simple mean imputation")
        return vote_matrix.fillna(0)
    
    # Adaptive number of neighbors
    n_neighbors = min(5, max(2, int(np.log2(n_participants))))
    logger.info(f"Using {n_neighbors} neighbors for imputation")
    
    try:
        imputed = jaccard_impute(vote_matrix, n_neighbors)
        logger.info("Successfully imputed missing votes")
        return imputed
    except Exception as e:
        logger.error(f"Imputation failed: {e}")
        logger.info("Falling back to simple imputation")
        return vote_matrix.fillna(0)

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

def perform_clustering(vote_matrix):
    """
    Perform clustering with adaptive scaling based on group size.
    """
    # Convert to numpy array for calculations
    data = vote_matrix.values
    n_participants = len(data)
    
    logger.info(f"Starting clustering with {n_participants} participants")
    
    # Single cluster for very small groups 
    if n_participants < 4:
        logger.info("Group too small for clustering, using single cluster")
        return np.zeros(n_participants)
        
    # Determine max clusters based on group size
    max_k = min(5, max(2, int(np.sqrt(n_participants/4))))
    logger.info(f"Maximum clusters set to {max_k}")
    
    # Try clustering with decreasing k until valid clusters found
    for k in range(max_k, 1, -1):
        try:
            labels = perform_kmeans(data, k)
            # Check minimum cluster size (log2 scaling provides good minimums)
            min_size = max(2, int(np.log2(n_participants)))
            sizes = np.bincount(labels)
            
            if np.all(sizes >= min_size):
                logger.info(f"Found valid clustering with {k} clusters")
                logger.info(f"Cluster sizes: {sizes}")
                return labels
            else:
                logger.info(f"Clusters too small with k={k}, trying fewer clusters")
                
        except Exception as e:
            logger.warning(f"Clustering failed with k={k}: {e}")
            continue
            
    # Fallback to single cluster
    logger.info("No valid clustering found, using single cluster")
    return np.zeros(n_participants)

def calculate_gac_scores(vote_matrix, clusters):
    """
    Calculate GAC scores with adaptive pseudocount scaling.
    """
    n_participants = len(vote_matrix)
    gac_scores = {}
    
    logger.info(f"Calculating GAC scores for {n_participants} participants")
    
    # Base pseudocount scales logarithmically but stays small
    base_pseudocount = 0.3 * np.log2(1 + n_participants/10)
    logger.info(f"Base pseudocount: {base_pseudocount}")
    
    for statement in vote_matrix.columns:
        gac = 1.0
        total_votes = 0
        
        for cluster_id in np.unique(clusters):
            cluster_votes = vote_matrix[statement][clusters == cluster_id]
            
            # Remove PASS votes
            active_votes = cluster_votes[cluster_votes != 0]
            n_active = len(active_votes)
            total_votes += n_active
            
            if n_active == 0:
                p_agree = 0.5
            else:
                # Calculate agreement with pseudocount stabilization
                n_agree = np.sum(active_votes > 0)
                p_agree = (n_agree + base_pseudocount) / (n_active + 2 * base_pseudocount)
                
                # Weight by active participation
                group_weight = n_active / len(cluster_votes)
                p_agree = p_agree ** group_weight
                
            gac *= p_agree
            
        gac_scores[statement] = {
            'score': gac,
            'n_votes': total_votes,
            'n_participants': n_participants
        }
        
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

def is_constitutionable(gac_data):
    """
    Determine if a statement is constitutionable with adaptive thresholds.
    """
    if isinstance(gac_data, dict):
        gac_score = gac_data['score']
        n_participants = gac_data['n_participants']
    else:
        raise ValueError("GAC data must be a dictionary containing 'score' and 'n_participants'")
    
    base_threshold = 0.66
    
    # Threshold scales up for small groups but caps at 0.85
#    threshold = base_threshold
    threshold = min(0.85, base_threshold * (1 + 2/np.log2(2 + n_participants)))
    
    logger.debug(f"Constitutionable check: score={gac_score:.3f}, threshold={threshold:.3f}")
    
    return gac_score >= threshold

def process_votes(participants, statements, votes):
    """
    Process votes with improved error handling and logging.
    """
    n_participants = len(participants)
    logger.info(f"Processing votes for {n_participants} participants")
    
    try:
        vote_matrix = generate_vote_matrix(statements, votes, participants)
        if vote_matrix.empty or vote_matrix.isnull().values.all():
            logger.warning("Empty vote matrix, skipping processing")
            return {}
            
        imputed_matrix = impute_missing_votes(vote_matrix)
        clusters = perform_clustering(imputed_matrix)
        gac_scores = calculate_gac_scores(imputed_matrix, clusters)
        
        logger.info("Successfully processed votes")
        return gac_scores
        
    except Exception as e:
        logger.error(f"Error processing votes: {e}")
        return {}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Update GAC scores for statements')
    parser.add_argument('--poll-id', help='Specific poll ID to process')
    parser.add_argument('--dry-run', action='store_true', help='Show calculations without modifying data')
    args = parser.parse_args()
    
    main(poll_id=args.poll_id, dry_run=args.dry_run)