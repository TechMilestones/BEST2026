import pandas as pd
from pathlib import Path

from final_calculations_for_3d import final_calculations_for_3d


def get_all_data():
    data_dir = Path("parser-data")
    flight_session_names = ["00000001"]

    for session in flight_session_names:
            
        # CSV TO DFs
        df_att = pd.read_csv(data_dir / f'{session}_att_0.csv')
        df_att.columns = df_att.columns.str.strip()
        
        df_imu_0 = pd.read_csv(data_dir / f'{session}_imu_0.csv')
        df_imu_0.columns = df_imu_0.columns.str.strip()
        
        df_imu_1 = pd.read_csv(data_dir / f'{session}_imu_1.csv')
        df_imu_1.columns = df_imu_1.columns.str.strip()

        df_gps = pd.read_csv(data_dir / f'{session}_gps_0.csv')
        df_gps.columns = df_gps.columns.str.strip()

        data = final_calculations_for_3d(df_att, df_imu_0, df_imu_1, df_gps)
        data.to_csv(f"processed_{session}.csv", index=False)
        return data.to_json(orient='records')


get_all_data()