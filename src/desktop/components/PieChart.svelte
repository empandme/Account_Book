<script lang="ts">
  import { formatAmount } from '../../shared/currency';

  let { slices, currency }: {
    slices: { label: string; value: number; color: string }[];
    currency: string;
  } = $props();

  let total = $derived(slices.reduce((s, x) => s + x.value, 0));

  function arcs(): { path: string; color: string; label: string; value: number }[] {
    if (total === 0) return [];
    const nonZero = slices.filter(s => s.value > 0);
    if (nonZero.length === 1) {
      return [{ path: '', color: nonZero[0].color, label: nonZero[0].label, value: nonZero[0].value }];
    }
    let acc = 0;
    const R = 80;
    const cx = 100, cy = 100;
    return slices.map(s => {
      const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += s.value;
      const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + R * Math.cos(start);
      const y1 = cy + R * Math.sin(start);
      const x2 = cx + R * Math.cos(end);
      const y2 = cy + R * Math.sin(end);
      const large = end - start > Math.PI ? 1 : 0;
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
      return { path, color: s.color, label: s.label, value: s.value };
    });
  }
</script>

<div class="wrap">
  <svg viewBox="0 0 200 200" width="200" height="200">
    {#each arcs() as a}
      {#if a.path}
        <path d={a.path} fill={a.color} stroke="var(--card)" stroke-width="1" />
      {:else}
        <circle cx="100" cy="100" r="80" fill={a.color} />
      {/if}
    {/each}
  </svg>
  <ul class="legend">
    {#each slices as s}
      <li>
        <span class="dot" style="background: {s.color}"></span>
        <span class="lbl">{s.label}</span>
        <span class="v">{formatAmount(s.value, currency)}</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .wrap { display: flex; gap: 24px; align-items: center; }
  .legend { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .dot { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
  .lbl { flex: 1; }
  .v { font-variant-numeric: tabular-nums; color: var(--fg-muted); }
</style>
