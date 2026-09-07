<script lang="ts">
  import { listTransactions, softDeleteTransaction, listCategories } from '../../shared/db';
  import { formatAmount } from '../../shared/currency';
  import type { Transaction, Category } from '../../shared/types';

  let transactions = $state<Transaction[]>([]);
  let categories = $state<Category[]>([]);
  let selected = $state<Transaction | null>(null);

  $effect(() => { load(); });

  async function load() {
    transactions = await listTransactions();
    categories = await listCategories(true);
  }

  function dayKey(iso: string): string {
    return iso.slice(0, 10);
  }

  let grouped = $derived.by(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const k = dayKey(t.occurred_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return [...map.entries()];
  });

  function dayTotals(list: Transaction[]): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const t of list) totals[t.currency] = (totals[t.currency] ?? 0) + t.amount;
    return totals;
  }

  function iconOf(catName: string): string {
    return categories.find(c => c.name === catName)?.icon ?? '📌';
  }

  function friendlyDay(key: string): string {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (key === today) return '今天';
    if (key === yesterday) return '昨天';
    return key;
  }

  async function onDelete(t: Transaction) {
    await softDeleteTransaction(t.id);
    selected = null;
    await load();
  }
</script>

<div class="page">
  {#each grouped as [day, list] (day)}
    <div class="day-header">
      <span>{friendlyDay(day)}</span>
      <span class="totals">
        {#each Object.entries(dayTotals(list)) as [cur, minor]}
          <span>{formatAmount(minor, cur)}</span>
        {/each}
      </span>
    </div>
    {#each list as t (t.id)}
      <button class="row" onclick={() => selected = t}>
        <span class="icon">{iconOf(t.category)}</span>
        <span class="body">
          <span class="cat">{t.category}</span>
          <span class="note">{t.note}</span>
        </span>
        <span class="amt">{formatAmount(t.amount, t.currency)}</span>
      </button>
    {/each}
  {/each}
</div>

{#if selected}
  <div
    class="modal"
    role="button"
    tabindex="0"
    onclick={() => selected = null}
    onkeydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') selected = null; }}
  >
    <div class="sheet" role="presentation" onclick={(e) => e.stopPropagation()}>
      <div class="title">{selected.category} · {formatAmount(selected.amount, selected.currency)}</div>
      <div class="note">{selected.note}</div>
      <div class="actions">
        <button class="danger" onclick={() => onDelete(selected!)}>删除</button>
        <button onclick={() => selected = null}>取消</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { padding-bottom: 60px; }
  .day-header {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px 4px;
    color: var(--fg-muted);
    font-size: 13px;
  }
  .day-header .totals { display: flex; gap: 8px; }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 16px;
    background: transparent;
    border: none;
    color: var(--fg);
    text-align: left;
  }
  .row:active { background: var(--border); }
  .icon { font-size: 22px; }
  .body { flex: 1; display: flex; flex-direction: column; }
  .cat { font-size: 15px; }
  .note { font-size: 12px; color: var(--fg-muted); }
  .amt { font-size: 15px; font-variant-numeric: tabular-nums; }
  .modal {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex; align-items: flex-end; justify-content: center;
  }
  .sheet {
    background: var(--card);
    width: 100%;
    max-width: 480px;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    padding: 20px 16px 24px;
  }
  .title { font-size: 17px; font-weight: 600; margin-bottom: 4px; }
  .note { color: var(--fg-muted); margin-bottom: 16px; }
  .actions { display: flex; gap: 12px; }
  .actions button {
    flex: 1;
    padding: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--fg);
    border-radius: var(--radius);
  }
  .danger { color: var(--danger); border-color: var(--danger); }
</style>
