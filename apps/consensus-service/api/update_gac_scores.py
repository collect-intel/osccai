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
import aiohttp
import asyncio
import uuid

# Handle imports for both direct execution and package import
try:
    # Try relative import first (for when used as a package)
    from .webhook_utils import send_webhook
except (ImportError, ValueError):
    # Fall back to direct import (for when run as script)
    from webhook_utils import send_webhook

# Set pandas option for future-proof behavior with downcasting
pd.set_option('future.no_silent_downcasting', True)

VERSION = "1.2.0"  # Update this when making changes

def setup_logging():
    """
    Configure logging with environment-aware setup:
    - Test environment: Let pytest handle logging
    - Vercel environment: Use basic logging (captured by Vercel)
    - Local development: Log to stdout
    """
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    
    # Clear any existing handlers to prevent duplicates
    if logger.hasHandlers():
        logger.handlers.clear()
    
    formatter = logging.Formatter('[%(levelname)s] %(message)s')
    
    # Check environment
    is_vercel = os.environ.get('VERCEL', False)
    is_test = 'pytest' in sys.modules
    
    if is_vercel:
        # In Vercel: Use basic logging (Vercel handles capture)
        logging.basicConfig(
            level=logging.INFO,
            format='[%(levelname)s] %(message)s'
        )
        logger.propagate = False  # Prevent double logging
    elif is_test:
        # In tests: Let pytest handle logging
        # Do not set up any handlers; allow logs to propagate
        logger.propagate = True  # Allow propagation to root logger
    else:
        # Local development: Log to stdout
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.propagate = False  # Prevent double logging

    return logger

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
    
    def do_POST(self):
        logger.info("Handling POST request in update_gac_scores.py")
        
        try:
            # Get request body
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                logger.info(f"Content length: {content_length}")
                post_data = self.rfile.read(content_length).decode('utf-8')
                logger.info(f"Request body: {post_data}")
                
                data = json.loads(post_data)
                poll_id = data.get('pollId')
                force = data.get('force', False)
                
                logger.info(f"Parsed request: pollId={poll_id}, force={force}")
                
                if not poll_id:
                    logger.warning("Missing required parameter: pollId")
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "error": "Missing required parameter: pollId"
                    }).encode())
                    return
                
                logger.info(f"Triggering GAC update for poll: {poll_id}")
                
                # Run the GAC update for the specific poll
                try:
                    result = main(poll_id=poll_id, force=force)
                    logger.info(f"GAC update completed with result: {result}")
                    
                    # Send success response
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": True,
                        "message": f"GAC update triggered for poll: {poll_id}",
                        "result": result
                    }).encode())
                except Exception as e:
                    logger.error(f"Error in main function: {str(e)}")
                    import traceback
                    logger.error(traceback.format_exc())
                    self.send_response(500)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "error": f"Error processing GAC update: {str(e)}"
                    }).encode())
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {str(e)}")
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Invalid JSON in request body"
                }).encode())
            except Exception as e:
                logger.error(f"Unexpected error in do_POST: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": f"Internal server error: {str(e)}"
                }).encode())
        except Exception as e:
            logger.error(f"Top-level exception in do_POST: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            try:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": f"Server error: {str(e)}"
                }).encode())
            except:
                logger.error("Failed to send error response")

def create_connection():
    # Reload DATABASE_URL at runtime
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        error_msg = "DATABASE_URL environment variable is not set"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    try:
        url = urlparse(DATABASE_URL)
        logger.info(f"Connecting to database at {url.hostname}")
        
        # Extract connection parameters
        dbname = url.path[1:]  # Remove leading slash
        user = url.username
        password = url.password
        host = url.hostname
        port = url.port or 5432  # Default PostgreSQL port
        
        # Connect to the database
        conn = pg8000.connect(
            database=dbname,
            user=user,
            password=password,
            host=host,
            port=port
        )
        logger.info("Database connection successful")
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
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

def get_community_model_id(cursor, poll_id):
    """Get the community model ID and auto-create setting for a given poll."""
    cursor.execute("""
        SELECT "communityModelId", "autoCreateConstitution"
        FROM "Poll"
        JOIN "CommunityModel" ON "Poll"."communityModelId" = "CommunityModel".uid
        WHERE "Poll".uid = %s;
    """, (poll_id,))
    result = cursor.fetchone()
    if not result:
        return None, False
    return result[0], result[1]

def get_constitutionable_statements(cursor, poll_id):
    """Get the set of constitutionable statement IDs for a poll."""
    cursor.execute("""
        SELECT uid FROM "Statement"
        WHERE "pollId" = %s AND "isConstitutionable" = TRUE;
    """, (poll_id,))
    return {row[0] for row in cursor.fetchall()}

async def check_and_create_constitution(cursor, poll_id, pre_update_statements, model_id):
    """Check if constitution needs to be created and create if necessary."""
    # Get post-update constitutionable statements
    post_update_statements = get_constitutionable_statements(cursor, poll_id)
    
    # If there's a difference in the sets
    if pre_update_statements != post_update_statements:
        logger.info(f"Constitutionable statements changed for poll {poll_id}")
        logger.info(f"Pre-update: {pre_update_statements}")
        logger.info(f"Post-update: {post_update_statements}")
        
        # Send webhook to trigger constitution creation
        success = await send_webhook(model_id, poll_id)
        
        if success:
            logger.info(f"Successfully triggered constitution creation for model {model_id}")
        else:
            logger.error(f"Failed to trigger constitution creation for model {model_id}")

def main(poll_id=None, dry_run=False, force=False):
    """
    Main function to update GAC scores for a specific poll or all polls with changes.
    
    Args:
        poll_id: Optional specific poll ID to process
        dry_run: If True, don't actually update the database
        force: If True, process even if no new votes
    """
    # Set up logging
    setup_logging()
    logger.info(f"Starting GAC score update (version {VERSION})")
    logger.info(f"Parameters: poll_id={poll_id}, dry_run={dry_run}, force={force}")
    
    try:
        # Create database connection
        conn = create_connection()
        cursor = conn.cursor()
        
        # Verify poll exists if specified
        if poll_id:
            logger.info(f"Verifying poll exists: {poll_id}")
            if not verify_poll_exists(cursor, poll_id):
                error_msg = f"Poll with ID {poll_id} not found"
                logger.error(error_msg)
                return {"error": error_msg}
        
        # Get polls to process
        polls_to_process = []
        if poll_id:
            logger.info(f"Using specified poll: {poll_id}")
            polls_to_process = [poll_id]
        else:
            # If force flag is set, fetch all polls regardless of vote changes
            if force:
                logger.info("Force flag set, fetching all polls regardless of vote changes")
                polls_to_process = fetch_all_polls(cursor)
            else:
                logger.info("Fetching polls with recent vote changes")
                polls_to_process = fetch_polls_with_changes(cursor)
            
        if not polls_to_process:
            msg = "No polls need GAC score updates"
            logger.info(msg)
            return {"message": msg}
            
        logger.info(f"Processing {len(polls_to_process)} polls")
        
        # Process each poll
        for current_poll_id in polls_to_process:
            try:
                poll_id = current_poll_id
                logger.info(f"Processing poll ID: {poll_id}")
                
                # Get pre-update constitutionable statements
                pre_update_statements = get_constitutionable_statements(cursor, poll_id)
                
                statements, votes, participants = fetch_poll_data(cursor, poll_id)
                logger.info(f"Fetched data for poll ID: {poll_id}")

                if not statements or not votes or not participants:
                    logger.warning(f"Insufficient data for poll ID: {poll_id}, skipping.")
                    continue

                gac_scores = process_votes(participants, statements, votes)
                logger.info(f"Calculated GAC scores for poll ID: {poll_id}")

                # Get community model ID for the poll before updating statements
                model_id, auto_create_enabled = get_community_model_id(cursor, poll_id)
                
                if dry_run:
                    # Log what would have been updated in dry run mode
                    for statement in statements:
                        statement_id = statement['uid']
                        if statement_id in gac_scores:
                            gac_score_data = gac_scores[statement_id]
                            score = gac_score_data['score']
                            is_const = is_constitutionable(gac_score_data)
                            logger.info(f"[DRY RUN] Would update statement {statement_id}:")
                            logger.info(f"  - GAC Score: {score}")
                            logger.info(f"  - Is Constitutionable: {is_const}")
                else:
                    # Pass model_id to update_statements to avoid redundant database queries
                    changed_statements = update_statements(cursor, conn, statements, gac_scores, votes, model_id)
                    logger.info(f"Updated GAC scores for poll ID: {poll_id}")
                    logger.info(f"Changed statements: {len(changed_statements)} statements had score changes")

                    # Check if we need to create a constitution
                    # We no longer send GAC score updates via webhook, only constitution creation triggers
                    if model_id and auto_create_enabled:
                        # Get pre-update constitutionable statements
                        pre_update_statements = get_constitutionable_statements(cursor, poll_id)
                        # Get post-update constitutionable statements
                        post_update_statements = get_constitutionable_statements(cursor, poll_id)
                        
                        # If there's a difference in the sets
                        if pre_update_statements != post_update_statements:
                            logger.info(f"Constitutionable statements changed for poll {poll_id}")
                            logger.info(f"Pre-update: {pre_update_statements}")
                            logger.info(f"Post-update: {post_update_statements}")
                            
                            # Send webhook to trigger constitution creation only
                            webhook_success = asyncio.run(send_webhook(model_id, poll_id))
                            logger.info(f"Constitution creation webhook delivery {'succeeded' if webhook_success else 'failed'}")

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
        1.0  - Agree
       -1.0  - Disagree
        0.0  - Pass
        np.nan - No vote
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
    
    # Initialize matrix with np.nan
    vote_matrix = np.full((len(participant_ids), len(statement_ids)), np.nan, dtype=np.float64)
    
    for vote in votes:
        participant_id = vote['participantId']
        statement_id = vote['statementId']
        vote_value = vote['voteValue']
        
        row = participant_index.get(participant_id)
        col = statement_index.get(statement_id)
        
        if row is not None and col is not None:
            if vote_value == "AGREE":
                vote_matrix[row][col] = 1.0
            elif vote_value == "DISAGREE":
                vote_matrix[row][col] = -1.0
            elif vote_value == "PASS":
                vote_matrix[row][col] = 0.0
    
    # Convert to DataFrame for easier handling
    vote_df = pd.DataFrame(vote_matrix, index=participant_ids, columns=statement_ids)
    
    log_gac("Completed vote matrix generation", {
        'matrix_shape': vote_df.shape
    }, poll_id)
    
    return vote_df

def calculate_cosine_similarity(matrix):
    """Calculate pairwise cosine similarities between participants with realistic confidence scaling."""
    valid_votes_mask = (~np.isnan(matrix.values)).astype(np.float64)
    common_votes = valid_votes_mask @ valid_votes_mask.T
    
    vote_matrix_filled = np.nan_to_num(matrix.values, nan=0, copy=True)
    
    # Calculate normalized vote similarities
    norms = np.linalg.norm(vote_matrix_filled, axis=1)
    norms[norms == 0] = 1
    vote_matrix_normalized = vote_matrix_filled / norms[:, np.newaxis]
    vote_similarities = np.dot(vote_matrix_normalized, vote_matrix_normalized.T)
    
    # New confidence scaling that rises more quickly for realistic vote counts
    # Square root makes confidence rise more quickly initially while still smoothly approaching 1
    # Dividing by 5 means 5 common votes gives 0.5 confidence, 20 common votes gives 0.8 confidence
    confidence = np.sqrt(common_votes / (common_votes + 5))
    
    similarities = vote_similarities * confidence
    
    return pd.DataFrame(similarities, index=matrix.index, columns=matrix.index)

def cosine_impute(vote_matrix, n_neighbors):
    """Impute missing votes using cosine similarity with realistic confidence scaling."""
    similarity_matrix = calculate_cosine_similarity(vote_matrix)
    imputed_matrix = vote_matrix.copy()
    
    for participant in vote_matrix.index:
        missing_statements = vote_matrix.columns[vote_matrix.loc[participant].isna()]
        
        if len(missing_statements) == 0:
            continue
            
        correlations = similarity_matrix[participant].drop(participant)
        strongest_correlations = correlations[correlations.abs().nlargest(n_neighbors).index]
        
        for statement in missing_statements:
            similar_votes = vote_matrix.loc[strongest_correlations.index, statement].dropna()
            
            if not similar_votes.empty:
                weights = strongest_correlations[similar_votes.index].abs()
                
                if weights.sum() > 0:
                    # New confidence scaling that better respects strong signals
                    # Cube root provides faster initial growth while maintaining smooth scaling
                    confidence = np.cbrt(weights.sum() / (weights.sum() + 1))
                    
                    raw_imputed = np.average(
                        similar_votes * np.sign(strongest_correlations[similar_votes.index]), 
                        weights=weights
                    )
                    imputed_matrix.at[participant, statement] = raw_imputed * confidence
                else:
                    imputed_matrix.at[participant, statement] = 0
            else:
                imputed_matrix.at[participant, statement] = 0
    
    return imputed_matrix

def impute_missing_votes(vote_matrix):
    """
    Impute missing votes with adaptive neighbor selection using cosine similarity.
    Works for all group sizes.
    """
    n_participants = len(vote_matrix)
    logger.info(f"Imputing missing votes for {n_participants} participants")
    
    # Adaptive number of neighbors - for small groups, use n-1 neighbors
    n_neighbors = min(n_participants - 1, max(2, int(np.log2(n_participants))))
    logger.info(f"Using {n_neighbors} neighbors for imputation")
    
    try:
        imputed = cosine_impute(vote_matrix, n_neighbors)
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
        # Ensure data is float64 and handle NaN values
        data_array = np.array(data, dtype=np.float64)
        if np.isnan(data_array).any():
            data_array = np.nan_to_num(data_array, nan=0.0)
        
        # Initialize centroids using better sampling
        centroid_indices = np.random.choice(n_samples, k, replace=False)
        centroids = data_array[centroid_indices]
        
        # Handle case where initial centroids are identical
        if np.allclose(centroids, centroids[0]):
            logger.info("Initial centroids are identical, adding small random noise")
            centroids += np.random.normal(0, 1e-4, centroids.shape)
        
        prev_labels = None
        
        for iteration in range(max_iterations):
            # Calculate distances with numerical stability
            distances = np.zeros((n_samples, k))
            for i in range(k):
                diff = data_array - centroids[i]
                distances[:, i] = np.sum(np.square(diff), axis=1)
            
            # Assign clusters
            labels = np.argmin(distances, axis=1)
            
            # Check for convergence
            if prev_labels is not None and np.array_equal(labels, prev_labels):
                logger.info(f"KMeans converged after {iteration + 1} iterations")
                break
                
            prev_labels = labels.copy()
            
            # Update centroids with handling for empty clusters
            for i in range(k):
                cluster_points = data_array[labels == i]
                if len(cluster_points) > 0:
                    centroids[i] = cluster_points.mean(axis=0)
                else:
                    # If cluster is empty, reinitialize its centroid
                    logger.info(f"Reinitializing empty cluster {i}")
                    centroids[i] = data_array[np.random.choice(n_samples)]
        
        return labels.astype(np.int64)
        
    except Exception as e:
        logger.error(f"KMeans clustering failed: {e}")
        # Fallback to single cluster
        return np.zeros(n_samples, dtype=np.int64)

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
    n_participants = len(vote_matrix)
    logger.info(f"Starting clustering with {n_participants} participants")
    
    # Convert to numpy array and handle missing values
    data = vote_matrix.values
    data = np.nan_to_num(data)
    
    # For very small groups (< 4), use voting pattern to determine clusters
    if n_participants < 4:
        logger.info("Small group - clustering based on voting patterns")
        return perform_kmeans(data, k=2)  # Try splitting into 2 clusters
        
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

def update_statements(cursor, conn, statements, gac_scores, votes, model_id):
    # Create a set of statement IDs that have votes
    statements_with_votes = set(vote['statementId'] for vote in votes)
    
    # Track statements with changed GAC scores
    changed_statements = []

    for statement in statements:
        statement_id = statement['uid']
        if statement_id in statements_with_votes:
            if statement_id in gac_scores:
                gac_score_data = gac_scores[statement_id]
                is_const = is_constitutionable(gac_score_data)
                
                # Get current GAC score before update
                cursor.execute("""
                    SELECT "gacScore" FROM "Statement" WHERE uid = %s;
                """, (statement_id,))
                result = cursor.fetchone()
                old_score = result[0] if result else None
                new_score = gac_score_data['score']
                
                # Only track changes if the score actually changed
                if old_score != new_score:
                    changed_statements.append({
                        'statementId': statement_id,
                        'oldScore': old_score,
                        'newScore': new_score
                    })
                    
                    # Create SystemEvent record directly in the database
                    # Pass the model_id to avoid redundant database query                    
                    create_system_event(cursor, conn, statement_id, statement['pollId'], old_score, new_score, model_id)
                
                cursor.execute("""
                    UPDATE "Statement"
                    SET "gacScore" = %s,
                        "lastCalculatedAt" = NOW(),
                        "isConstitutionable" = %s
                    WHERE uid = %s;
                """, (new_score, is_const, statement_id))
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
    
    # Return the list of statements with changed GAC scores
    return changed_statements

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
    logger = setup_logging()
    logger.info("Starting vote processing")
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

def fetch_all_polls(cursor):
    query = """
        SELECT DISTINCT "Poll".uid
        FROM "Poll"
        JOIN "Statement" ON "Poll".uid = "Statement"."pollId"
        JOIN "Vote" ON "Statement".uid = "Vote"."statementId"
        WHERE NOT "Poll".deleted
        AND EXISTS (
            SELECT 1 FROM "Vote" v
            WHERE v."statementId" = "Statement".uid
        );
    """
    cursor.execute(query)
    columns = [col[0] for col in cursor.description]
    polls = [dict(zip(columns, row)) for row in cursor.fetchall()]
    return polls

def create_system_event(cursor, conn, statement_id, poll_id, old_score, new_score, community_model_id):
    """
    Create a SystemEvent record directly in the database for GAC score updates.
    
    This function directly creates GAC_SCORE_UPDATED events in the database rather than
    relying on the webhook system. This architectural decision simplifies the flow and
    reduces potential points of failure, while being appropriate for a proof-of-concept
    application that doesn't require commercial-grade separation of concerns.
    
    Args:
        cursor: Database cursor
        conn: Database connection
        statement_id: ID of the statement with updated GAC score
        poll_id: ID of the poll containing the statement
        old_score: Previous GAC score value (can be None)
        new_score: New GAC score value
        community_model_id: Optional model ID to avoid redundant database query
    """
    try:
        # Create a unique ID for the event
        event_id = f"clg{uuid.uuid4().hex[:21]}"  # Format similar to cuid but using uuid4
        
        # Create event metadata
        metadata = json.dumps({
            "pollId": poll_id,
            "oldScore": old_score,
            "newScore": new_score
        })
        
        # Insert the SystemEvent record - Fix column names to match Prisma schema
        cursor.execute("""
            INSERT INTO "SystemEvent" (
                "uid", "eventType", "resourceType", "resourceId", 
                "communityModelId", "actorId", "actorName", "isAdminAction", 
                "metadata", "createdAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW() AT TIME ZONE 'UTC')
        """, (
            event_id,
            "GAC_SCORE_UPDATED",
            "Statement",
            statement_id,
            community_model_id,
            "system",
            "Automated Process",
            True,
            metadata
        ))
        
        logger.info(f"Created GAC_SCORE_UPDATED SystemEvent for statement {statement_id}")
    except Exception as e:
        logger.error(f"Failed to create SystemEvent: {e}")
        # Add transaction rollback to prevent cascading errors
        try:
            conn.rollback()
            logger.info("Transaction rolled back after SystemEvent creation error")
        except Exception as rollback_error:
            logger.error(f"Failed to rollback transaction: {rollback_error}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Update GAC scores for statements')
    parser.add_argument('--poll-id', help='Specific poll ID to process')
    parser.add_argument('--dry-run', action='store_true', help='Show calculations without modifying data')
    parser.add_argument('--force', action='store_true', help='Force update all polls regardless of changes')
    args = parser.parse_args()
    
    main(poll_id=args.poll_id, dry_run=args.dry_run, force=args.force)