import { useEffect, useRef, memo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useVisualizationContext, type TelemetryData } from '../../context/VisualizationContext';
import TelemetryChart from './Chart';

interface SubscribingChartProps {
    title: string;
    x_array: number[];
    y_array: number[];
    getX: (t: TelemetryData) => number;
    getY: (t: TelemetryData) => number;
    xAxis: string;
    yAxis: string;
}

const SubscribingChart = ({
    title,
    x_array,
    y_array,
    getX,
    getY,
    xAxis,
    yAxis
}: SubscribingChartProps) => {
    const { subscribeTelemetry } = useVisualizationContext();
    const chartRef = useRef<ReactECharts>(null);

    useEffect(() => {
        return subscribeTelemetry((t) => {
            const chartInstance = chartRef.current?.getEchartsInstance();
            if (chartInstance) {
                // Imperatively update ONLY the markPoint
                chartInstance.setOption({
                    series: [
                        {
                            markPoint: {
                                data: [
                                    {
                                        coord: [getX(t), getY(t)],
                                        symbol: 'circle',
                                        symbolSize: 10,
                                        itemStyle: { color: '#EF4444' },
                                    },
                                ],
                            },
                        },
                    ],
                });
            }
        });
    }, [subscribeTelemetry, getX, getY]);

    return (
        <TelemetryChart
            ref={chartRef}
            title={title}
            x_array={x_array}
            y_array={y_array}
            // Passing initial/null values is fine as the imperative update kicks in immediately
            current_x={0}
            current_y={0}
            xAxis={xAxis}
            yAxis={yAxis}
        />
    );
};

export default memo(SubscribingChart);
