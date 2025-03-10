#!/usr/bin/env python3
import http.server
import socketserver
import json
import os
import sys
from api.update_gac_scores import main as update_gac

PORT = 3001  # You can change this to any available port

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        # Handle the update-gac-scores endpoint
        if self.path == "/api/update-gac-scores":
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
                
                print(f"Triggering GAC update for poll: {poll_id}")
                
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
                print(f"Error processing GAC update: {str(e)}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": f"Internal server error: {str(e)}"
                }).encode())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Not found"
            }).encode())

def main():
    try:
        # Load environment variables from .env.local
        with socketserver.TCPServer(("", PORT), RequestHandler) as httpd:
            print(f"Server running at http://localhost:{PORT}")
            print(f"Available endpoints:")
            print(f"  POST /api/update-gac-scores")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server")
        sys.exit(0)

if __name__ == "__main__":
    main() 