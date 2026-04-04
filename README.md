# Telemetry Analysis System and 3D Visualization of UAV Flight Logs

## Introduction



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

The server is available at `http://localhost:5173`.

### Manual Setup

**Prerequisites**

- Go 1.25+
- Python 3.10+
- Node.js 18+

**Setup**

```bash
# Clone the repository
git clone https://github.com/TechMilestones/BEST2026.git
# Build the go microservice
go mod download
cd cmd/parser-ms
go build -o server
# Build the vite server
vite build
vite serve
# Run the python server
python3 server.py
# Run microservice
./server
```

**Usage**

The server is available at `http://localhost:5173`.
