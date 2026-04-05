import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";

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

export type TelemetryListener = (data: TelemetryData) => void;

export interface VisualizationContextProps {
    flightData: FlightData[]
    setFlightData: (data: FlightData[]) => void
    metrics: FlightMetrics | null
    setMetrics: (metrics: FlightMetrics) => void
    // Ref-based telemetry access
    updateTelemetry: (data: TelemetryData) => void
    subscribeTelemetry: (listener: TelemetryListener) => () => void
    getLatestTelemetry: () => TelemetryData | null
}

const VisualizationContext = createContext<VisualizationContextProps>({
    flightData: [],
    setFlightData: () => { },
    metrics: null,
    setMetrics: () => { },
    updateTelemetry: () => { },
    subscribeTelemetry: () => () => { },
    getLatestTelemetry: () => null,
})

export function VisualizationProvider({ children }: { children: React.ReactNode }) {
    const [flightData, _setFlightData] = useState<FlightData[]>([])
    const [metrics, _setMetrics] = useState<FlightMetrics | null>(null)
    
    // Ref-based state for telemetry to avoid re-renders
    const telemetryRef = useRef<TelemetryData | null>(null)
    const listenersRef = useRef<Set<TelemetryListener>>(new Set())

    const updateTelemetry = useCallback((data: TelemetryData) => {
        telemetryRef.current = data
        listenersRef.current.forEach(listener => listener(data))
    }, [])

    const subscribeTelemetry = useCallback((listener: TelemetryListener) => {
        listenersRef.current.add(listener)
        return () => {
            listenersRef.current.delete(listener)
        }
    }, [])

    const getLatestTelemetry = useCallback(() => telemetryRef.current, [])

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

    const setFlightData = useCallback((data: FlightData[]) => {
        const sanitizedData = data.map(item => ({
            ...item,
            TimeUS: Number(item.TimeUS),
            x_m: Number(item.x_m),
            y_m: Number(item.y_m),
            z_m: Number(item.z_m),
            q_w: Number(item.q_w),
            q_x: Number(item.q_x),
            q_y: Number(item.q_y),
            q_z: Number(item.q_z),
            v_mag: Number(item.v_mag),
            lat: item.lat != null ? Number(item.lat) : undefined,
            lon: item.lon != null ? Number(item.lon) : undefined,
        }));
        _setFlightData(sanitizedData)
        sessionStorage.setItem("visualization_data", JSON.stringify(sanitizedData))
    }, [])

    const setMetrics = useCallback((m: FlightMetrics) => {
        const sanitizedMetrics = {
            total_distance: Number(m.total_distance),
            max_horizontal_speed: Number(m.max_horizontal_speed),
            max_vertical_speed: Number(m.max_vertical_speed),
            max_acceleration: Number(m.max_acceleration),
            max_climb: Number(m.max_climb),
            duration_s: Number(m.duration_s),
        } as FlightMetrics;
        _setMetrics(sanitizedMetrics)
        sessionStorage.setItem("flight_metrics", JSON.stringify(sanitizedMetrics))
    }, [])

    const contextValue = useMemo(() => ({
        flightData,
        setFlightData,
        metrics,
        setMetrics,
        updateTelemetry,
        subscribeTelemetry,
        getLatestTelemetry
    }), [flightData, setFlightData, metrics, setMetrics, updateTelemetry, subscribeTelemetry, getLatestTelemetry]);

    return (
        <VisualizationContext.Provider value={contextValue}>
            {children}
        </VisualizationContext.Provider>
    )
}

export function useVisualizationContext() {
    return useContext(VisualizationContext)
}

export default VisualizationContext
