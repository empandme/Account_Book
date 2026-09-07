<script lang="ts">
  import { listTransactions, softDeleteTransaction, updateTransaction, listCategories } from '../../shared/db';
  import { formatAmount, fromMinorUnits, toMinorUnits, currencyDigits, KNOWN_CURRENCIES } from '../../shared/currency';
  import type { Transaction, Category } from '../../shared/types';

  let transactions = $state<Transaction[]>([]);
  let categories = $state<Category[]>([]);
  let selected = $state<Transaction | null>(null);
  let editing = $state(false);
  let editAmount = $state('');
  let editCurrency = $state('CNY');
  let editCategoryId = $state<string | null>(null);
  let editNote = $state('');
  let editOccurredAt = $state('');

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

  function toLocalDT(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocalDT(local: string): string {
    return new Date(local).toISOString();
  }

  function beginEdit(t: Transaction) {
    editAmount = fromMinorUnits(t.amount, t.currency).toFixed(currencyDigits(t.currency));
    editCurrency = t.currency;
    editCategoryId = categories.find(c => c.name === t.category)?.id ?? null;
    editNote = t.note;
    editOccurredAt = t.occurred_at;
    editing = true;
  }

  async function saveEdit() {
    if (!selected) return;
    const major = parseFloat(editAmount);
    if (isNaN(major) || major <= 0) return;
    const cat = categories.find(c => c.id === editCategoryId);
    await updateTransaction(selected.id, {
      amount: toMinorUnits(major, editCurrency),
      currency: editCurrency,
      category: cat?.name ?? selected.category,
      note: editNote,
      occurred_at: editOccurredAt,
    });
    closeModal();
    await load();
  }

  function closeModal() {
    selected = null;
    editing = false;
  }

  async function onDelete(t: Transaction) {
    await softDeleteTransaction(t.id);
    closeModal();
    await load();
  }
</script>

<div class="page">
  {#if transactions.length === 0}
    <div class="empty">
      <div class="empty-icon">📖</div>
      <div class="empty-title">还没有账目</div>
      <div class="empty-hint">切到"记账"记第一笔</div>
    </div>
  {:else}
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
  {/if}
</div>

{#if selected}
  <div
    class="modal"
    role="button"
    tabindex="0"
    onclick={closeModal}
    onkeydown={(e) => { if (e.key === 'Escape') closeModal(); }}
  >
    <div class="sheet" role="presentation" onclick={(e) => e.stopPropagation()}>
      {#if editing}
        <div class="title">编辑</div>
        <div class="field">
          <div class="lbl">金额</div>
          <div class="row-inline">
            <input class="amt-input" type="text" inputmode="decimal" bind:value={editAmount} />
            <select class="cur-sel" bind:value={editCurrency}>
              {#each KNOWN_CURRENCIES as c}<option value={c}>{c}</option>{/each}
            </select>
          </div>
        </div>
        <div class="field">
          <div class="lbl">分类</div>
          <select class="full" bind:value={editCategoryId}>
            {#each categories.filter(c => !c.archived) as c}
              <option value={c.id}>{c.icon} {c.name}</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <div class="lbl">备注</div>
          <input class="full" type="text" bind:value={editNote} />
        </div>
        <div class="field">
          <div class="lbl">时间</div>
          <input
            class="full"
            type="datetime-local"
            value={toLocalDT(editOccurredAt)}
            oninput={(e) => editOccurredAt = fromLocalDT((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="actions">
          <button class="danger" onclick={() => onDelete(selected!)}>删除</button>
          <button class="submit" onclick={saveEdit}>保存</button>
        </div>
      {:else}
        <div class="title">{selected.category} · {formatAmount(selected.amount, selected.currency)}</div>
        <div class="note">{selected.note || '（无备注）'}</div>
        <div class="time">{selected.occurred_at.slice(0, 16).replace('T', ' ')}</div>
        <div class="actions">
          <button onclick={() => beginEdit(selected!)}>编辑</button>
          <button class="danger" onclick={() => onDelete(selected!)}>删除</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .page { padding: 16px 0 12px; }
  .day-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 16px 20px 6px;
    color: var(--fg-muted);
    font-size: 12px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
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
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    gap: 6px;
  }
  .empty-icon { font-size: 44px; margin-bottom: 8px; }
  .empty-title { font-size: 16px; font-weight: 600; color: var(--fg); }
  .empty-hint { font-size: 13px; color: var(--fg-muted); }
  .modal {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex; align-items: flex-end; justify-content: center;
    z-index: 100;
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
  .note { color: var(--fg-muted); margin-bottom: 8px; }
  .time { color: var(--fg-muted); font-size: 12px; margin-bottom: 16px; }
  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
  .field .lbl { font-size: 12px; color: var(--fg-muted); }
  .row-inline { display: flex; gap: 8px; }
  .amt-input { flex: 1; }
  .cur-sel { width: 88px; }
  .field input, .field select, .full {
    padding: 10px;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 15px;
  }
  .actions { display: flex; gap: 12px; margin-top: 12px; }
  .actions button {
    flex: 1;
    padding: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--fg);
    border-radius: var(--radius);
  }
  .danger { color: var(--danger); border-color: var(--danger); }
  .submit { background: var(--accent); color: white; border-color: var(--accent); }
</style>
