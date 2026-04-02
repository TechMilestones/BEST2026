import pandas as pd
import numpy as np

def clean_gps_data(df, speed_threshold=100.0):
    R = 6371000
    
    t = df['TimeUS'] / 1_000_000.0
    dt = t.diff()

    lat1, lon1 = np.radians(df['Lat'].shift(1)), np.radians(df['Lng'].shift(1))
    lat2, lon2 = np.radians(df['Lat']), np.radians(df['Lng'])

    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    dist = R * c

    gps_speed = dist / dt
    
    is_outlier = (gps_speed > speed_threshold) | (df['Lat'] == 0) | (df['Lng'] == 0)
    
    df.loc[is_outlier, ['Lat', 'Lng']] = np.nan
    
    df['Lat'] = df['Lat'].interpolate(method='linear')
    df['Lng'] = df['Lng'].interpolate(method='linear')
    
    df[['Lat', 'Lng']] = df[['Lat', 'Lng']].ffill().bfill()
    
    return df