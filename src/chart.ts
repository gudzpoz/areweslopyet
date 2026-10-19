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

interface Series {
  axisValue: string,
  color: string,
  dataIndex: number,
  seriesIndex: number,
}


export default function (data: string) {

  let total = 0;
  const totals: Record<string, number> = {};
  const allDates = data.split('\n').filter(
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
  });

  const sortedTags = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  const tags = ['vibecoding', ...sortedTags.filter((tag) => tag !== 'vibecoding')];
  const top5Tags = new Set(tags.slice(0, 5));

  function divide(arr: [string, ...number[]], n: number) {
    for (let i = 1; i < arr.length; i++) {
      (arr[i] as number) /= n;
    }
  }

  const rangeTrend: [number, number][][] = [];
  const trend: [string, ...number[]][] = [];
  let lastN = 0;
  let last: [string, ...number[]] | undefined = void 0;
  let ranges: [number, number][] | undefined = void 0;
  for (const [date, all] of allDates) {
    if (!last || last[0] !== date) {
      if (last) {
        divide(last, lastN);
        rangeTrend.push(ranges!);
        trend.push(last);
      }
      lastN = 1;
      const values = tags.map((tag) => all[tag] || 0);
      ranges = values.map((v) => [v, v]);
      last = [date, ...values];
    } else {
      for (let i = 0; i < tags.length; i++) {
        const v = all[tags[i]] || 0;
        (last[i + 1] as number) += v;
        const [min, max] = ranges![i];
        ranges![i][0] = Math.min(min, v);
        ranges![i][1] = Math.max(max, v);
      }
      lastN++;
    }
  }
  if (last) {
    divide(last, lastN);
    rangeTrend.push(ranges!);
    trend.push(last);
  }

  let visibleTrend = trend;
  let visibleRanges = rangeTrend;
  const colors = palette('mpn65', Math.min(tags.length, 65));
  if (colors.length < tags.length) {
    function shuffle(array: string[]) {
      for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = array[i];
          array[i] = array[j];
          array[j] = temp;
      }
    }
    let rest = palette('tol-rainbow', tags.length - colors.length);
    shuffle(rest);
    colors.push(...rest);
  }
  const dataset = {
    dimensions: ['date', ...tags],
    source: trend,
  };

  const chart = echarts.init(document.querySelector<HTMLDivElement>('#chart')!, null, {
    renderer: 'svg',
  });
  const option = {
    xAxis: {
      type: 'category',
      data: trend.map(([date]) => date),
    },
    yAxis: {
      type: 'value',
      min: 0,
    },
    grid: {
      bottom: '50%',
    },
    legend: {
      data: tags,
      selected: Object.fromEntries(tags.map((tag) => [tag, top5Tags.has(tag)])),
    },
    tooltip: {
      trigger: 'axis',
      className: 'tooltip',
      formatter: (params: Series[]) => {
        const date = visibleTrend[params[0].dataIndex][0];
        const rows = params.map(({ color, dataIndex, seriesIndex }) => {
          const min = visibleRanges[dataIndex][seriesIndex][0];
          const max = visibleRanges[dataIndex][seriesIndex][1];
          const name = tags[seriesIndex];
          const range = min === max ? `${min}` : `${min}~${max}`;
          return `<tr>
  <td class="tooltip-name">
    <span class="color" style="background-color: ${color}"></span>
    ${name}
  </td>
  <td class="tooltip-range">${range}</td>
</tr>`;
        });
        return `<div class="tooltip-date">${date}</div><table>${rows.join('')}</table>`;
      },
    },
    dataset,
    series: tags.map((tag, i) => ({
      name: tag,
      type: 'line',
      itemStyle: {
        color: `#${colors[i]}`,
      },
    })),
  };
  chart.setOption(option);

  function resize() {
    const container = document.querySelector<HTMLDivElement>('#app')!;
    const GRAPH_ROWS = 14;
    const AVG_WIDTH = 80;
    const width = container.offsetWidth;
    const requiredRows = Math.ceil(tags.length * AVG_WIDTH / width);
    const total = requiredRows * 1.8 + GRAPH_ROWS + 1;
    container.style.height = `${total}em`;
    option.grid.bottom = `${(1 - GRAPH_ROWS / total) * 100}%`;
    chart.setOption(option);
    chart.resize();
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    dates: trend.map(([date]) => date),
    setDateRange(start: string, end: string) {
      const indices = trend.flatMap(([date], index) =>
        date >= start && date <= end ? [index] : []);
      visibleTrend = indices.map((index) => trend[index]);
      visibleRanges = indices.map((index) => rangeTrend[index]);
      option.dataset.source = visibleTrend;
      option.xAxis.data = visibleTrend.map(([date]) => date);
      chart.dispatchAction({ type: 'hideTip' });
      chart.setOption({
        dataset: option.dataset,
        xAxis: option.xAxis,
      });
      return visibleTrend.length;
    },
  };
}
