import React, { createContext, useContext, useState, useEffect } from "react";

export interface FlightData {
    TimeUS: number
    x_m: number
    y_m: number
    z_m: number
    q_w: number
    q_x: number
    q_y: number
    q_z: number
    v_mag: number
    // опціональні GPS поля якщо є в даних
    lat?: number
    lon?: number
}

// Телеметрія яку компонент повертає назовні
export interface TelemetryData {
    /** Поточний час від початку польоту, секунди */
    elapsedSec: number
    /** Час що залишився до кінця польоту, секунди */
    remainingSec: number
    /** Поточна швидкість, м/с */
    speedMs: number
    /** Поточна висота (z_m), метри */
    altitudeM: number
    /** Широта (якщо є в даних) */
    lat: number | null
    /** Довгота (якщо є в даних) */
    lon: number | null
}

export interface FlightMetrics {
    duration_s: number;
    max_horizontal_speed: number;
    max_vertical_speed: number;
    max_acceleration: number;
    max_climb: number;
    total_distance: number;
}

export interface VisualizationContextProps {
    telemetry: TelemetryData | null
    setTelemetry: React.Dispatch<React.SetStateAction<TelemetryData | null>>
    flightData: FlightData[]
    setFlightData: (data: FlightData[]) => void
    metrics: FlightMetrics | null
    setMetrics: (metrics: FlightMetrics) => void
}

const VisualizationContext = createContext<VisualizationContextProps>({
    telemetry: null,
    setTelemetry: () => { },
    flightData: [],
    setFlightData: () => { },
    metrics: null,
    setMetrics: () => { },
})

export function VisualizationProvider({ children }: { children: React.ReactNode }) {
    const [flightData, _setFlightData] = useState<FlightData[]>([])
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
    const [metrics, _setMetrics] = useState<FlightMetrics | null>(null)

    useEffect(() => {
        const visualization_serial = sessionStorage.getItem("visualization_data")
        if (visualization_serial) {
            try {
                const visualization_data = JSON.parse(visualization_serial) as FlightData[]
                _setFlightData(visualization_data)
            } catch (e) {
                console.error("Failed to parse visualization_data from sessionStorage", e)
            }
        }

        const metrics_serial = sessionStorage.getItem("flight_metrics")
        if (metrics_serial) {
            try {
                const metrics_data = JSON.parse(metrics_serial) as FlightMetrics
                _setMetrics(metrics_data)
            } catch (e) {
                console.error("Failed to parse flight_metrics from sessionStorage", e)
            }
        }
    }, [])

    const setFlightData = (data: FlightData[]) => {
        _setFlightData(data)
        sessionStorage.setItem("visualization_data", JSON.stringify(data))
    }

    const setMetrics = (m: FlightMetrics) => {
        _setMetrics(m)
        sessionStorage.setItem("flight_metrics", JSON.stringify(m))
    }

    return (
        <VisualizationContext.Provider value={{
            telemetry,
            setTelemetry,
            flightData,
            setFlightData,
            metrics,
            setMetrics
        }}>
            {children}
        </VisualizationContext.Provider>
    )
}

export function useVisualizationContext() {
    return useContext(VisualizationContext)
}

export default VisualizationContext
