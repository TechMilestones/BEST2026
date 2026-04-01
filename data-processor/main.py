import numpy as np
import pandas as pd
from utils import calculate_total_distance, calculate_speeds_from_accel
from pathlib import Path

data_dir = Path("data")
flight_sesion_names  = ["00000019", "00000001"]


for session in flight_sesion_names:
    df_att_0 = pd.read_csv(data_dir / f'{session}_att_0.csv')
    df_gps_0 = pd.read_csv(data_dir / f'{session}_gps_0.csv')
    df_imu_0 = pd.read_csv(data_dir / f'{session}_imu_0.csv')
    df_imu_1 = pd.read_csv(data_dir / f'{session}_imu_1.csv')

    total = calculate_total_distance(df_gps_0)
    df_with_speeds = calculate_speeds_from_accel(df_imu_0)


    max_h_speed = df_with_speeds['v_horiz'].max()
    max_v_speed = df_with_speeds['v_vert'].abs().max()

    df_imu_0['acc_magnitude'] = np.sqrt(df_imu_0['AccX']**2 + df_imu_0['AccY']**2 + df_imu_0['AccZ']**2)
    max_acceleration = df_imu_0['acc_magnitude'].max()

    max_climb = df_gps_0['Alt'].max() - df_gps_0['Alt'].iloc[0]


    duration_s = (df_gps_0['TimeUS'].iloc[-1] - df_gps_0['TimeUS'].iloc[0]) / 1_000_000.0


    print (f" \n --- Результати для сесії {session} ---")
    print(f"Загальна дистанція: {total:.2f} м")
    print(f"Максимальна горизонтальна швидкість: {max_h_speed:.2f} м/с")
    print(f"Максимальна вертикальна швидкість: {max_v_speed:.2f} м/с")
    print(f"Максимальне прискорення: {max_acceleration:.2f} м/с²")
    print(f"Максимальний набір висоти: {max_climb:.2f} м")
    print(f"Загальна тривалість польоту: {duration_s:.2f} с")