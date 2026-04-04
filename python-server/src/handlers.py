import json
from pathlib import Path

import pandas as pd

from src.final_calculations_for_3d import final_calculations_for_3d
from src.metrics_calculation import calculate_metrics


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

    df_att = pd.DataFrame(payload.get("att", []), columns=["time_us", "roll", "pitch", "yaw"])
    df_att = df_att.rename(
        columns={"time_us": "TimeUS", "roll": "Roll", "pitch": "Pitch", "yaw": "Yaw"}
    )

    df_gps = pd.DataFrame(payload.get("gps", []), columns=["time_us", "lat", "lng", "alt"])
    df_gps = df_gps.rename(
        columns={"time_us": "TimeUS", "lat": "Lat", "lng": "Lng", "alt": "Alt"}
    )

    imu_df = pd.DataFrame(payload.get("imu", []), columns=["instance", "time_us", "acc_x", "acc_y", "acc_z"])
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
        return subset[["TimeUS", "AccX", "AccY", "AccZ"]] if not subset.empty else pd.DataFrame(
            columns=["TimeUS", "AccX", "AccY", "AccZ"]
        )

    df_imu_0 = _select_imu(0)
    df_imu_1 = _select_imu(1)

    return df_att[["TimeUS", "Roll", "Pitch", "Yaw"]], df_imu_0, df_imu_1, df_gps[["TimeUS", "Lat", "Lng", "Alt"]]


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
        result_df[col] = result_df[col].map(lambda value: "" if pd.isna(value) else str(value))

    return result_df.to_dict(orient="records")


def get_all_data(data):

    df_att, df_imu_0, df_imu_1, df_gps = build_dataframes_from_json(data)

    visualization_df = final_calculations_for_3d(df_att, df_imu_0, df_imu_1, df_gps)
    visualization_data = dataframe_to_json_records(visualization_df)
    metrics = calculate_metrics(visualization_df, df_gps)

    return {
        "visualisation_data": visualization_data,
        "metrics": metrics,
    }
