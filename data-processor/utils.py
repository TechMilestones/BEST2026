# File with utility functions for drone data analysis


import numpy as np
import pandas as pd


def calculate_total_distance(df):
    """
    Calculates the total distance traveled using the Haversine formula.

    Note: we don't need to use for because we can use vectorized operations with pandas and numpy.

    #Params:
    df (pd.DataFrame): DataFrame containing 'Lat' and 'Lng' columns.

    #Returns:
    float: Total distance traveled in meters.
    """
    R = 6371000  # Earth radius in meters

    lat1 = np.radians(df['Lat'].shift(1))
    lon1 = np.radians(df['Lng'].shift(1))
    lat2 = np.radians(df['Lat'])
    lon2 = np.radians(df['Lng'])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    # Haversine 
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))

    distances = R * c
    

    return distances.sum()



def calculate_speeds_from_accel(df):
    """
    Calculates horizontal and vertical speeds from acceleration using the trapezoidal rule.

    Note: we use vectorized operations (shift and cumsum) instead of for loops to 
    efficiently integrate acceleration data.

    #Params:
    df (pd.DataFrame): DataFrame containing 'TimeUS', 'AccX', 'AccY', and 'AccZ' columns.

    #Returns:
    pd.DataFrame: DataFrame with added 'v_horiz' and 'v_vert' columns (speeds in m/s).
    """
    dt = (df['TimeUS'] / 1_000_000.0).diff().fillna(0)

   
    a_horiz = np.sqrt(df['AccX']**2 + df['AccY']**2)
    a_vert = df['AccZ'] - 9.81


    dv_horiz = ((a_horiz.shift(1) + a_horiz) / 2) * dt
    dv_vert = ((a_vert.shift(1) + a_vert) / 2) * dt


    df['v_horiz'] = dv_horiz.fillna(0).cumsum()
    df['v_vert'] = dv_vert.fillna(0).cumsum()

    return df