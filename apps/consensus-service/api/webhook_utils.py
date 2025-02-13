import os
import json
import hmac
import hashlib
from datetime import datetime
import aiohttp
import logging

logger = logging.getLogger(__name__)

def create_signature(payload: dict, secret: str) -> str:
    """Create HMAC signature for webhook payload."""
    payload_str = json.dumps(payload)
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

async def send_webhook(model_id: str, poll_id: str) -> bool:
    """
    Send webhook to notify about changes in constitutionable statements.
    Returns True if webhook was successfully delivered.
    """
    webhook_url = os.getenv('WEBHOOK_URL')
    webhook_secret = os.getenv('WEBHOOK_SECRET')
    
    if not webhook_url or not webhook_secret:
        logger.error("Missing required environment variables: WEBHOOK_URL or WEBHOOK_SECRET")
        return False
        
    payload = {
        "event": "statements_changed",
        "modelId": model_id,
        "pollId": poll_id,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    try:
        # Create signature
        signature = create_signature(payload, webhook_secret)
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature
        }
        
        # Send webhook with retries
        async with aiohttp.ClientSession() as session:
            for attempt in range(3):  # Try up to 3 times
                try:
                    async with session.post(
                        webhook_url,
                        json=payload,
                        headers=headers,
                        timeout=10  # 10 second timeout
                    ) as response:
                        if response.status == 200:
                            logger.info(f"Webhook delivered successfully for model {model_id}")
                            return True
                        else:
                            error_data = await response.json()
                            logger.error(f"Webhook delivery failed (attempt {attempt + 1}): {error_data}")
                            
                except aiohttp.ClientError as e:
                    logger.error(f"Webhook request failed (attempt {attempt + 1}): {e}")
                    if attempt == 2:  # Last attempt
                        return False
                    continue
                    
        return False
        
    except Exception as e:
        logger.error(f"Error sending webhook: {e}")
        return False 