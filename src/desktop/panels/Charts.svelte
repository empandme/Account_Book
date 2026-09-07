<script lang="ts">
  import type { Transaction } from '../../shared/types';
  import TrendChart from '../components/TrendChart.svelte';
  import PieChart from '../components/PieChart.svelte';
  import StackedAreaChart from '../components/StackedAreaChart.svelte';
  import HeatmapChart from '../components/HeatmapChart.svelte';

  let { transactions, currency }: { transactions: Transaction[]; currency: string } = $props();

  let granularity = $state<'day' | 'week' | 'month'>('day');

  let trendPoints = $derived(
    transactions.map(t => ({ day: t.occurred_at.slice(0, 10), amountMinor: t.amount }))
  );

  let pieSlices = $derived.by(() => {
    const m = new Map<string, number>();
    for (const t of transactions) m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
    const palette = ['#f97316', '#0ea5e9', '#ec4899', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#64748b'];
    return [...m.entries()].map(([label, value], i) => ({
      label, value, color: palette[i % palette.length],
    }));
  });

  let areaSeries = $derived.by(() => {
    const byCat = new Map<string, Map<string, number>>();
    for (const t of transactions) {
      if (!byCat.has(t.category)) byCat.set(t.category, new Map());
      const inner = byCat.get(t.category)!;
      const d = t.occurred_at.slice(0, 10);
      inner.set(d, (inner.get(d) ?? 0) + t.amount);
    }
    const palette = ['#f97316', '#0ea5e9', '#ec4899', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#64748b'];
    return [...byCat.entries()].map(([name, map], i) => ({
      name,
      color: palette[i % palette.length],
      points: [...map.entries()].map(([day, amountMinor]) => ({ day, amountMinor })),
    }));
  });

  let year = $derived(
    transactions.length > 0 ? new Date(transactions[0].occurred_at).getFullYear() : new Date().getFullYear()
  );
</script>

<div class="charts">
  <section>
    <header>
      <h3>时间趋势</h3>
      <div class="chips">
        {#each ['day','week','month'] as g}
          <button class:active={g === granularity} onclick={() => granularity = g as any}>{g}</button>
        {/each}
      </div>
    </header>
    <TrendChart points={trendPoints} currency={currency} granularity={granularity} />
  </section>

  <section>
    <h3>分类占比</h3>
    <PieChart slices={pieSlices} currency={currency} />
  </section>

  <section>
    <h3>分类趋势</h3>
    <StackedAreaChart series={areaSeries} currency={currency} />
  </section>

  <section>
    <h3>年度日历热力</h3>
    <HeatmapChart points={trendPoints} currency={currency} year={year} />
  </section>
</div>

<style>
  .charts { display: flex; flex-direction: column; gap: 24px; padding: 16px; overflow-y: auto; }
  section { background: var(--card); border-radius: var(--radius); padding: 16px; }
  h3 { font-size: 14px; margin: 0 0 12px; color: var(--fg-muted); font-weight: 500; }
  header { display: flex; justify-content: space-between; align-items: center; }
  .chips button {
    padding: 3px 8px;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 999px;
    margin-left: 4px;
    cursor: pointer;
    font-size: 11px;
  }
  .chips .active { border-color: var(--accent); color: var(--accent); }
</style>
