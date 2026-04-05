from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from dotenv import load_dotenv
import os

from src.handlers import get_all_data

load_dotenv("../ports.env")
PORT = int(os.getenv("PYTHON_SERVICE_PORT", 8888))


class SimpleHandler(BaseHTTPRequestHandler):
    def _set_headers(self, content_type="application/json"):
        self.send_response(200)
        self.send_header("Content-type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

    def do_GET(self):
        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            print("Telemetry API is Alive!")
            self.wfile.write(b"Telemetry API is Alive!")

    def do_POST(self):
        try:
            content_length = int(self.headers["Content-Length"])
            body = self.rfile.read(content_length)

            if self.path == "/api/process":
                data = json.loads(body)
                result = get_all_data(data)

                self._set_headers()
                print("Successfully processed data")
                self.wfile.write(json.dumps(result).encode("utf-8"))

            else:
                print("Endpoint not found")
                self.send_error(404, "Endpoint not found")

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            print("Error", e)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0',  PORT), SimpleHandler)
    print(f'Server running on http://0.0.0.0:{PORT}')
    server.serve_forever()

