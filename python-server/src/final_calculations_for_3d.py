import numpy as np
import pandas as pd
from pathlib import Path
from scipy.spatial.transform import Rotation as R
from src.calculation_functions import get_cleaned_gps_dataframe, calculate_speeds_from_accel

def get_enu_coordinates(df_gps):

    if df_gps.empty: return df_gps

    lat_col = 'Lat' if 'Lat' in df_gps.columns else 'lat'
    lng_col = 'Lng' if 'Lng' in df_gps.columns else 'lng'
    alt_col = 'Alt' if 'Alt' in df_gps.columns else 'alt'

    lat0 = df_gps[lat_col].iloc[0]
    lng0 = df_gps[lng_col].iloc[0]
    alt0 = df_gps[alt_col].iloc[0]
    
    lat_to_m = 111320.0 
    lng_to_m = lat_to_m * np.cos(np.radians(lat0))
    
    df_gps['x_m'] = (df_gps[lng_col] - lng0) * lng_to_m
    df_gps['y_m'] = (df_gps[lat_col] - lat0) * lat_to_m
    df_gps['z_m'] = df_gps[alt_col] - alt0
    return df_gps

def convert_to_quaternions(df):

    euler_angles = df[['Roll', 'Pitch', 'Yaw']].values
    rot = R.from_euler('zyx', euler_angles, degrees=True)
    
    quats = rot.as_quat()
    
    df[['q_x', 'q_y', 'q_z', 'q_w']] = quats
    return df


def final_calculations_for_3d(df_att, df_imu_0, df_imu_1, df_gps):
    print("Start calculations for 3D visualization...")

    """
    GPS DATA PROCESSING
    """
    df_gps.columns = df_gps.columns.str.strip()

    df_gps_cleaned = get_cleaned_gps_dataframe(df_gps)

    df_gps_enu = get_enu_coordinates(df_gps_cleaned)
    gps_start_time_us = None
    if not df_gps_enu.empty and 'TimeUS' in df_gps_enu.columns:
        gps_times = pd.to_numeric(df_gps_enu['TimeUS'], errors='coerce').dropna()
        if not gps_times.empty:
            gps_start_time_us = float(gps_times.min())
    print(df_gps_cleaned.head())


    """
    EILER TO QUARTIRIONS DATA PROCESSING
    """
    df_att_quats = convert_to_quaternions(df_att)
    print(df_att_quats.head())

    """
    VELOCITY CALCULATIONS
    """

    df_velicities = calculate_speeds_from_accel(df_imu_0, df_imu_1, df_att_quats)
    print(df_velicities.head())

    visualization_df = pd.merge_asof(
        df_velicities[['TimeUS','v_x', 'v_y', 'v_z', 'v_mag']].sort_values('TimeUS'),
        df_att_quats[['TimeUS','q_x', 'q_y', 'q_z', 'q_w']].sort_values('TimeUS'),
        on='TimeUS',
        direction='nearest'
    )

    # IMU often starts earlier than GPS. Drop pre-GPS samples so velocity and
    # coordinates stay time-aligned and the trajectory does not freeze at origin.
    if gps_start_time_us is not None:
        before_sync_count = len(visualization_df)
        visualization_df = visualization_df[
            visualization_df['TimeUS'] >= gps_start_time_us
        ].reset_index(drop=True)
        dropped_count = before_sync_count - len(visualization_df)
        if dropped_count > 0:
            print(f"[SYNC] Dropped {dropped_count} pre-GPS samples (before TimeUS={int(gps_start_time_us)}).")

    # Interpolate GPS coordinates in Cartesian (ENU) space on the
    # visualization timestamps. We build a union index of GPS times and
    # visualization times, interpolate the GPS coordinates by time and
    # then sample the interpolated values at visualization timestamps.
    visualization_df = visualization_df.sort_values('TimeUS').reset_index(drop=True)
    coords = ['x_m', 'y_m', 'z_m']

    # prepare gps coordinates with datetime index
    gps_df = df_gps_enu[['TimeUS'] + coords].copy().sort_values('TimeUS')
    gps_times = pd.to_datetime(gps_df['TimeUS'], unit='us')
    gps_df.index = gps_times

    vis_times = pd.to_datetime(visualization_df['TimeUS'], unit='us')

    # union index and interpolate on the time axis
    union_index = gps_df.index.union(vis_times).sort_values()
    gps_union = gps_df.reindex(union_index)
    gps_union[coords] = gps_union[coords].interpolate(method='time')

    # sample interpolated GPS at visualization times
    gps_at_vis = gps_union.reindex(vis_times)[coords].reset_index(drop=True)

    # fallback fills for any remaining NaNs (start/end gaps)
    gps_at_vis = gps_at_vis.bfill().ffill().fillna(0.0)

    visualization_df[coords] = gps_at_vis.values

    visualization_df = visualization_df.reset_index(drop=True)

    return visualization_df
    


