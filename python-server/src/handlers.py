import json
from pathlib import Path

import pandas as pd

from src.final_calculations_for_3d import final_calculations_for_3d
from src.metrics_calculation import calculate_metrics


def _estimate_sampling_hz(df, time_col="TimeUS"):
    """
    Estimate sampling frequency (Hz) from a DataFrame by
    analyzing the time intervals between consecutive samples.
    """

    if df is None or df.empty or time_col not in df.columns:
        return 0.0

    time_us = pd.to_numeric(df[time_col], errors="coerce").dropna().sort_values()
    if len(time_us) < 2:
        return 0.0

    dt_s = time_us.diff().dropna() / 1_000_000.0
    dt_s = dt_s[dt_s > 0]
    if dt_s.empty:
        return 0.0

    return float(1.0 / dt_s.median())


def _log_parsing_metadata(df_att, df_imu_0, df_imu_1, df_gps):
    frequencies = {
        "gps_hz": _estimate_sampling_hz(df_gps),
        "att_hz": _estimate_sampling_hz(df_att),
        "imu_0_hz": _estimate_sampling_hz(df_imu_0),
        "imu_1_hz": _estimate_sampling_hz(df_imu_1),
    }

    units = {
        "TimeUS": "us",
        "Lat": "degrees",
        "Lng": "degrees",
        "Alt": "m",
        "Roll": "degrees",
        "Pitch": "degrees",
        "Yaw": "degrees",
        "AccX": "m/s^2",
        "AccY": "m/s^2",
        "AccZ": "m/s^2",
    }

    frequencies_table = pd.DataFrame(
        [
            {"Signal": "GPS", "Sampling Hz": round(frequencies["gps_hz"], 3)},
            {"Signal": "ATT", "Sampling Hz": round(frequencies["att_hz"], 3)},
            {"Signal": "IMU_0", "Sampling Hz": round(frequencies["imu_0_hz"], 3)},
            {"Signal": "IMU_1", "Sampling Hz": round(frequencies["imu_1_hz"], 3)},
        ]
    )
    units_table = pd.DataFrame(
        [{"Field": field, "Unit": unit} for field, unit in units.items()]
    )

    print("\n[PARSING] Sampling frequencies")
    print(frequencies_table.to_string(index=False))

    print("\n[PARSING] Units")
    print(units_table.to_string(index=False))


def build_dataframes_from_json(json_input):
    if isinstance(json_input, (str, Path)):
        json_path = Path(json_input)
        if json_path.exists():
            with open(json_path, "r", encoding="utf-8") as f:
                payload = json.load(f)
        else:
            payload = json.loads(str(json_input))
    else:
        payload = json_input

    df_att = pd.DataFrame(
        payload.get("att", []), columns=["time_us", "roll", "pitch", "yaw"]
    )
    df_att = df_att.rename(
        columns={"time_us": "TimeUS", "roll": "Roll", "pitch": "Pitch", "yaw": "Yaw"}
    )

    df_gps = pd.DataFrame(
        payload.get("gps", []), columns=["time_us", "lat", "lng", "alt"]
    )
    df_gps = df_gps.rename(
        columns={"time_us": "TimeUS", "lat": "Lat", "lng": "Lng", "alt": "Alt"}
    )

    imu_df = pd.DataFrame(
        payload.get("imu", []),
        columns=["instance", "time_us", "acc_x", "acc_y", "acc_z"],
    )
    if "instance" not in imu_df.columns:
        imu_df["instance"] = 0

    def _select_imu(instance_id):
        subset = imu_df[imu_df["instance"] == instance_id].copy()
        subset = subset.rename(
            columns={
                "time_us": "TimeUS",
                "acc_x": "AccX",
                "acc_y": "AccY",
                "acc_z": "AccZ",
            }
        )
        return (
            subset[["TimeUS", "AccX", "AccY", "AccZ"]]
            if not subset.empty
            else pd.DataFrame(columns=["TimeUS", "AccX", "AccY", "AccZ"])
        )

    df_imu_0 = _select_imu(0)
    df_imu_1 = _select_imu(1)

    return (
        df_att[["TimeUS", "Roll", "Pitch", "Yaw"]],
        df_imu_0,
        df_imu_1,
        df_gps[["TimeUS", "Lat", "Lng", "Alt"]],
    )


def dataframe_to_json_records(df):
    ordered_columns = [
        "TimeUS",
        "v_x",
        "v_y",
        "v_z",
        "v_mag",
        "q_x",
        "q_y",
        "q_z",
        "q_w",
        "x_m",
        "y_m",
        "z_m",
    ]

    existing_columns = [col for col in ordered_columns if col in df.columns]
    result_df = df[existing_columns].copy()

    for col in result_df.columns:
        result_df[col] = result_df[col].map(
            lambda value: "" if pd.isna(value) else str(value)
        )

    return result_df.to_dict(orient="records")


def get_all_data(data):

    df_att, df_imu_0, df_imu_1, df_gps = build_dataframes_from_json(data)
    _log_parsing_metadata(df_att, df_imu_0, df_imu_1, df_gps)

    visualization_df = final_calculations_for_3d(df_att, df_imu_0, df_imu_1, df_gps)
    visualization_data = dataframe_to_json_records(visualization_df)
    metrics = calculate_metrics(visualization_df, df_gps)

    return {
        "visualization_data": visualization_data,
        "metrics": metrics,
    }
