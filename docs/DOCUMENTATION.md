# DataFlash to CSV Parser - Architectural Documentation

This document outlines the design decisions, architectural patterns, and interface specifications for the Go-based DataFlash log parser.

## 1. Objective
To provide a high-performance, scriptable utility that extracts synchronized flight analytics (`GPS`, `IMU`, `ATT`) from Ardupilot binary logs into a format suitable for Python-based analysis and 3D visualization.

## 2. Interface Specification

### CLI Usage
The script is designed to be called as a standalone executable or via `go run`.
```bash
./main <path_to_binary_log1> <path_to_binary_log2> ...
```

### Input
- One or more `.BIN` files (Ardupilot DataFlash format).

### Output
- **Files**: Separate `.csv` files for each sensor and instance (e.g., `00000001_imu_0.csv`, `00000001_imu_1.csv`).
- **Stdout**: A newline-separated list of all generated CSV file paths.
- **Stderr**: Human-readable logs, status updates, and error messages.

## 3. Architectural Decisions

### A. Dynamic Instance Mapping (Multi-IMU Support)
- **Decision**: Instead of merging data from multiple sensors of the same type, the script dynamically creates separate files based on the `Instance` (`I`) field.
- **Rationale**: Ardupilot often logs multiple IMUs at high frequencies. Merging them into a single file results in duplicated timestamps and interleaved data, which complicates downstream analysis (like filtering or FFT). Separation ensures **zero data loss** and maintains the original sampling integrity of each physical sensor.

### B. High-Precision Time Synchronization
- **Decision**: `TimeUS` is converted from the scaled `float64` (seconds) back to a high-precision `uint64` string representation of microseconds.
- **Rationale**: Floating-point representations of large microsecond values can suffer from precision drift. Using integer strings ensures that synchronization between GPS, IMU, and Attitude remains sample-accurate across different analysis platforms.

### C. Stream-Based Processing
- **Decision**: The parser uses an iterative loop with `parser.ReadMessage()` rather than loading the entire log into memory.
- **Rationale**: DataFlash logs can exceed several hundred megabytes. Stream processing ensures a constant, low memory footprint regardless of the flight duration.

### D. Unix-Style "Pipeline" Design
- **Decision**: Reserving `stdout` strictly for file paths and `stderr` for logging.
- **Rationale**: This follows the Unix philosophy of "programs as filters." It allows parent scripts (Python/Bash) to easily capture the list of generated files without needing complex regex or string parsing to strip out status messages.

## 4. Data Mapping & Schema

| Analytic | Type | Fields Extracted | Filename Suffix |
| :--- | :--- | :--- | :--- |
| **GPS** | Primary | `TimeUS`, `Lat`, `Lng`, `Alt` | `_gps_X.csv` |
| **IMU** | High-Freq | `TimeUS`, `AccX`, `AccY`, `AccZ` | `_imu_X.csv` |
| **ATT** | Sync | `TimeUS`, `Roll`, `Pitch`, `Yaw` | `_att_X.csv` |

## 5. Error Handling
- **Partial Corruption**: The script is designed to skip individual corrupted messages and continue parsing the rest of the file, providing a warning to `stderr`.
- **Missing Fields**: If a message of a requested type is missing required fields (e.g., a GPS message without a Latitude), it is silently skipped to ensure the resulting CSV has a consistent schema.
