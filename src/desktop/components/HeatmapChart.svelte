<script lang="ts">
  import { fromMinorUnits, formatAmount } from '../../shared/currency';

  let { points, currency, year }: {
    points: { day: string; amountMinor: number }[];
    currency: string;
    year: number;
  } = $props();

  let byDay = $derived.by(() => {
    const m = new Map<string, number>();
    for (const p of points) m.set(p.day, (m.get(p.day) ?? 0) + p.amountMinor);
    return m;
  });
  let max = $derived(Math.max(1, ...[...byDay.values()]));

  function cells() {
    const arr: { x: number; y: number; day: string; v: number }[] = [];
    const start = new Date(year, 0, 1);
    const startWeekday = start.getDay();
    for (let d = 0; d < 366; d++) {
      const date = new Date(year, 0, 1 + d);
      if (date.getFullYear() !== year) break;
      const dayISO = date.toISOString().slice(0, 10);
      const offset = d + startWeekday;
      arr.push({ x: Math.floor(offset / 7), y: offset % 7, day: dayISO, v: byDay.get(dayISO) ?? 0 });
    }
    return arr;
  }

  function color(v: number): string {
    if (v === 0) return 'var(--border)';
    const t = Math.min(1, v / max);
    const alpha = 0.15 + t * 0.85;
    return `rgba(16,185,129,${alpha})`;
  }
</script>

<div class="wrap">
  <svg viewBox="0 0 800 130" width="100%">
    {#each cells() as c}
      <rect x={c.x * 14} y={c.y * 14} width="12" height="12" rx="2" fill={color(c.v)}>
        <title>{c.day}: {formatAmount(c.v, currency)}</title>
      </rect>
    {/each}
  </svg>
</div>

<style>
  .wrap { padding: 12px; overflow-x: auto; }
</style>
