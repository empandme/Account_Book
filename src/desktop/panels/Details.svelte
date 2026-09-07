<script lang="ts">
  import type { Transaction } from '../../shared/types';
  import { formatAmount, fromMinorUnits } from '../../shared/currency';

  let { transactions, currency }: {
    transactions: Transaction[];
    currency: string;
  } = $props();

  let sortField = $state<'occurred_at' | 'amount' | 'category'>('occurred_at');
  let sortAsc = $state(false);

  let sorted = $derived.by(() => {
    const arr = [...transactions];
    arr.sort((a, b) => {
      const av = a[sortField] as string | number;
      const bv = b[sortField] as string | number;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  });

  let summary = $derived.by(() => {
    const total = transactions.reduce((s, t) => s + t.amount, 0);
    const count = transactions.length;
    const days = new Set(transactions.map(t => t.occurred_at.slice(0,10))).size || 1;
    const avg = total / days;
    const max = Math.max(0, ...transactions.map(t => t.amount));
    return { total, count, avg, max };
  });

  function setSort(field: typeof sortField) {
    if (sortField === field) sortAsc = !sortAsc;
    else { sortField = field; sortAsc = false; }
  }
</script>

<div class="panel">
  <div class="summary">
    <div><span class="k">总支出</span><span class="v">{formatAmount(summary.total, currency)}</span></div>
    <div><span class="k">日均</span><span class="v">{formatAmount(Math.round(summary.avg), currency)}</span></div>
    <div><span class="k">最大单笔</span><span class="v">{formatAmount(summary.max, currency)}</span></div>
    <div><span class="k">笔数</span><span class="v">{summary.count}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th onclick={() => setSort('occurred_at')}>日期</th>
        <th onclick={() => setSort('category')}>分类</th>
        <th>备注</th>
        <th onclick={() => setSort('amount')}>金额</th>
      </tr>
    </thead>
    <tbody>
      {#each sorted as t}
        <tr>
          <td>{t.occurred_at.slice(0, 16).replace('T', ' ')}</td>
          <td>{t.category}</td>
          <td class="note">{t.note}</td>
          <td class="amt">{formatAmount(t.amount, currency)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .panel { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
  .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .summary > div { display: flex; flex-direction: column; padding: 10px; background: var(--card); border-radius: 8px; }
  .k { font-size: 11px; color: var(--fg-muted); }
  .v { font-size: 18px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border); }
  th { cursor: pointer; color: var(--fg-muted); font-weight: 500; }
  .amt { font-variant-numeric: tabular-nums; text-align: right; }
  .note { color: var(--fg-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
