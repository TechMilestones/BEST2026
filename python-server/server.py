from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from src.handlers import get_all_data 


def read_json_file(filename):
    with open(filename, "r", encoding="utf-8") as f:
        return json.load(f)

class SimpleHandler(BaseHTTPRequestHandler):
    def _set_headers(self, content_type='application/json'):
        self.send_response(200)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*') 
        self.end_headers()

    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Telemetry API is Alive!')

    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            
   
            if self.path == '/process':
                data = json.loads(body)
                result = get_all_data(data)

                self._set_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))

  
            elif self.path == '/test':
                data = json.loads(body)
                data = get_all_data()
                self._set_headers()
                self.wfile.write(json.dumps(data).encode('utf-8'))
            
            else:
                self.send_error(404, "Endpoint not found")

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))


if __name__ == '__main__':
    server = HTTPServer(('localhost', 8888), SimpleHandler)
    print('🚀 Server running on http://localhost:8888')
    server.serve_forever()