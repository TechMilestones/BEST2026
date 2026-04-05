# Python Server

A lightweight HTTP service for processing flight telemetry data.

The service accepts raw telemetry arrays (`att`, `imu`, `gps`), prepares data for 3D visualization, and returns:
- a time series for trajectory and speed visualization;
- aggregated flight metrics.

## What this service does

At processing time, it performs:
- input normalization into DataFrames;
- sampling frequency estimation (logged to console);
- GPS outlier cleanup;
- `roll/pitch/yaw` to quaternion conversion;
- IMU-based velocity estimation (with filtering and integration);
- timestamp alignment between velocity and GPS data;
- flight metric calculation.

## API

### `GET /`
Health check endpoint.

Response:
- `200 OK`
- `Telemetry API is Alive!`

### `POST /api/process`
Accepts telemetry arrays in JSON format and returns processed data.

Request format:

```json
{
  "att": [
    {
      "time_us": 50654626,
      "roll": 1.51,
      "pitch": 70.11,
      "yaw": 359.90
    }
  ],
  "imu": [
    {
      "instance": 0,
      "time_us": 50814626,
      "acc_x": -0.001,
      "acc_y": -0.001,
      "acc_z": -0.001
    }
  ],
  "gps": [
    {
      "time_us": 50814626,
      "lat": -35.3632649,
      "lng": 149.1652374,
      "alt": 584.85
    }
  ]
}
```

Response:

```json
{
  "visualization_data": [
    {
      "TimeUS": "...",
      "v_x": "...",
      "v_y": "...",
      "v_z": "...",
      "v_mag": "...",
      "q_x": "...",
      "q_y": "...",
      "q_z": "...",
      "q_w": "...",
      "x_m": "...",
      "y_m": "...",
      "z_m": "..."
    }
  ],
  "metrics": {
    "total_distance": 0.0,
    "max_horizontal_speed": 0.0,
    "max_vertical_speed": 0.0,
    "duration_s": 0.0,
    "max_acceleration": 0.0,
    "max_climb": 0.0
  }
}
```

Errors:
- `404` for unknown endpoints;
- `500` for runtime exceptions during parsing or calculations.

## Run locally

Prerequisites:
- Python 3.9+;
- dependencies from `requirements.txt`.

Commands:

```bash
cd python-server
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
python server.py
```

By default, the service listens on port `8888`.
You can change it using the `PYTHON_SERVICE_PORT` environment variable (or via `ports.env`).

## Run with Docker Compose

In this project, the service runs as `python-server` and is typically called by the Go service inside the Docker network.

Start command (dev config):

```bash
docker compose -f compose.yml -f compose.dev.local.yml up -d --build
```

In development mode, `dev_autoreload.py` is used to restart the Python process when `.py` files change.

## Manual checks

After running `python server.py` locally:

```bash
curl http://127.0.0.1:8888/
```

Test `POST /api/process` (`payload.json` should follow the request structure shown above):

```bash
curl -X POST http://127.0.0.1:8888/api/process \
  -H "Content-Type: application/json" \
  -d @payload.json
```

## Data flow

In the default flow:
- frontend uploads a `.BIN` file to the Go service (`parser-ms`);
- Go parses the log and forwards JSON to Python (`/api/process`);
- Python returns processed data to Go, and Go returns it to the frontend.

So the Python service does not process `.BIN` files directly. It processes already-parsed JSON.

## Data notes

- `TimeUS` is in microseconds.
- Fields inside `visualization_data` are serialized as strings.
- Metric values are returned as numbers.

## Common issues

1. `Endpoint not found`
Cause: incorrect path.
Fix: make sure you call `POST /api/process`.

2. `500` with an error message
Cause: invalid JSON or empty/corrupted telemetry arrays.
Fix: validate `att`, `imu`, `gps` structure and field types.

3. Go service cannot reach Python
Cause: services are not on the same network, or host/port mismatch.
Fix: in Docker, use `PYTHON_SERVICE_HOST=python-server` and `PYTHON_SERVICE_PORT=8888`.