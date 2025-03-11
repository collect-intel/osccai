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

async def send_webhook(model_id: str, poll_id: str, changed_statements: list = None) -> bool:
    """
    Send webhook to notify about changes in constitutionable statements.
    Returns True if webhook was successfully delivered.
    
    Args:
        model_id: The community model ID
        poll_id: The poll ID
        changed_statements: Optional list of statements with changed GAC scores
    """
    webhook_url = os.getenv('WEBHOOK_URL')
    webhook_secret = os.getenv('WEBHOOK_SECRET')
    
    logger.info(f"Preparing to send webhook for model {model_id}, poll {poll_id}")
    logger.info(f"WEBHOOK_URL is {'set' if webhook_url else 'NOT SET'}")
    logger.info(f"WEBHOOK_SECRET is {'set' if webhook_secret else 'NOT SET'}")
    
    if not webhook_url or not webhook_secret:
        logger.error("Missing required environment variables: WEBHOOK_URL or WEBHOOK_SECRET")
        return False
        
    # Determine event type based on whether we have GAC score changes
    event_type = "gac_scores_updated" if changed_statements else "statements_changed"
    logger.info(f"Using event type: {event_type}")
    
    payload = {
        "event": event_type,
        "modelId": model_id,
        "pollId": poll_id,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Include changed statements data if provided
    if changed_statements:
        payload["changedStatements"] = changed_statements
        logger.info(f"Including {len(changed_statements)} changed statements in payload")
    
    try:
        # Create signature
        signature = create_signature(payload, webhook_secret)
        logger.info(f"Created signature: {signature[:10]}...")
        
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