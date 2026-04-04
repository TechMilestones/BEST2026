""""
Harversine formula and IMU-based speed calculations for UAV flight data analysis.
include:
- Haversine formula for GPS distance calculation
- GPS data cleaning (outlier removal + interpolation)
- IMU-based speed estimation using sensor fusion and filtering

"""

import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt
from scipy.spatial.transform import Rotation as R

# Calculate distances between GPS points using Haversine formula
def _calculate_step_distances(df):
    R = 6371000
    lat1, lon1 = np.radians(df['Lat'].shift(1)), np.radians(df['Lng'].shift(1))
    lat2, lon2 = np.radians(df['Lat']), np.radians(df['Lng'])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    return R * c

# clean GPS data by removing outliers and interpolating missing values
def get_cleaned_gps_dataframe(df, speed_limit=300.0, vertical_speed_limit=150.0):
    res = df.copy().reset_index(drop=True)
    
    res.loc[(res['Lat'].abs() < 0.1) | (res['Lng'].abs() < 0.1), ['Lat', 'Lng']] = np.nan
    
  
    # Step-based anomaly: if ANY step is too fast, clean both points of that step.
    dt = res['TimeUS'].diff() / 1_000_000.0
    dist = _calculate_step_distances(res)
    speed = dist / dt
    bad_step_xy = speed > speed_limit
    bad_point_xy = bad_step_xy | bad_step_xy.shift(-1, fill_value=False)

    # Startup GPS often has one spurious first fix; keep the second point so XY
    # does not get flattened at the beginning of the trajectory.
    if len(res) > 1 and bool(bad_step_xy.iloc[1]):
        bad_point_xy.iloc[1] = False

    res.loc[bad_point_xy, ['Lat', 'Lng']] = np.nan

    # If a GPS fix is unreliable in XY, treat its altitude as unreliable too.
    # This avoids startup Z jumps when XY was already invalidated.
    if 'Alt' in res.columns:
        res.loc[bad_point_xy, 'Alt'] = np.nan
    

    if 'Alt' in res.columns:
        vz = res['Alt'].diff() / dt
        bad_step_alt = vz.abs() > vertical_speed_limit
        bad_point_alt = bad_step_alt | bad_step_alt.shift(-1, fill_value=False)
        res.loc[bad_point_alt, 'Alt'] = np.nan
        
    res[['Lat', 'Lng', 'Alt']] = res[['Lat', 'Lng', 'Alt']].interpolate().ffill().bfill()
    print(f"Після очистки GPS: {res['Lat'].isna().sum()} пропущених Lat, {res['Lng'].isna().sum()} пропущених Lng, {res['Alt'].isna().sum()} пропущених Alt")
    return res

def calculate_total_distance(df):
    clean_df = df.copy()
    distances = _calculate_step_distances(clean_df)
    return float(distances.fillna(0).sum())



def calculate_speeds_from_accel(df_imu_0, df_imu_1, df_att):
    """
    Професійне обчислення швидкості БПЛА на основі IMU та Attitude (кватерніонів).
    Враховує Sensor Fusion, цифрову фільтрацію та усунення дрейфу.
    """
    
    imu_combined = pd.merge_asof(
        df_imu_0[['TimeUS', 'AccX', 'AccY', 'AccZ']].sort_values('TimeUS'),
        df_imu_1[['TimeUS', 'AccX', 'AccY', 'AccZ']].sort_values('TimeUS'),
        on='TimeUS', direction='nearest', suffixes=('_0', '_1')
    )
    
    df_imu = pd.DataFrame({
        'TimeUS': imu_combined['TimeUS'],
        'AccX': (imu_combined['AccX_0'] + imu_combined['AccX_1']) / 2.0,
        'AccY': (imu_combined['AccY_0'] + imu_combined['AccY_1']) / 2.0,
        'AccZ': (imu_combined['AccZ_0'] + imu_combined['AccZ_1']) / 2.0,
    })

    df = pd.merge_asof(
        df_imu.sort_values('TimeUS'), 
        df_att.sort_values('TimeUS'), 
        on='TimeUS', direction='nearest'
    ).reset_index(drop=True)


    fs = 50.0  
    cutoff = 4.0
    try:
        b, a = butter(2, cutoff / (fs / 2), btype='low')
        for col in ['AccX', 'AccY', 'AccZ']:

            df[col] = filtfilt(b, a, df[col].ffill().fillna(0))
    except Exception as e:
        print(f"Filter error: {e}")

    if all(col in df.columns for col in ['q_x', 'q_y', 'q_z', 'q_w']):
        quats = df[['q_x', 'q_y', 'q_z', 'q_w']].values
        rotations = R.from_quat(quats)
    else:

        rotations = R.from_euler('zyx', df[['Yaw', 'Pitch', 'Roll']].fillna(0).values, degrees=True)

    accel_body = df[['AccX', 'AccY', 'AccZ']].values
    accel_earth = rotations.apply(accel_body)

    ax_e = accel_earth[:, 0]
    ay_e = accel_earth[:, 1]
    az_e = accel_earth[:, 2] - 9.80665 

 
    n_init = min(50, len(df))
    a_x_pure = ax_e - np.median(ax_e[:n_init])
    a_y_pure = ay_e - np.median(ay_e[:n_init])
    a_z_pure = az_e - np.median(az_e[:n_init])


    dt = df['TimeUS'].diff().fillna(0).values / 1_000_000.0
    v_x, v_y, v_z = np.zeros(len(df)), np.zeros(len(df)), np.zeros(len(df))
    
    curr_vx, curr_vy, curr_vz = 0.0, 0.0, 0.0
    decay = 0.9995 

    for i in range(1, len(df)):
        if dt[i] <= 0 or dt[i] > 0.5: continue 
        

        curr_vx = (curr_vx + 0.5 * (a_x_pure[i] + a_x_pure[i-1]) * dt[i]) * decay
        curr_vy = (curr_vy + 0.5 * (a_y_pure[i] + a_y_pure[i-1]) * dt[i]) * decay
        curr_vz = (curr_vz + 0.5 * (a_z_pure[i] + a_z_pure[i-1]) * dt[i]) * decay
        
  
        acc_mag = np.sqrt(a_x_pure[i]**2 + a_y_pure[i]**2 + a_z_pure[i]**2)
        if acc_mag < 0.1:
            curr_vx *= 0.95; curr_vy *= 0.95; curr_vz *= 0.95
        
        v_x[i], v_y[i], v_z[i] = curr_vx, curr_vy, curr_vz

  
    df['v_x'], df['v_y'], df['v_z'] = v_x, v_y, v_z
    df['v_mag'] = np.sqrt(v_x**2 + v_y**2 + v_z**2) 
    df['v_horiz'] = np.sqrt(v_x**2 + v_y**2)
    
    return df
