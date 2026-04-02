import pandas as pd
import plotly.graph_objects as go
import numpy as np
import os

def create_pro_visualization(file_list):
    # 1. Завантаження та підготовка
    data = {}
    max_t = 0
    for f in file_list:
        if os.path.exists(f):
            name = f.split('_')[0]
            df = pd.read_csv(f)
            # Робимо дані дуже плавними (інтерполяція до 20 Гц для анімації)
            df['time_s'] = (df['TimeUS'] - df['TimeUS'].iloc[0]) / 1_000_000.0
            data[name] = df
            max_t = max(max_t, df['time_s'].max())

    # Часова сітка для анімації (крок 0.1 сек)
    t_grid = np.arange(0, max_t, 0.1)
    
    fig = go.Figure()

    # Створюємо "Землю" (сітку) для орієнтації в просторі
    grid_size = 500
    fig.add_trace(go.Surface(
        z=np.zeros((10, 10)) - 1, # Трохи нижче нуля
        x=np.linspace(-grid_size, grid_size, 10),
        y=np.linspace(-grid_size, grid_size, 10),
        showscale=False, opacity=0.2, colorscale='Greys',
        name="Ground"
    ))

    # 2. Початкові об'єкти для кожної сесії
    colors = ['#00CCFF', '#FF00FF'] # Неоновий блакитний та рожевий
    
    for i, (name, df) in enumerate(data.items()):
        # Траєкторія (шлейф), який буде рости
        fig.add_trace(go.Scatter3d(
            x=[df['x_m'].iloc[0]], y=[df['y_m'].iloc[0]], z=[df['z_m'].iloc[0]],
            mode='lines', line=dict(color=colors[i], width=6),
            name=f"Сесія {name} Path"
        ))
        
        # Сам Дрон (Конус)
        fig.add_trace(go.Cone(
            x=[df['x_m'].iloc[0]], y=[df['y_m'].iloc[0]], z=[df['z_m'].iloc[0]],
            u=[df['v_x'].iloc[0]], v=[df['v_y'].iloc[0]], w=[df['v_z'].iloc[0]],
            sizemode="absolute", sizeref=15, anchor="tail",
            colorscale=[[0, colors[i]], [1, 'white']], showscale=False,
            name=f"Дрон {name}"
        ))

    # 3. Створення кадрів (Frames)
    frames = []
    for step, t in enumerate(t_grid):
        frame_data = []
        # Додаємо сітку (незмінна)
        frame_data.append(fig.data[0])
        
        for i, (name, df) in enumerate(data.items()):
            # Знаходимо найближчу точку в часі
            idx = (df['time_s'] - t).abs().idxmin()
            curr = df.iloc[idx]
            past = df.iloc[:idx+1]
            
            # Оновлюємо шлейф (беремо останні 50 точок для ефекту руху)
            frame_data.append(go.Scatter3d(x=past['x_m'], y=past['y_m'], z=past['z_m']))
            
            # Оновлюємо позицію дрона та HUD
            frame_data.append(go.Cone(
                x=[curr['x_m']], y=[curr['y_m']], z=[curr['z_m']],
                u=[curr['v_x']], v=[curr['v_y']], w=[curr['v_z']],
                text=f"V: {curr['v_mag']:.1f} m/s | H: {curr['z_m']:.1f} m"
            ))
            
        frames.append(go.Frame(data=frame_data, name=f"f{step}"))

    fig.frames = frames

    # 4. Дизайн Інтерфейсу
    fig.update_layout(
        template="plotly_dark",
        title=dict(text="🛸 ADVANCED FLIGHT ANALYTICS 3D", font=dict(size=24, color="white")),
        scene=dict(
            xaxis=dict(backgroundcolor="rgb(20, 20, 20)", gridcolor="gray", showbackground=True),
            yaxis=dict(backgroundcolor="rgb(20, 20, 20)", gridcolor="gray", showbackground=True),
            zaxis=dict(backgroundcolor="rgb(25, 25, 25)", gridcolor="gray", showbackground=True),
            aspectmode='data',
            camera=dict(eye=dict(x=1.2, y=1.2, z=0.8)) # "Кінематографічний" ракурс
        ),
        updatemenus=[dict(
            type="buttons", buttons=[
                dict(label="🚀 ПУСК", method="animate", args=[None, {"frame": {"duration": 50, "redraw": True}, "fromcurrent": True}]),
                dict(label="⏸ ПАУЗА", method="animate", args=[[None], {"frame": {"duration": 0, "redraw": False}, "mode": "immediate"}])
            ],
            direction="left", pad={"r": 10, "t": 87}, showactive=False, x=0.1, y=0, xanchor="right", yanchor="top"
        )],
        sliders=[dict(
            active=0, yanchor="top", xanchor="left", 
            currentvalue={"prefix": "Time: ", "suffix": "s", "font": {"size": 20}},
            pad={"b": 10, "t": 50}, len=0.9, x=0.1, y=0,
            steps=[dict(label=f"{t:.1f}", method="animate", args=[[f"f{k}"], {"frame": {"duration": 0, "redraw": True}, "mode": "immediate"}]) for k, t in enumerate(t_grid)]
        )]
    )

    # Збереження "важкого" красивого файлу
    fig.write_html("ULTRA_3D_FLIGHT.html")
    print("💎 ШЕДЕВР ГОТОВИЙ: ULTRA_3D_FLIGHT.html")
    fig.show()

if __name__ == "__main__":
    files = ["00000001_final_viz_data.csv", "00000019_final_viz_data.csv"]
    create_pro_visualization(files)