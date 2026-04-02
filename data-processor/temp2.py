import numpy as np
import pandas as pd
from pathlib import Path
from calculation_functions import get_cleaned_gps_dataframe, calculate_speeds_from_accel

def get_enu_coordinates(df_gps):
    if df_gps.empty: return df_gps
    # Беремо першу точку як Home (0,0,0)
    # Перевіряємо назви стовпців, щоб не було помилок
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

data_dir = Path("data")
flight_session_names = ["00000019", "00000001"]

for session in flight_session_names:
    print(f"🚀 Обробка сесії: {session}")
    
    # 1. Завантаження (без str.title, просто чистимо пробіли в назвах)
    df_att = pd.read_csv(data_dir / f'{session}_att_0.csv')
    df_att.columns = df_att.columns.str.strip()
    
    df_gps = pd.read_csv(data_dir / f'{session}_gps_0.csv')
    df_gps.columns = df_gps.columns.str.strip()
    
    df_imu_0 = pd.read_csv(data_dir / f'{session}_imu_0.csv')
    df_imu_0.columns = df_imu_0.columns.str.strip()
    
    df_imu_1 = pd.read_csv(data_dir / f'{session}_imu_1.csv')
    df_imu_1.columns = df_imu_1.columns.str.strip()

    # 2. Розрахунок швидкостей
    # Важливо: calculate_speeds_from_accel очікує 'TimeUS'
    df_speeds = calculate_speeds_from_accel(df_imu_0, df_imu_1, df_att)

    # 3. Підготовка GPS
    df_gps_cleaned = get_cleaned_gps_dataframe(df_gps)
    df_gps_enu = get_enu_coordinates(df_gps_cleaned)

    # 4. Зшивання
    # Використовуємо TimeUS (як у твоїх вихідних файлах)
    df_final = pd.merge_asof(
        df_speeds.sort_values('TimeUS'),
        df_gps_enu[['TimeUS', 'x_m', 'y_m', 'z_m', 'Lat', 'Lng', 'Alt']].sort_values('TimeUS'),
        on='TimeUS',
        direction='nearest'
    )

    # Якщо Roll/Pitch/Yaw зникли після merge_asof, підтягнемо їх з df_speeds
    # (в calculate_speeds_from_accel вони мають зберігатися)

    # 5. Інтерполяція та очистка
    df_final[['x_m', 'y_m', 'z_m']] = df_final[['x_m', 'y_m', 'z_m']].interpolate()
    df_final = df_final.dropna(subset=['x_m']).reset_index(drop=True)
    df_final['time_s'] = (df_final['TimeUS'] - df_final['TimeUS'].iloc[0]) / 1_000_000.0

    # 6. Збереження
    # Використовуємо точні назви стовпців, які повертає твоя функція
    # Зазвичай це 'v_x', 'v_y', 'v_z', 'v_mag' (маленькими)
    final_columns = [
        'time_s', 'TimeUS', 
        'x_m', 'y_m', 'z_m', 
        'v_x', 'v_y', 'v_z', 'v_mag', 
        'Roll', 'Pitch', 'Yaw'
    ]
    
    # Фільтруємо лише ті стовпці, які реально існують в df_final
    existing_cols = [c for c in final_columns if c in df_final.columns]
    
    df_final[existing_cols].to_csv(f"{session}_final_viz_data.csv", index=False)
    
    print(f"✅ Збережено у {session}_final_viz_data.csv")