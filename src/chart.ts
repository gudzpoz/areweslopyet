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

const ENTRIES_PER_DAY = 4;
const DAYS = 30;

export default function (data: string) {

  let total = 0;
  const totals: Record<string, number> = {};
  const allDates = data.split('\n').filter(
    (line) => line.trim() !== '' && !line.startsWith('date'),
  ).slice(-DAYS * ENTRIES_PER_DAY * 2).map((line) => {
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
  })

  const sortedTags = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  const tags = ['vibecoding', ...sortedTags.filter((tag) => tag !== 'vibecoding')];
  const top5Tags = new Set(tags.slice(0, 5));

  function divide(arr: [string, ...number[]], n: number) {
    for (let i = 1; i < arr.length; i++) {
      (arr[i] as number) /= n;
    }
  }

  const trend: [string, ...number[]][] = [];
  let lastN = 0;
  let last: [string, ...number[]] | undefined = void 0;
  for (const [date, all] of allDates) {
    if (!last || last[0] !== date) {
      if (last) {
        divide(last, lastN);
        trend.push(last);
      }
      lastN = 1;
      last = [date, ...tags.map((tag) => all[tag] || 0)];
    } else {
      for (let i = 0; i < tags.length; i++) {
        (last[i + 1] as number) += all[tags[i]] || 0;
      }
      lastN++;
    }
  }
  if (last) {
    divide(last, lastN);
    trend.push(last);
  }

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
    dimentions: ['date', ...tags],
    source: trend,
  };

  const chart = echarts.init(document.querySelector<HTMLDivElement>('#chart')!, null, {
    renderer: 'svg',
  });
  const option = {
    xAxis: {
      type: 'category',
      data: trend.map(([date]) => date).slice(-DAYS),
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
      valueFormatter: function (v: number | unknown) {
        if (typeof v === 'number') {
          if (v % 1 === 0) {
            return v.toFixed(0);
          }
          return `${Math.floor(v)}~${Math.ceil(v)}`;
        }
        return v;
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

}
