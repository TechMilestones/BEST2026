# Telemetry Analysis System and 3D Visualization of UAV Flight Logs

---

## Introduction

---

## Setup

This project offerst docker-compose setup but for enthusiasts
there is also a manual setup.


### Docker Setup

**Prerequisites**

- Docker
- Docker Compose

**Setup**

1. **Clone the repository**
   ```bash
   git clone https://github.com/TechMilestones/BEST2026.git
   cd BEST2026/test
   ```

2. **Configure Environment Variables**
   The project relies on specific environment variables to bridge the Go, Python, and React services. See the [Environment Configuration](#environment-configuration) section for details. Please make sure you configured them correctly in compose.yml

3. **Launch Services**
   ```bash
   docker compose up -d
   ```

**Usage**

The dashboard is available at `http://localhost:3000`.

### Manual Setup

**Prerequisites**

- Go 1.25+
- Python 3.10+
- Node.js 22+

**Setup**

1. **Clone the repository**
   ```bash
   git clone https://github.com/TechMilestones/BEST2026.git
   ```

2. **Configure Environment Variables**
   Ensure correct environment variables are set in and `.env` and `frontend/.env` files. Once again, see the [Environment Configuration](#environment-configuration) section for details.

3. **Build and Run Microservice**
   ```bash
   # This action MUST be performed in project root due to relative env imports
   go mod download
   cd cmd/parser-ms
   go build -o server
   ./server
   ```

4. **Build and Preview Frontend**
   ```bash
   # This action MUST be performed in frontend/ due to relative env and vite config imports
   npx vite build
   npx vite preview
   ```

5. **Run Python Server**
   ```bash
   # Really, doesn't matter where you run this, but a personal advice would be to use a virtual environment
   pip install -r requirements.txt
   python3 server.py
   ```


**Usage**

The server is available at `http://localhost:3000`.


---

## Environment Configuration

The system uses environment variables to maintain decoupling between the polyglot services.

### Core Variables

| Variable | Depending Services | Default | Description |
| :--- | :--- | :--- | :--- |
| `GO_SERVICE_PORT` | Parser | `5000` | The internal port the Go gateway listens on. |
| `PYTHON_SERVICE_HOST` | Parser | `localhost` | The hostname of the Python analysis service. |
| `PYTHON_SERVICE_PORT` | Parser, Python | `8888` | The port for communication between Go and Python. |
| `CORS_ALLOW_ORIGIN` | Parser | `*` | Security policy for allowed frontend domains. |
| `VITE_API_URL` | Frontend | `http://localhost:5000` | The URL of the Go Gateway used by the React client. |

### Setup Steps for Correctness

1. **Service Discovery:** Ensure `PYTHON_SERVICE_HOST` is set correctly. 
   - **In Docker:** It must match the service name in `compose.yml` (e.g., `python-server`).
   - **Manual Setup:** Set it to `localhost` if both services are running on the same machine.

2. **Frontend-Gateway Link:** The `VITE_API_URL` in the frontend must point to the *exposed* port of the Go service. If you are running Docker with the custom port configuration in `compose.yml`, pay close attention to it.

3. **CORS Configuration:** In a production environment, change `CORS_ALLOW_ORIGIN` from `*` to your specific frontend domain to prevent unauthorized API access.

---

## Architecture

The system is architected as a **Polyglot Data Pipeline**, prioritizing specialized toolchains to maximize performance and numerical integrity at each processing stage.

### 1. High-Performance Ingestion & Normalization (Go)
   Go was selected to handle the binary log ingestion and initial parsing layer.
   Go's efficient I/O primitives ensures high-throughput processing of large `.BIN` files. This service acts as an **Anti-Corruption Layer**, decoupling the raw Ardupilot DataFlash format from the rest of the stack by normalizing telemetry into a stable JSON-serializable structure.
   Rather than writing out own binary parsing solution, we utilized and extended existing tooling (`go-dataflash`) by contributing a standardized interface, ensuring a robust and community-aligned foundation.

### 2. Numerical Analysis & Sensor Fusion (Python)
   A dedicated Python service manages all telemetry calculations using the NumPy/SciPy stack.
   Telemetry visualization requires more than simple interpolation. We implemented a **Signal Processing Pipeline** featuring a 2nd-order Butterworth low-pass filter to mitigate IMU noise and trapezoidal integration for velocity estimation. This ensures the visualization reflects physical flight dynamics rather than raw sensor jitter.

### 3. Declarative 3D Visualization (React & Three.js)
   The frontend utilizes React Three Fiber (R3F) for the 3D rendering engine.
*   **Rationale:** By using a declarative approach to 3D, the flight scene becomes a **pure function of the telemetry data stream**. This eliminates imperative synchronization bugs and allows the drone’s orientation and flight trail to stay perfectly synchronized with the playback timeline.

### 4. Strict No Data Collection Policy
   The project does not collect any data from the user other than the uploaded `.BIN` file and doesn't even store it on the server.
   Current global privacy landscape is concerning enough, so we decided to honour users rights privacy and not collect any data.

---

## 5. Mathematical & Scientific Foundations

To ensure the 3D visualization accurately reflects physical reality rather than raw sensor noise, the **Science Layer (Python)** implements several critical algorithms:

### Signal Conditioning (Butterworth Filter)
UAV telemetry is inherently noisy due to motor vibrations. We apply a **2nd-order Butterworth low-pass filter** with a normalized cutoff frequency derived from the estimated sampling rate.
*   **Purpose:** Mitigates high-frequency noise in the Accelerometer data before integration.
*   **Impact:** Prevents "random walk" drift in velocity estimations.

### Velocity Estimation (Trapezoidal Integration)
Velocity is derived by integrating filtered linear acceleration across the Earth frame (rotated via attitude quaternions).
*   **Algorithm:** Trapezoidal rule integration on non-uniform time steps.
*   **Correction:** We apply a gravity vector compensation (9.80665 m/s²) and a baseline bias removal based on the first 50 samples of the flight.

### Geodetic Calculations (Haversine Formula)
Total flight distance is calculated using the **Haversine formula**, accounting for the Earth's curvature.
*   **Accuracy:** Superior to Euclidean distance for GPS coordinates, providing sub-meter accuracy over the flight trajectory.

---

## 6. Feature Roadmap (Phase 2)

While the current architecture provides a robust Proof of Value, the following strategic upgrades are planned for production hardening:

1.  **Strict Data Contracts (Protobufs):** Transitioning from JSON to Protocol Buffers to enforce strict schema validation across Go, Python, and TypeScript, eliminating manual field synchronization.
2.  **Advanced Sensor Fusion (EKF):** Implementation of an **Extended Kalman Filter** in the Science Layer to fuse GPS and IMU data more tightly, providing better state estimation during signal loss.
3.  **Real-time Streaming:** Leveraging the Go Gateway's concurrency model to support real-time telemetry streaming via WebSockets, in addition to batch file processing.
4.  **Harden Parser Integration:** Replacing unchecked type assertions in the Go parsing layer with a robust validation middleware to handle malformed binary logs gracefully.

---

## 7. Diagrams

Visual documentation of the system architecture can be found in `docs/diagrams/`.
There are also images of the diagrams rendered in the `docs/diagrams/` directory under the same name as original `.puml` files.

