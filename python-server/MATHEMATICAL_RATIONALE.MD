# Mathematical Rationale for Methods Used in the Python Server

This document explains why the current computational methods were selected, what physical assumptions they rely on, and why these units are used.

## 1. Input Units and Unit Consistency

The input telemetry uses:
- `TimeUS` — microseconds (`us`)
- `Lat`, `Lng` — geographic degrees (`deg`)
- `Alt` — meters (`m`)
- `Roll`, `Pitch`, `Yaw` — degrees (`deg`)
- `AccX`, `AccY`, `AccZ` — `m/s^2`

Why this matters:
- velocity and acceleration are physically meaningful only when units are consistent with SI;
- time is converted to seconds by dividing by `1_000_000`;
- angular data in degrees is explicitly converted in rotation computations via `degrees=True`.

## 2. Why Haversine Is Used for GPS Distance

To estimate traveled distance between GPS points, the service uses a spherical Earth model:

- Earth radius: `R = 6_371_000 m`
- angular distance:

$$
a = \sin^2\left(\frac{\Delta\varphi}{2}\right) + \cos(\varphi_1)\cos(\varphi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)
$$

$$
c = 2\arctan2(\sqrt{a}, \sqrt{1-a})
$$

$$
d = R \cdot c
$$

Why this choice:
- it is stable for short and medium ranges;
- accuracy is sufficient for flight telemetry use cases;
- computation is inexpensive and robust with noisy GPS input.

## 3. Local ENU Coordinates (`x_m`, `y_m`, `z_m`)

For 3D rendering, latitude/longitude are projected into a local Cartesian system relative to the launch point:

- $$x \approx (\lambda - \lambda_0) \cdot 111320 \cdot \cos(\varphi_0)$$
- $$y \approx (\varphi - \varphi_0) \cdot 111320$$
- $$z = Alt - Alt_0$$

Why this choice:
- this is a local tangent-plane (ENU-like) approximation;
- it is sufficiently accurate for kilometer-scale trajectories;
- it is much simpler than full ECEF conversion and suitable for realtime visualization.

## 4. GPS Cleanup: Why Speed-Based Thresholds

GPS filtering uses these limits:
- horizontal speed: `speed_limit = 300 m/s`
- vertical speed: `vertical_speed_limit = 150 m/s`

Procedure:
1. compute step speed between adjacent GPS points;
2. if a step is physically unrealistic, mark both endpoints as anomalous;
3. reconstruct anomalies using interpolation.

Why this approach:
- GPS glitches typically appear as abrupt coordinate jumps;
- speed-based validation catches such jumps in physically interpretable units;
- interpolation restores continuity for plots and metrics.

## 5. Why Orientation Is Converted to Quaternions

`Roll/Pitch/Yaw` are needed to rotate acceleration from body frame to earth frame.

Quaternions are used instead of direct Euler-angle operations because:
- they are numerically more stable;
- they avoid gimbal lock in intermediate calculations;
- orientation interpolation is cleaner and more robust.

## 6. IMU-Based Velocity Estimation: Core Physics

### 6.1. Combining Two IMUs

The two sensors (`instance 0` and `instance 1`) are fused by averaging:

$$
a = \frac{a_0 + a_1}{2}
$$

Why:
- averaging reduces random noise;
- it lowers the effect of a single degraded sensor.

### 6.2. Low-Pass Filtering

A 2nd-order Butterworth low-pass filter is applied with `cutoff = 4 Hz`.

Why:
- acceleration integration is highly sensitive to high-frequency noise;
- Butterworth offers smooth passband behavior without ripple;
- 4 Hz keeps flight dynamics while suppressing fine noise.

### 6.3. Earth-Frame Conversion and Gravity Compensation

After rotating acceleration to earth frame, gravity is removed:

$$
a_{z,lin} = a_{z,earth} - g, \quad g = 9.80665 \, m/s^2
$$

Then startup bias is removed using the median of initial samples.

Why:
- without gravity compensation, vertical integration quickly drifts;
- without bias removal, even a small offset accumulates into large velocity error.

### 6.4. Integration

Velocity is integrated by the trapezoidal rule:

$$
v_i = v_{i-1} + \frac{a_i + a_{i-1}}{2} \cdot \Delta t
$$

Why:
- it is more accurate than explicit Euler on non-uniform time steps;
- it is simple and computationally efficient for streaming telemetry.

Additionally, invalid time steps are rejected (`\Delta t <= 0` or `\Delta t > 0.5s`) to protect against corrupted timestamps.

## 7. Why `merge_asof` and Time Interpolation Are Used

ATT/IMU/GPS streams have different sampling rates and non-matching timestamps.

Therefore:
- IMU and ATT are aligned via `merge_asof(..., direction='nearest')`;
- GPS coordinates are interpolated onto the visualization timeline with `interpolate(method='time')`.

Why:
- this avoids staircase artifacts and timestamp mismatch jumps;
- resulting trajectories are smooth and suitable for frame-by-frame rendering.

## 8. Metric Definitions and Rationale

Metrics are computed in physically interpretable form:

- horizontal speed:
  $$v_{h} = \sqrt{v_x^2 + v_y^2}$$
- vertical speed:
  $$|v_z|$$
- duration:
  $$t_{max} - t_{min}$$
- maximum climb:
  $$\max(z) - \min(z)$$
- acceleration magnitude (from velocity derivatives):
  $$a = \sqrt{a_x^2 + a_y^2 + a_z^2}$$
- distance:
  - primary: cleaned GPS (Haversine);
  - fallback: sum of 3D steps in local coordinates.

Why this design:
- formulas map directly to engineering interpretation;
- GPS distance is usually more reliable than double integration from IMU;
- fallback keeps the pipeline stable when GPS is missing.

## 9. Applicability and Limitations

Current methods work well for:
- local flights (kilometer scale);
- scenarios where stable visualization and practical metrics are the priority.

Limitations:
- IMU integration without external correction still drifts over time;
- local ENU linearization is not intended for very large ranges;
- filtering thresholds (`300/150 m/s`, `4 Hz`) are empirical and may require tuning for other flight profiles.

## 10. Summary

The selected stack is a practical compromise between:
- physical correctness,
- numerical stability,
- computational simplicity,
- realtime visualization readiness.

SI units are applied consistently, and all key stages (filtering, gravity compensation, time alignment) are designed to keep both metrics and trajectory engineering-meaningful.