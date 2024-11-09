import os
from dotenv import load_dotenv
import logging
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

def main():
    parser = argparse.ArgumentParser(description='Run consensus service scripts locally')
    parser.add_argument('script', choices=['gac', 'votes'], 
                       help='Script to run: "gac" for GAC scores or "votes" for vote counts')
    args = parser.parse_args()

    # Verify DATABASE_URL is loaded (without printing sensitive info)
    db_url = os.getenv("DATABASE_URL")
    logger.info(f"DATABASE_URL is {'set' if db_url else 'not set'}")
    
    if args.script == 'gac':
        from api.update_gac_scores import main as gac_main
        gac_main()
    else:  # votes
        from api.update_vote_counts import main as votes_main
        result = votes_main()
        logger.info(result['message'])

if __name__ == "__main__":
    main() 