<script lang="ts">
  import uPlot from 'uplot';
  import 'uplot/dist/uPlot.min.css';
  import { fromMinorUnits, currencyDigits } from '../../shared/currency';

  let { series, currency }: {
    series: { name: string; color: string; points: { day: string; amountMinor: number }[] }[];
    currency: string;
  } = $props();

  let container: HTMLDivElement;
  let plot: uPlot | null = null;

  let bundle = $derived.by(() => {
    const daySet = new Set<string>();
    for (const s of series) for (const p of s.points) daySet.add(p.day);
    const days = [...daySet].sort();
    const xs = days.map((_, i) => i);
    const stacks = series.map(s => {
      const map = new Map(s.points.map(p => [p.day, p.amountMinor]));
      return days.map(d => fromMinorUnits(map.get(d) ?? 0, currency));
    });
    return { days, xs, stacks };
  });

  $effect(() => {
    if (!container) return;
    plot?.destroy();
    const cumulative: number[][] = [];
    let base = new Array(bundle.days.length).fill(0);
    for (const s of bundle.stacks) {
      const next = base.map((b, i) => b + s[i]);
      cumulative.push(next);
      base = next;
    }
    plot = new uPlot({
      width: container.clientWidth,
      height: 260,
      scales: { x: { time: false } },
      axes: [
        { values: (_u, splits) => splits.map(i => bundle.days[i] ?? '') },
        { values: (_u, splits) => splits.map(v => v.toFixed(currencyDigits(currency))) },
      ],
      series: [
        {},
        ...series.map((s, i) => ({
          label: s.name,
          stroke: s.color,
          fill: s.color + '55',
        })),
      ],
    }, [bundle.xs, ...cumulative], container);
  });
</script>

<div bind:this={container} class="chart"></div>

<style>.chart { width: 100%; }</style>
