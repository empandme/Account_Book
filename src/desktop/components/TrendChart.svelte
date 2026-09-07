<script lang="ts">
  import uPlot from 'uplot';
  import 'uplot/dist/uPlot.min.css';
  import { fromMinorUnits, currencyDigits } from '../../shared/currency';

  let { points, currency, granularity }: {
    points: { day: string; amountMinor: number }[];
    currency: string;
    granularity: 'day' | 'week' | 'month';
  } = $props();

  let container: HTMLDivElement;
  let plot: uPlot | null = null;

  function bucketKey(dayISO: string): string {
    if (granularity === 'day') return dayISO;
    const d = new Date(dayISO);
    if (granularity === 'month') return dayISO.slice(0, 7);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.floor(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay()) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
  }

  let series = $derived.by(() => {
    const buckets = new Map<string, number>();
    for (const p of points) {
      const k = bucketKey(p.day);
      buckets.set(k, (buckets.get(k) ?? 0) + p.amountMinor);
    }
    const keys = [...buckets.keys()].sort();
    const xs = keys.map((_, i) => i);
    const ys = keys.map(k => fromMinorUnits(buckets.get(k)!, currency));
    return { keys, xs, ys };
  });

  $effect(() => {
    if (!container) return;
    plot?.destroy();
    plot = new uPlot({
      width: container.clientWidth,
      height: 240,
      scales: { x: { time: false } },
      axes: [
        { values: (_u, splits) => splits.map(i => series.keys[i] ?? '') },
        { values: (_u, splits) => splits.map(v => v.toFixed(currencyDigits(currency))) },
      ],
      series: [
        {},
        { label: currency, stroke: 'var(--accent)', fill: 'var(--accent)', paths: uPlot.paths.bars!({ size: [0.6] }) },
      ],
    }, [series.xs, series.ys], container);
  });
</script>

<div bind:this={container} class="chart" />

<style>
  .chart { width: 100%; }
  :global(.uplot .u-legend) { color: var(--fg); }
</style>
