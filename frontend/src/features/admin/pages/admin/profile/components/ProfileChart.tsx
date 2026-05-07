import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

export const ProfileChart = () => {
  const lineData = [0, 1, 5, 2, 7];

  const option = {
    grid: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    xAxis: {
      type: 'category',
      show: false,
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      show: false,
    },
    series: [
      {
        data: lineData,
        type: 'line',
        smooth: true,
        symbolSize: 0,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(58, 176, 144, 0.3)',
            },
            {
              offset: 1,
              color: 'rgba(58, 176, 144, 0.1)',
            },
          ]),
        },
        lineStyle: {
          color: '#3ab090',
          width: 2,
        },
      },
    ],
  };
  return (
    <div>
      <ReactECharts
        option={option}
        style={{
          height: '48px',
          width: '96px',
        }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
};



