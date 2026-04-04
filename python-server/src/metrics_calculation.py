"""Flight metrics calculation helpers.

Available metrics:
- max_horizontal_speed: max sqrt(v_x^2 + v_y^2)
- max_vertical_speed: max abs(v_z)
- duration_s: total flight duration in seconds
- max_acceleration: max magnitude of acceleration from velocity derivatives
- max_climb: max altitude gain (max(z_m) - min(z_m))
- total_distance: sum of 3D segment distances
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from src.calculation_functions import calculate_total_distance, get_cleaned_gps_dataframe


def _safe_series(df: pd.DataFrame, col: str) -> pd.Series:
	if col not in df.columns:
		return pd.Series(dtype="float64")
	return pd.to_numeric(df[col], errors="coerce")


def calculate_metrics(df: pd.DataFrame, df_gps: pd.DataFrame | None = None) -> dict:
	"""Calculate requested telemetry metrics from visualization dataframe.

	Expected columns: TimeUS, v_x, v_y, v_z, z_m.
	Returns zeros for metrics that cannot be computed.
	"""
	if (df is None or df.empty) and (df_gps is None or df_gps.empty):
		return {
			"total_distance": 0.0,
			"max_horizontal_speed": 0.0,
			"max_vertical_speed": 0.0,
			"duration_s": 0.0,
			"max_acceleration": 0.0,
			"max_climb": 0.0,
		}

	work_df = df.copy().sort_values("TimeUS") if df is not None and "TimeUS" in df.columns else (df.copy() if df is not None else pd.DataFrame())

	time_us = _safe_series(work_df, "TimeUS")
	v_x = _safe_series(work_df, "v_x")
	v_y = _safe_series(work_df, "v_y")
	v_z = _safe_series(work_df, "v_z")
	z_m = _safe_series(work_df, "z_m")
	x_m = _safe_series(work_df, "x_m")
	y_m = _safe_series(work_df, "y_m")

	if time_us.notna().any():
		duration_s = float((time_us.max() - time_us.min()) / 1_000_000.0)
	else:
		duration_s = 0.0

	horizontal_speed = np.sqrt(v_x**2 + v_y**2)
	max_horizontal_speed = float(horizontal_speed.max()) if horizontal_speed.notna().any() else 0.0

	max_vertical_speed = float(v_z.abs().max()) if v_z.notna().any() else 0.0

	if z_m.notna().any():
		max_climb = float(z_m.max() - z_m.min())
	else:
		max_climb = 0.0

	if df_gps is not None and not df_gps.empty and all(col in df_gps.columns for col in ["Lat", "Lng"]):
		clean_gps = get_cleaned_gps_dataframe(df_gps)
		total_distance = float(calculate_total_distance(clean_gps))
	else:
		step_distance = np.sqrt((x_m.diff())**2 + (y_m.diff())**2 + (z_m.diff())**2)
		total_distance = float(step_distance.fillna(0.0).sum())

	dt = time_us.diff() / 1_000_000.0
	a_x = v_x.diff() / dt
	a_y = v_y.diff() / dt
	a_z = v_z.diff() / dt
	a_mag = np.sqrt(a_x**2 + a_y**2 + a_z**2)
	a_mag = a_mag.replace([np.inf, -np.inf], np.nan)
	max_acceleration = float(a_mag.max()) if a_mag.notna().any() else 0.0

	return {
		"total_distance": total_distance,
		"max_horizontal_speed": max_horizontal_speed,
		"max_vertical_speed": max_vertical_speed,
		"duration_s": duration_s,
		"max_acceleration": max_acceleration,
		"max_climb": max_climb,
	}