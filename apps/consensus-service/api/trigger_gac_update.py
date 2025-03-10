import json
import os
import logging
from http.server import BaseHTTPRequestHandler
from update_gac_scores import main as update_gac

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('[%(levelname)s] %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Check for API key if configured
        api_key = os.environ.get('API_KEY')
        if api_key:
            request_key = self.headers.get('X-API-Key')
            if not request_key or request_key != api_key:
                self.send_response(401)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Unauthorized: Invalid or missing API key"
                }).encode())
                return

        # Get request body
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(post_data)
            poll_id = data.get('pollId')
            force = data.get('force', False)
            
            if not poll_id:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Missing required parameter: pollId"
                }).encode())
                return
            
            logger.info(f"Triggering GAC update for poll: {poll_id}")
            
            # Run the GAC update
            result = update_gac(poll_id=poll_id, force=force)
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "message": f"GAC update triggered for poll: {poll_id}",
                "result": result
            }).encode())
            
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Invalid JSON in request body"
            }).encode())
        except Exception as e:
            logger.error(f"Error processing GAC update: {str(e)}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": f"Internal server error: {str(e)}"
            }).encode()) 