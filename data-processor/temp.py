import numpy as np
import pandas as pd

from calculation_functions import get_cleaned_gps_dataframe, calculate_speeds_from_accel, calculate_total_distance
from pathlib import Path

data_dir = Path("data")
flight_sesion_names  = ["00000019", "00000001"]


for session in flight_sesion_names:
    df_att_0 = pd.read_csv(data_dir / f'{session}_att_0.csv')
    df_gps_0 = pd.read_csv(data_dir / f'{session}_gps_0.csv')
    df_imu_0 = pd.read_csv(data_dir / f'{session}_imu_0.csv')
    df_imu_1 = pd.read_csv(data_dir / f'{session}_imu_1.csv')

    df_speed_vectors = calculate_speeds_from_accel(df_imu_0, df_imu_1, df_att_0)

    print(f" --- Результати для сесії {session} ---")
    print('\n')
    print(df_speed_vectors[['TimeUS','v_x', 'v_y', 'v_z', 'v_mag']].head())

    print('\n')
    df_gps_0 = get_cleaned_gps_dataframe(df_gps_0)
    print(df_gps_0.head())


    print('\n')
    df_gps_0 = get_cleaned_gps_dataframe(df_gps_0)
    print(df_att_0.head())





