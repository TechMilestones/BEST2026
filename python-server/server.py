from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from dotenv import load_dotenv
import os

from src.handlers import get_all_data

load_dotenv("../ports.env")
PORT = int(os.getenv("PYTHON_SERVICE_PORT", 8888))


# Temp function
def process_data(input_json):
    result = {
        "status": "success",
        "visualisation_data": ["DATA_FOR_3D_VIZ"],
        "metrics": {
            "total_distance": 1234.56,
            "max_acceleration": 9.81,
            "max_climb": 100.0,
            "duration_s": 300.0,
            "max_speed_horiz": 25.4,
        },
    }
    return result


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
            self.wfile.write(b"Telemetry API is Alive!")

    def do_POST(self):
        try:
            content_length = int(self.headers["Content-Length"])
            body = self.rfile.read(content_length)

            if self.path == "/process":
                data = json.loads(body)
                result = process_data(data)
                self._set_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))

            elif self.path == "/test":
                data = json.loads(body)
                data = get_all_data()
                self._set_headers()
                self.wfile.write(json.dumps(data).encode("utf-8"))

            else:
                self.send_error(404, "Endpoint not found")

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8888), SimpleHandler)
    print("Server running on http://0.0.0.0:8888")
    server.serve_forever()

