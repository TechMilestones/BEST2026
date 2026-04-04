import ReactECharts from 'echarts-for-react';

interface TelemetryChartProps {
    current_x?: Number,
    current_y?: Number,
    x_array: Array<Number>,
    y_array: Array<Number>,
    title: String
}

export default function TelemetryChart({ current_x, current_y, x_array, y_array, title } : TelemetryChartProps) {
  const option = {
    title: {
      text: title,
      textStyle: {
        color: '#E5E7EB',
      },
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: x_array,
      axisLabel: {
        color: '#9CA3AF',
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#9CA3AF',
      },
      data: y_array
    },
    series: [
        {
            type: 'line',
            data: y_array,
            smooth: true,

            lineStyle: {
            color: '#3B82F6',
            width: 2,
            },

            itemStyle: {
            color: '#3B82F6',
            },

            markPoint: {
            data: [
                {
                coord: [current_x, current_y],
                symbol: 'circle',
                symbolSize: 10,
                itemStyle: {
                    color: '#EF4444',
                },
                },
            ],
            },
        },
    ],
    grid: {
        top: 55,
        left: 10,
        right: 10,
        bottom: 10,
    },
    backgroundColor: '#171A1E',
  };

  return <ReactECharts option={option} style={{ height: '44%', width: '100%' }} />;
}
