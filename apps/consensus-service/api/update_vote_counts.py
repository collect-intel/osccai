import logging
from http.server import BaseHTTPRequestHandler
import os
import sys
from datetime import datetime
import pg8000
from urllib.parse import urlparse
import json

VERSION = "1.0.0"
print(f"Starting update-vote-counts.py version {VERSION}")

# Configure logging
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

# Database connection settings
DATABASE_URL = os.getenv("DATABASE_URL")

def create_connection():
    url = urlparse(DATABASE_URL)
    conn = pg8000.connect(
        user=url.username,
        password=url.password,
        host=url.hostname,
        port=url.port or 5432,
        database=url.path[1:]
    )
    return conn

def get_statements_with_mismatched_counts(cursor):
    query = """
    WITH VoteCounts AS (
        SELECT 
            "statementId",
            SUM(CASE WHEN "voteValue" = 'AGREE' THEN 1 ELSE 0 END) as actual_agree_count,
            SUM(CASE WHEN "voteValue" = 'DISAGREE' THEN 1 ELSE 0 END) as actual_disagree_count,
            SUM(CASE WHEN "voteValue" = 'PASS' THEN 1 ELSE 0 END) as actual_pass_count
        FROM "Vote"
        GROUP BY "statementId"
    )
    SELECT 
        s.uid,
        s."agreeCount",
        s."disagreeCount",
        s."passCount",
        COALESCE(vc.actual_agree_count, 0) as actual_agree_count,
        COALESCE(vc.actual_disagree_count, 0) as actual_disagree_count,
        COALESCE(vc.actual_pass_count, 0) as actual_pass_count
    FROM "Statement" s
    LEFT JOIN VoteCounts vc ON s.uid = vc."statementId"
    WHERE 
        s."agreeCount" != COALESCE(vc.actual_agree_count, 0) OR
        s."disagreeCount" != COALESCE(vc.actual_disagree_count, 0) OR
        s."passCount" != COALESCE(vc.actual_pass_count, 0);
    """
    cursor.execute(query)
    return cursor.fetchall()

def update_statement_counts(cursor, statement_id, agree_count, disagree_count, pass_count):
    query = """
    UPDATE "Statement"
    SET "agreeCount" = %s,
        "disagreeCount" = %s,
        "passCount" = %s
    WHERE uid = %s;
    """
    cursor.execute(query, (agree_count, disagree_count, pass_count, statement_id))

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Connect to database
            conn = create_connection()
            cursor = conn.cursor()
            
            # Get statements with mismatched counts
            mismatched_statements = get_statements_with_mismatched_counts(cursor)
            
            updates = []
            for stmt in mismatched_statements:
                stmt_id = stmt[0]
                old_counts = {
                    "agree": stmt[1],
                    "disagree": stmt[2],
                    "pass": stmt[3]
                }
                new_counts = {
                    "agree": stmt[4],
                    "disagree": stmt[5],
                    "pass": stmt[6]
                }
                
                # Update the counts
                update_statement_counts(
                    cursor,
                    stmt_id,
                    new_counts["agree"],
                    new_counts["disagree"],
                    new_counts["pass"]
                )
                
                updates.append({
                    "statementId": stmt_id,
                    "oldCounts": old_counts,
                    "newCounts": new_counts
                })
                
                logger.info(
                    f"Updated statement {stmt_id} counts from "
                    f"({old_counts['agree']}, {old_counts['disagree']}, {old_counts['pass']}) to "
                    f"({new_counts['agree']}, {new_counts['disagree']}, {new_counts['pass']})"
                )
            
            conn.commit()
            cursor.close()
            conn.close()
            
            # Prepare response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                "message": "No statements needed updating." if not updates else f"Updated {len(updates)} statements.",
                "updates": updates
            }
            
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            logger.error(f"Error updating vote counts: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": str(e)
            }).encode())
        return

print("Finished update-vote-counts.py") 