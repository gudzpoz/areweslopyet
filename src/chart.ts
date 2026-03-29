import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import palette from 'google-palette';

echarts.use([
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,

  LineChart,

  SVGRenderer,
]);

export default function (data: string) {

  const dates = new Set<string>();
  let total = 0;
  const totals: Record<string, number> = {};
  const trend = data.split('\n').filter(
    (line) => line.trim() !== '' && !line.startsWith('date'),
  ).map((line) => {
    const [date, totalStr, othersStr] = line.split(',');
    const othersSplit = othersStr.split(' ');
    const all: Record<string, number> = {};
    for (let i = 0; i < othersSplit.length; i += 2) {
      const count = parseInt(othersSplit[i]);
      const tag = othersSplit[i + 1];
      all[tag] = count;
      totals[tag] = (totals[tag] || 0) + count;
    }
    total = Math.max(total, parseInt(totalStr));
    return [date, all] as [string, Record<string, number>];
  }).filter(([date]) => {
    if (dates.has(date)) {
      return false;
    }
    dates.add(date);
    return true;
  });

  const sortedTags = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  const tags = ['vibecoding', ...sortedTags.filter((tag) => tag !== 'vibecoding')];
  const top5Tags = new Set(tags.slice(0, 5));
  const colors = palette('mpn65', tags.length);
  const dataset = {
    dimentions: ['date', ...tags],
    source: trend.map(([date, tags]) => ({
      date,
      ...tags,
    })),
  };

  const chart = echarts.init(document.querySelector<HTMLDivElement>('#app')!, null, {
    renderer: 'svg',
  });
  chart.setOption({
    xAxis: {
      type: 'category',
      data: trend.map(([date]) => date).slice(-30),
    },
    yAxis: {
      type: 'value',
      min: 0,
    },
    grid: {
      bottom: '36%',
    },
    legend: {
      data: tags,
      selected: Object.fromEntries(tags.map((tag) => [tag, top5Tags.has(tag)])),
    },
    tooltip: {},
    dataset,
    series: tags.map((tag, i) => ({
      name: tag,
      type: 'line',
      itemStyle: {
        color: `#${colors[i]}`,
      },
    })),
  });
  window.addEventListener('resize', () => chart.resize());

}
