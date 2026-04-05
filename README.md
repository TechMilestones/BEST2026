# Telemetry Analysis System and 3D Visualization of UAV Flight Logs

## Introduction

In modern unmanned aviation, the ability to analyze flight data in detail is critical for ensuring safety, optimizing performance, and diagnosing systems. Beyond civilian applications, drones have also become a staple of modern warfare, making tools for sensor data analysis even more vital. This project is dedicated to developing tools for processing, analyzing, and visualizing telemetry received from unmanned aerial vehicles

## Setup

This project offerst docker-compose setup but for enthusiasts
there is also a manual setup.


### Docker Setup

**Prerequisites**

- Docker
- Docker Compose

**Setup**

```bash
git clone https://github.com/TechMilestones/BEST2026.git
cd BEST2026/test
docker compose up -d
```

**Usage**

The server is available at `http://localhost:3000`.

### Manual Setup

**Prerequisites**

- Go 1.25+
- Python 3.10+
- Node.js 22+

**Setup**

```bash
# Clone the repository
git clone https://github.com/TechMilestones/BEST2026.git

# Build and run the go microservice
go mod download
cd cmd/parser-ms
go build -o server
./server

# Build and preview the vite server
npx vite build
npx vite preview

# Run the python server
pip install -r requirements.txt
python3 server.py
```

**Usage**

The server is available at `http://localhost:3000`.

## Architecture

The system is architected as a **Polyglot Data Pipeline**, prioritizing specialized toolchains to maximize performance and numerical integrity at each processing stage.

### 1. High-Performance Ingestion & Normalization (Go)
*   **Decision:** Go was selected to handle the binary log ingestion and initial parsing layer.
*   **Rationale:** Leveraging Go's efficient I/O primitives ensures high-throughput processing of large `.BIN` files. This service acts as an **Anti-Corruption Layer**, decoupling the raw Ardupilot DataFlash format from the rest of the stack by normalizing telemetry into a stable JSON contract.
*   **Strategy:** Rather than reinventing binary parsing, we leveraged and extended existing tooling (`go-dataflash`) by contributing a standardized interface, ensuring a robust and community-aligned foundation.

### 2. Numerical Analysis & Sensor Fusion (Python)
*   **Decision:** A dedicated Python service manages all telemetry calculations using the NumPy/SciPy stack.
*   **Rationale:** Telemetry visualization requires more than simple interpolation. We implemented a **Signal Processing Pipeline** featuring a 2nd-order Butterworth low-pass filter to mitigate IMU noise and trapezoidal integration for velocity estimation. This ensures the visualization reflects physical flight dynamics rather than raw sensor jitter.

### 3. Declarative 3D Visualization (React & Three.js)
*   **Decision:** The frontend utilizes React Three Fiber (R3F) for the 3D rendering engine.
*   **Rationale:** By using a declarative approach to 3D, the flight scene becomes a **pure function of the telemetry data stream**. This eliminates imperative synchronization bugs and allows the drone’s orientation and flight trail to stay perfectly synchronized with the playback timeline.

### 4. Decoupled Service Orchestration (Docker)
*   **Decision:** Deployment is orchestrated via Docker Compose to manage service boundaries.
*   **Rationale:** This architecture ensures that the parsing, analysis, and visualization layers can scale or be updated independently. It provides a "plug-and-play" environment for developers and data scientists to iterate on flight algorithms without modifying the core ingestion logic.

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

## 6. Strategic Roadmap (Phase 2)

While the current architecture provides a robust Proof of Value, the following strategic upgrades are planned for production hardening:

1.  **Strict Data Contracts (Protobufs):** Transitioning from JSON to Protocol Buffers to enforce strict schema validation across Go, Python, and TypeScript, eliminating manual field synchronization.
2.  **Advanced Sensor Fusion (EKF):** Implementation of an **Extended Kalman Filter** in the Science Layer to fuse GPS and IMU data more tightly, providing better state estimation during signal loss.
3.  **Real-time Streaming:** Leveraging the Go Gateway's concurrency model to support real-time telemetry streaming via WebSockets, in addition to batch file processing.
4.  **Harden Parser Integration:** Replacing unchecked type assertions in the Go parsing layer with a robust validation middleware to handle malformed binary logs gracefully.

---

## 7. Diagrams

Visual documentation of the system architecture can be found in `docs/diagrams/`:
*   **User Interaction Flow:** `user_interaction.puml`
*   **Data Pipeline Components:** `data_pipeline.puml`

