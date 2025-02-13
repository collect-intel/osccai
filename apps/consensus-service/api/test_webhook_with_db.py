import asyncio
import os
from webhook_utils import send_webhook
from update_gac_scores import setup_logging, create_connection
from dotenv import load_dotenv
import pathlib

logger = setup_logging()

def load_env():
    """Load environment variables from .env.local file"""
    env_dir = pathlib.Path(__file__).parent.parent
    local_env = env_dir / '.env.local'
    
    if not local_env.exists():
        logger.error(".env.local not found")
        return False
    
    # Clear any existing environment variables that we care about
    for key in ['DATABASE_URL', 'WEBHOOK_URL', 'WEBHOOK_SECRET']:
        if key in os.environ:
            del os.environ[key]
            
    logger.info("Loading .env.local (local config)")
    load_dotenv(local_env)
    return True

async def test_webhook_with_db():
    """Test webhook functionality using real data from database."""
    try:
        # Create DB connection
        conn = create_connection()
        cursor = conn.cursor()
        
        # Get a real model and poll ID from the database
        cursor.execute("""
            SELECT p.uid as poll_id, p."communityModelId" as model_id
            FROM "Poll" p
            JOIN "CommunityModel" cm ON p."communityModelId" = cm.uid
            WHERE NOT p.deleted AND NOT cm.deleted
            LIMIT 1;
        """)
        
        result = cursor.fetchone()
        if not result:
            logger.error("No valid poll found in database")
            return
            
        poll_id, model_id = result
        
        logger.info(f"Testing webhook with real data:")
        logger.info(f"  Model ID: {model_id}")
        logger.info(f"  Poll ID: {poll_id}")
        
        success = await send_webhook(model_id, poll_id)
        
        if success:
            logger.info("✅ Webhook test successful!")
        else:
            logger.error("❌ Webhook test failed!")
            
    except Exception as e:
        logger.error(f"Error during test: {e}")
    finally:
        cursor.close()
        conn.close()

def main():
    """Main function to run the webhook test."""
    # Load environment variables from .env.local
    if not load_env():
        return
    
    # Check required environment variables
    required_vars = ['WEBHOOK_URL', 'WEBHOOK_SECRET', 'DATABASE_URL']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        return
        
    logger.info(f"Using webhook URL: {os.getenv('WEBHOOK_URL')}")
    logger.info(f"Using database URL: {os.getenv('DATABASE_URL')}")
    
    # Run the async test
    asyncio.run(test_webhook_with_db())

if __name__ == "__main__":
    main() 