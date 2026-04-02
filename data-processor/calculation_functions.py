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

def get_cleaned_gps_dataframe(df, speed_limit=100.0):
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
    
    return res

def calculate_total_distance(df):
    clean_df = df.copy()
    distances = _calculate_step_distances(clean_df)
    dt = clean_df['TimeUS'].diff() / 1_000_000.0
    speeds = (distances / dt).replace([np.inf, -np.inf], np.nan)
    max_gps_speed = speeds.max()
    print(f"Max GPS speed: {max_gps_speed}")
    return float(distances.fillna(0).sum())



# Function for calculating speeds from acceleration 
# (the vibest code ever)
import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt

def calculate_speeds_from_accel(df_imu_0, df_imu_1, df_att):
    # 1. СИНХРОНІЗАЦІЯ ТА УСЕРЕДНЕННЯ (Sensor Fusion)
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
    # fs (частота) приблизно 50Гц, cutoff 4Гц - прибираємо вібрації моторів
    try:
        b, a = butter(2, 4/(50/2), btype='low')
        for col in ['AccX', 'AccY', 'AccZ']:
            df[col] = filtfilt(b, a, df[col].fillna(0))
    except:
        pass # fallback якщо scipy не підтягнувся

    # 3. ПЕРЕХІД В ЗЕМНУ СИСТЕМУ (Coordinate Transformation)
    r = np.radians(df['Roll'].fillna(0))
    p = np.radians(df['Pitch'].fillna(0))

    # Матриця повороту для осей Землі
    ax_e = df['AccX'] * np.cos(p) + df['AccZ'] * np.sin(p)
    ay_e = df['AccX'] * np.sin(p) * np.sin(r) + df['AccY'] * np.cos(r) - df['AccZ'] * np.sin(r) * np.cos(p)
    az_e = -df['AccX'] * np.sin(p) * np.cos(r) + df['AccY'] * np.sin(r) + df['AccZ'] * np.cos(p) * np.cos(r)

    # 4. ВИДАЛЕННЯ БАЙАСУ ТА ГРАВІТАЦІЇ
    # Беремо початковий стан (спокій)
    n_init = min(50, len(df))
    b_x, b_y, b_z = ax_e[:n_init].median(), ay_e[:n_init].median(), az_e[:n_init].median()

    # Чисте прискорення (AC component)
    a_x_pure = ax_e - b_x
    a_y_pure = ay_e - b_y
    a_z_pure = az_e - b_z

    # 5. LONG-TERM DRIFT REMOVAL (High-pass)
    # Вікно 5 секунд (замість 0.5), щоб не вбити реальний розгін
    window_long = int(5.0 * 50) # 50 Гц * 5 сек
    if window_long < len(df):
        a_x_pure -= a_x_pure.rolling(window_long, center=True, min_periods=1).mean()
        a_y_pure -= a_y_pure.rolling(window_long, center=True, min_periods=1).mean()
        a_z_pure -= a_z_pure.rolling(window_long, center=True, min_periods=1).mean()

    # 6. РОЗУМНЕ ІНТЕГРУВАННЯ (Trapezoidal + Adaptive Decay)
    dt = df['TimeUS'].diff().fillna(0).values / 1_000_000.0
    v_h, v_v = np.zeros(len(df)), np.zeros(len(df))
    
    curr_h, curr_v = 0.0, 0.0
    decay = 0.9999 # "Слабке" затухання для збереження реальної швидкості
    
    # Розрахунок горизонтального модуля
    a_h = np.sqrt(a_x_pure**2 + a_y_pure**2)

    for i in range(1, len(df)):
        if dt[i] <= 0: continue
        
        # Трапеція
        curr_h = (curr_h + 0.5 * (a_h[i] + a_h[i-1]) * dt[i]) * decay
        curr_v = (curr_v + 0.5 * (a_z_pure[i] + a_z_pure[i-1]) * dt[i]) * decay
        
        # ZUPT: якщо прискорення майже нуль — швидкість потроху скидається (як опір повітря)
        if a_h[i] < 0.05: curr_h *= 0.98 
        
        v_h[i] = curr_h
        v_v[i] = curr_v

    # Додаємо результати в DF
    df['v_horiz'] = v_h
    df['v_vert'] = np.abs(v_v)
    df['a_h'] = a_h
    
    return df