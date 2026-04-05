# Telemetry Analysis System and 3D Visualization of UAV Flight Logs

![log seeking](./visual.gif "Flight demonstration")

---

## Introduction

In modern unmanned aviation, the ability to analyze flight data in detail is critical for ensuring safety, optimizing performance, and diagnosing systems. Beyond civilian applications, drones have also become a staple of modern warfare, making tools for sensor data analysis even more vital. This project is dedicated to developing tools for processing, analyzing, and visualizing telemetry received from unmanned aerial vehicles.

---

## Setup

This project offers a Docker Compose setup. For enthusiasts, there is also a manual setup available.

### Docker Setup

**Prerequisites**
* Docker
* Docker Compose

**Steps**
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
The interactive web dashboard is available at `http://localhost:3000`.

### Manual Setup

**Prerequisites**
* Go 1.25+
* Python 3.10+
* Node.js 22+

**Steps**
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

---

## Environment Configuration

The system uses environment variables to maintain decoupling between the polyglot services.

| Variable | Services | Default | Description |
| :--- | :--- | :--- | :--- |
| `GO_SERVICE_PORT` | Parser | `5000` | Internal port the Go gateway listens on. |
| `PYTHON_SERVICE_HOST` | Parser | `localhost` | Hostname of the Python analysis service. |
| `PYTHON_SERVICE_PORT` | Parser, Python | `8888` | Port for Go-Python communication. |
| `CORS_ALLOW_ORIGIN` | Parser | `*` | Security policy for allowed frontend domains. |
| `VITE_API_URL` | Frontend | `http://localhost:5000` | URL of the Go Gateway used by the React client. |

---

## Architecture

The system operates as an interactive web application where users can upload a log file and immediately view the results. 

We chose a polyglot stack for this application due to 2 main reasons:
 - to develop a working prototype as quickly as possible using best fiting technologies.
 - let every developer contribute to the project as conveniently as possible.

**Go** manages the high-performance processing of binary Ardupilot log files. It parses the telemetry, extracts GPS and IMU sensor messages, identifies sampling frequencies, and constructs structured data arrays. 

**Python** acts as the core analytics engine. It computes the final mission metrics directly from the structured data recieved from go parser. These metrics include maximum horizontal and vertical speed, maximum acceleration, maximum altitude gain, and total flight duration.

**React and Three.js** power the 3D visualization dashboard. We use a HashRouter to ensure universal static compatibility across any file server. We strictly adhere to a no-data-collection policy, ensuring uploaded files are not stored on our servers.

---

## Mathematical & Scientific Foundations

To ensure the 3D visualization accurately reflects physical reality, the Science Layer (Python) is grounded in several core mathematical concepts and strict SI unit consistency. 

**Geodetic Calculations (Haversine & ENU Projection)**
To estimate the traveled distance between GPS points, we utilize the Haversine formula based on a spherical Earth model with a radius of 6,371,000 meters. This trigonometric approach provides superior numerical stability over Euclidean distance for short to medium ranges.
For the 3D rendering, we project these global WGS-84 coordinates into a local Cartesian ENU (East-North-Up) system. This local tangent-plane approximation maps longitude and latitude differences directly into meters relative to the launch point, avoiding the computationally heavy full ECEF conversion while remaining highly accurate for kilometer-scale trajectories.

**Signal Conditioning & Orientation**
UAV telemetry is inherently noisy. We merge data from dual IMUs by averaging them to reduce random noise before applying a 2nd-order Butterworth low-pass filter with a 4 Hz cutoff. This specific filter offers smooth passband behavior, mitigating the high-frequency vibration noise that would otherwise cause "random walk" drift during acceleration integration. For spatial orientation, we rely entirely on quaternions rather than Euler angles. Quaternions provide superior numerical stability, cleaner interpolation, and mathematically prevent gimbal lock during intermediate frame conversions.

**Velocity Estimation via Trapezoidal Integration**
Once the filtered acceleration is rotated into the Earth frame, we apply a strict gravity vector compensation of 9.80665 m/s² and subtract the initial startup bias. To estimate velocity, we utilize the trapezoidal rule for numerical integration. This method is mathematically more robust than explicit Euler integration across non-uniform time steps and maintains computational efficiency for streaming telemetry.

For a deeper dive into the specific formulas, algorithmic thresholds, and physical assumptions used in our pipeline, please refer to our [Detailed Mathematical Rationale](./python-server/MATHEMATICAL_RATIONALE.md).

---

## Feature Roadmap (Phase 2)

While the current architecture provides a working prototype, we have several strategic upgrades:

* **Strict Data Contracts:** Transitioning to Protocol Buffers for strict schema validation.
* **Advanced Sensor Fusion:** Implementing an Extended Kalman Filter (EKF) for tighter GPS and IMU data fusion.

---

## Diagrams

Visual documentation of the system architecture can be found in `docs/diagrams/`.
