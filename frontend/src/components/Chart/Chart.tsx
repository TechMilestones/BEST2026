import React, { useMemo, forwardRef } from 'react';
import ReactECharts from 'echarts-for-react';

interface TelemetryChartProps {
  current_x?: number,
  current_y?: number,
  x_array: number[],
  y_array: number[],
  title: string,
  xAxis: string,
  yAxis: string
}

const TelemetryChart = forwardRef<ReactECharts, TelemetryChartProps>(
  ({ current_x, current_y, x_array, y_array, title, xAxis, yAxis }, ref) => {
    const option = useMemo(() => ({
      title: {
        text: title,
        textStyle: { color: '#E5E7EB' },
      },
      tooltip: { trigger: 'axis' },
      animation: false,
      xAxis: {
        type: 'category',
        data: x_array,
        axisLabel: { color: '#9CA3AF' },
        name: xAxis,
        nameTextStyle: { color: '#9CA3AF' },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#9CA3AF' },
        name: yAxis,
        nameTextStyle: { color: '#9CA3AF' },
      },
      series: [
        {
          type: 'line',
          data: y_array,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#3B82F6', width: 2 },
          itemStyle: { color: '#3B82F6' },
          markPoint: {
            data: [
              {
                coord: [current_x, current_y],
                symbol: 'circle',
                symbolSize: 10,
                itemStyle: { color: '#EF4444' },
              },
            ],
          },
        },
      ],
      grid: {
        top: 55,
        left: 40,
        right: 20,
        bottom: 25,
      },
      backgroundColor: '#171A1E',
    }), [current_x, current_y, x_array, y_array, title, xAxis, yAxis]);

    return (
      <ReactECharts
        ref={ref}
        option={option}
        style={{ height: '44%', width: '100%' }}
        notMerge={false}
        lazyUpdate={true}
      />
    );
  }
);

export default React.memo(TelemetryChart);
