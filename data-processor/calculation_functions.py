import numpy as np
import pandas as pd


# Functions for calculating total distance from GPS
def _calculate_step_distances(df):
    R = 6371000
    lat1, lon1 = np.radians(df['Lat'].shift(1)), np.radians(df['Lng'].shift(1))
    lat2, lon2 = np.radians(df['Lat']), np.radians(df['Lng'])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    return R * c

def get_cleaned_gps_dataframe(df, speed_limit=60.0, vertical_speed_limit=12.0):
    res = df.copy().reset_index(drop=True)
    
    res.loc[(res['Lat'].abs() < 0.1) | (res['Lng'].abs() < 0.1), ['Lat', 'Lng']] = np.nan
    
    dist = _calculate_step_distances(res)
    dt = res['TimeUS'].diff() / 1_000_000.0
    speed = dist / dt

    if len(speed) > 1 and speed.iloc[1] > speed_limit:
        res.loc[0, ['Lat', 'Lng']] = np.nan

    res.loc[speed > speed_limit, ['Lat', 'Lng']] = np.nan
    
    res['Lat'] = res['Lat'].interpolate().ffill().bfill()
    res['Lng'] = res['Lng'].interpolate().ffill().bfill()

    # Remove implausible vertical jumps from GPS altitude and fill gaps.
    if 'Alt' in res.columns:
        alt_dt = res['TimeUS'].diff() / 1_000_000.0
        alt_rate = res['Alt'].diff() / alt_dt
        res.loc[alt_rate.abs() > vertical_speed_limit, 'Alt'] = np.nan
        res['Alt'] = res['Alt'].interpolate().ffill().bfill()
    
    return res

def calculate_total_distance(df):
    clean_df = df.copy()
    distances = _calculate_step_distances(clean_df)
    return float(distances.fillna(0).sum())

def calculate_gps_speed_stats(df):
    clean_df = df.copy()
    distances = _calculate_step_distances(clean_df)
    dt = clean_df['TimeUS'].diff() / 1_000_000.0
    speeds = (distances / dt).replace([np.inf, -np.inf], np.nan).dropna()

    if speeds.empty:
        return {
            'max': 0.0,
            'p95': 0.0,
            'mean': 0.0,
        }

    return {
        'max': float(speeds.max()),
        'p95': float(np.percentile(speeds, 95)),
        'mean': float(speeds.mean()),
    }



# Function for calculating speeds from acceleration 
# (the vibest code ever)
import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt
def calculate_speeds_from_accel(df_imu_0, df_imu_1, df_att):
    # 1. СИНХРОНІЗАЦІЯ ТА УСЕРЕДНЕННЯ
    df_imu = pd.DataFrame({
        'TimeUS': df_imu_0['TimeUS'],
        'AccX': (df_imu_0['AccX'] + df_imu_1['AccX']) / 2.0,
        'AccY': (df_imu_0['AccY'] + df_imu_1['AccY']) / 2.0,
        'AccZ': (df_imu_0['AccZ'] + df_imu_1['AccZ']) / 2.0,
    })

    df = pd.merge_asof(df_imu.sort_values('TimeUS'), 
                       df_att.sort_values('TimeUS'), 
                       on='TimeUS', direction='nearest').reset_index(drop=True)

    # 2. ЦИФРОВА ФІЛЬТРАЦІЯ (Butterworth Low-pass)
    # Прибираємо шум моторів (cutoff 4Hz при частоті ~50Hz)
    try:
        b, a = butter(2, 4/(50/2), btype='low')
        for col in ['AccX', 'AccY', 'AccZ']:
            df[col] = filtfilt(b, a, df[col].fillna(0))
    except:
        pass 

    # 3. ПЕРЕХІД В ЗЕМНУ СИСТЕМУ КООРДИНАТ
    r = np.radians(df['Roll'].fillna(0))
    p = np.radians(df['Pitch'].fillna(0))

    # Рахуємо прискорення в осях Землі (X-North, Y-East, Z-Up)
    ax_e = df['AccX'] * np.cos(p) + df['AccZ'] * np.sin(p)
    ay_e = df['AccX'] * np.sin(p) * np.sin(r) + df['AccY'] * np.cos(r) - df['AccZ'] * np.sin(r) * np.cos(p)
    az_e = -df['AccX'] * np.sin(p) * np.cos(r) + df['AccY'] * np.sin(r) + df['AccZ'] * np.cos(p) * np.cos(r)

    # 4. ВИДАЛЕННЯ БАЙАСУ (Калібровка нуля)
    n_init = min(50, len(df))
    b_x, b_y, b_z = ax_e[:n_init].median(), ay_e[:n_init].median(), az_e[:n_init].median()

    a_x_pure = ax_e - b_x
    a_y_pure = ay_e - b_y
    a_z_pure = az_e - b_z

    # 5. LONG-TERM DRIFT REMOVAL (High-pass фільтр через Rolling Mean)
    window_long = int(5.0 * 50) 
    if window_long < len(df):
        a_x_pure -= a_x_pure.rolling(window_long, center=True, min_periods=1).mean()
        a_y_pure -= a_y_pure.rolling(window_long, center=True, min_periods=1).mean()
        a_z_pure -= a_z_pure.rolling(window_long, center=True, min_periods=1).mean()

    # 6. ВЕКТОРНЕ ІНТЕГРУВАННЯ (Метод трапецій)
    dt = df['TimeUS'].diff().fillna(0).values / 1_000_000.0
    v_x = np.zeros(len(df))
    v_y = np.zeros(len(df))
    v_z = np.zeros(len(df))
    
    curr_x, curr_y, curr_z = 0.0, 0.0, 0.0
    decay = 0.9999 # Коефіцієнт стабілізації

    ax_v, ay_v, az_v = a_x_pure.values, a_y_pure.values, a_z_pure.values

    for i in range(1, len(df)):
        if dt[i] <= 0: continue
        
        # Інтегруємо кожну вісь окремо для збереження напрямку вектора
        curr_x = (curr_x + 0.5 * (ax_v[i] + ax_v[i-1]) * dt[i]) * decay
        curr_y = (curr_y + 0.5 * (ay_v[i] + ay_v[i-1]) * dt[i]) * decay
        curr_z = (curr_z + 0.5 * (az_v[i] + az_v[i-1]) * dt[i]) * decay
        
        # ZUPT (Zero Velocity Update) - якщо прискорення мізерне, швидкість швидше згасає
        if abs(ax_v[i]) < 0.05: curr_x *= 0.98
        if abs(ay_v[i]) < 0.05: curr_y *= 0.98
        if abs(az_v[i]) < 0.05: curr_z *= 0.98
        
        v_x[i] = curr_x
        v_y[i] = curr_y
        v_z[i] = curr_z

    # 6.1 Прибираємо повільний дрейф швидкості після інтегрування.
    window_v = int(3.0 * 50)
    if window_v < len(df):
        v_x = v_x - pd.Series(v_x).rolling(window_v, center=True, min_periods=1).mean().values
        v_y = v_y - pd.Series(v_y).rolling(window_v, center=True, min_periods=1).mean().values
        v_z = v_z - pd.Series(v_z).rolling(window_v, center=True, min_periods=1).mean().values

    # 7. ФОРМУВАННЯ РЕЗУЛЬТАТІВ
    df['v_x'] = v_x
    df['v_y'] = v_y
    df['v_z'] = v_z
    
    # Горизонтальна швидкість (для звіту)
    df['v_horiz'] = np.sqrt(v_x**2 + v_y**2)
    
    # Вертикальна швидкість (абсолютна для звіту)
    df['v_vert'] = np.abs(v_z)
    
    # Повна швидкість (Magnitude) - ідеально для кольору 3D лінії
    df['v_mag'] = np.sqrt(v_x**2 + v_y**2 + v_z**2)
    
    # Тимчасовий стовпчик для фільтрації прискорення у звіті
    df['a_h'] = np.sqrt(a_x_pure**2 + a_y_pure**2)

    return df

def calculate_imu_speed_stats(df_with_speeds):
    horiz = df_with_speeds['v_horiz'].dropna()
    vert = df_with_speeds['v_vert'].dropna()

    if horiz.empty or vert.empty:
        return {
            'h_max': 0.0,
            'h_p99': 0.0,
            'v_max': 0.0,
            'v_p99': 0.0,
        }

    return {
        'h_max': float(horiz.max()),
        'h_p99': float(np.percentile(horiz, 99)),
        'v_max': float(vert.max()),
        'v_p99': float(np.percentile(vert, 99)),
    }