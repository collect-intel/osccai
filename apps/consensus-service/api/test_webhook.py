import asyncio
import os
from webhook_utils import send_webhook
from update_gac_scores import setup_logging
from dotenv import load_dotenv
import pathlib

logger = setup_logging()

def load_env():
    """Load environment variables from .env.local or .env"""
    env_dir = pathlib.Path(__file__).parent.parent
    local_env = env_dir / '.env.local'
    default_env = env_dir / '.env'
    
    if local_env.exists():
        logger.info("Loading .env.local")
        load_dotenv(local_env)
    elif default_env.exists():
        logger.info("Loading .env")
        load_dotenv(default_env)
    else:
        logger.warning("No .env file found")

async def test_webhook():
    """Test webhook functionality by sending a test event."""
    # You can replace these with actual IDs from your database
    test_model_id = "test_model_123"
    test_poll_id = "test_poll_456"
    
    logger.info(f"Testing webhook with model_id={test_model_id}, poll_id={test_poll_id}")
    
    success = await send_webhook(test_model_id, test_poll_id)
    
    if success:
        logger.info("✅ Webhook test successful!")
    else:
        logger.error("❌ Webhook test failed!")

def main():
    """Main function to run the webhook test."""
    # Load environment variables
    load_env()
    
    # Check required environment variables
    required_vars = ['WEBHOOK_URL', 'WEBHOOK_SECRET']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        return
        
    logger.info(f"Using webhook URL: {os.getenv('WEBHOOK_URL')}")
    
    # Run the async test
    asyncio.run(test_webhook())

if __name__ == "__main__":
    main() 