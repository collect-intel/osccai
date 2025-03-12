#!/usr/bin/env python3
import http.server
import socketserver
import json
import os
import sys
import traceback
from api.update_gac_scores import handler as GacHandler, main as gac_main
import logging

PORT = 6000 # You can change this to any available port

# Set up logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_request(self, code='-', size='-'):
        logger.info(f'"{self.requestline}" {code} {size}')
    
    def log_error(self, format, *args):
        logger.error(f"{format % args}")
    
    def do_POST(self):
        logger.info(f"Received POST request to {self.path}")
        # Handle the update-gac-scores endpoint
        if self.path == "/api/update-gac-scores":
            try:
                # Log request headers
                logger.info("Request headers:")
                for header, value in self.headers.items():
                    logger.info(f"  {header}: {value}")
                
                # Get request body
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length).decode('utf-8')
                logger.info(f"Request body: {post_data}")
                
                # Parse the JSON data
                try:
                    data = json.loads(post_data)
                    poll_id = data.get('pollId')
                    force = data.get('force', False)
                    
                    if not poll_id:
                        logger.warning("Missing required parameter: pollId")
                        self.send_response(400)
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "error": "Missing required parameter: pollId"
                        }).encode())
                        return
                    
                    logger.info(f"Calling gac_main with poll_id={poll_id}, force={force}")
                    
                    # Call the main function directly
                    result = gac_main(poll_id=poll_id, force=force)
                    
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
                    
                except json.JSONDecodeError as e:
                    logger.error(f"JSON decode error: {str(e)}")
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "error": "Invalid JSON in request body"
                    }).encode())
                    
            except Exception as e:
                logger.error(f"Error in do_POST: {str(e)}")
                logger.error(traceback.format_exc())
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": f"Internal server error: {str(e)}"
                }).encode())
        else:
            logger.info(f"Path not found: {self.path}")
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Not found"
            }).encode())

    def do_GET(self):
        logger.info(f"Received GET request to {self.path}")
        # Also handle GET requests to the same endpoint
        if self.path == "/api/update-gac-scores":
            try:
                # Call the main function directly without parameters to process all polls
                logger.info("Calling gac_main without parameters to process all polls")
                result = gac_main()
                
                logger.info(f"GAC update completed with result: {result}")
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": "GAC update triggered for all polls",
                    "result": result
                }).encode())
                
            except Exception as e:
                logger.error(f"Error in do_GET: {str(e)}")
                logger.error(traceback.format_exc())
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": f"Internal server error: {str(e)}"
                }).encode())
        else:
            logger.info(f"Path not found: {self.path}")
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Not found"
            }).encode())

def main():
    try:
        httpd = socketserver.TCPServer(("", PORT), RequestHandler)
        logger.info(f"Server running at http://localhost:{PORT}")
        logger.info(f"Available endpoints:")
        logger.info(f"  POST /api/update-gac-scores - Update GAC scores for a specific poll")
        logger.info(f"  GET /api/update-gac-scores - Update GAC scores for all polls")
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("\nShutting down server")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main() 