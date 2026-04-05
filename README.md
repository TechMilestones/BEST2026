# Telemetry Analysis System and 3D Visualization of UAV Flight Logs

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

We chose a polyglot stack to develop a working prototype as quickly as possible.The system operates as an interactive web application where users can upload a log file and immediately view the results. 

Go manages the high-performance ingestion of binary Ardupilot log files. It parses the telemetry, extracts GPS and IMU sensor messages, identifies sampling frequencies, and constructs structured data arrays. 

Python acts as the core analytics engine. It computes the final mission metrics directly from the log file. These metrics include maximum horizontal and vertical speed, maximum acceleration, maximum altitude gain, and total flight duration.

React and Three.js power the 3D visualization dashboard. We use a HashRouter to ensure universal static compatibility across any file server. We strictly adhere to a no-data-collection policy, ensuring uploaded files are not stored on our servers.

---

## Mathematical & Scientific Foundations

The application builds an interactive tool to review the drone's spatial trajectory in 3D. The system mathematically converts global WGS-84 coordinates into a local Cartesian ENU system. The resulting 3D graph plots height on the third axis and dynamically colors the trajectory based on flight speed or elapsed time.

We guarantee kinematic accuracy through strict algorithmic implementations. The total traversed distance is calculated exclusively using the haversine formula. We derive velocity metrics from the acceleration arrays using trapezoidal integration. 

To handle the inherent motor vibration noise in UAV telemetry, we apply a 2nd-order Butterworth low-pass filter to the IMU data. We explicitly use quaternions for orientation instead of Euler angles to avoid gimbal lock. We also implement baseline bias removal to explain and compensate for double-integration errors.

---

## Feature Roadmap (Phase 2)

While the current architecture provides a working prototype, we have several strategic upgrades:

* **Strict Data Contracts:** Transitioning to Protocol Buffers for strict schema validation.
* **Advanced Sensor Fusion:** Implementing an Extended Kalman Filter (EKF) for tighter GPS and IMU data fusion.

---

## Diagrams

Visual documentation of the system architecture can be found in `docs/diagrams/`.
