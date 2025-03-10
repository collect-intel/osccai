#!/usr/bin/env python3
import http.server
import socketserver
import json
import os
import sys
from api.update_gac_scores import handler as GacHandler
import logging

PORT = 6000 # You can change this to any available port

# Set up logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        # Handle the update-gac-scores endpoint
        if self.path == "/api/update-gac-scores":
            # Use the handler from update_gac_scores.py
            gac_handler = GacHandler(self.request, self.client_address, self.server)
            gac_handler.do_POST()
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Not found"
            }).encode())

    def do_GET(self):
        # Also handle GET requests to the same endpoint
        if self.path == "/api/update-gac-scores":
            gac_handler = GacHandler(self.request, self.client_address, self.server)
            gac_handler.do_GET()
        else:
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

if __name__ == "__main__":
    main() 