<script lang="ts">
  import { listTransactions, listCategories, upsertCategory, getSetting, setSetting, db } from '../../shared/db';
  import { exportJSON, exportCSV, importJSON, importCSV } from '../../shared/serializer';
  import { formatAmount, KNOWN_CURRENCIES } from '../../shared/currency';
  import type { Transaction, Category } from '../../shared/types';

  let transactions = $state<Transaction[]>([]);
  let categories = $state<Category[]>([]);
  let defaultCurrency = $state('CNY');
  let showingCatEditor = $state(false);

  $effect(() => { load(); });

  async function load() {
    transactions = await listTransactions();
    categories = await listCategories(true);
    defaultCurrency = await getSetting('default_currency', 'CNY');
  }

  function monthly(): { totalsByCurrency: Record<string, number>; count: number } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const list = transactions.filter(t => t.occurred_at >= from);
    const totals: Record<string, number> = {};
    for (const t of list) totals[t.currency] = (totals[t.currency] ?? 0) + t.amount;
    return { totalsByCurrency: totals, count: list.length };
  }

  async function doExport(kind: 'json' | 'csv') {
    const active = transactions.filter(t => t.deleted_at === null);
    const text = kind === 'json' ? exportJSON(active, categories) : exportCSV(active);
    const blob = new Blob([text], { type: kind === 'json' ? 'application/json' : 'text/csv' });
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `counting-${stamp}.${kind}`;
    if ('showSaveFilePicker' in window) {
      try {
        // @ts-expect-error non-standard
        const handle = await window.showSaveFilePicker({ suggestedName: filename });
        const w = await handle.createWritable();
        await w.write(blob);
        await w.close();
        return;
      } catch (_) { /* fallthrough */ }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    if (file.name.endsWith('.json')) {
      const { transactions: txs, categories: cats } = importJSON(text);
      await db.transactions.bulkPut(txs);
      await db.categories.bulkPut(cats);
    } else {
      const txs = importCSV(text);
      await db.transactions.bulkPut(txs);
    }
    await load();
  }

  async function setDefaultCurrency(c: string) {
    await setSetting('default_currency', c);
    defaultCurrency = c;
  }

  async function addCategory() {
    const name = prompt('分类名');
    if (!name) return;
    const icon = prompt('图标 emoji', '📌') ?? '📌';
    await upsertCategory({
      id: crypto.randomUUID(), name, icon,
      color: '#64748b',
      sort_order: categories.length,
      archived: false,
    });
    await load();
  }

  async function toggleArchive(c: Category) {
    await upsertCategory({ ...c, archived: !c.archived });
    await load();
  }
</script>

<div class="page">
  <section class="card">
    <div class="title">本月总览</div>
    {#each Object.entries(monthly().totalsByCurrency) as [cur, minor]}
      <div class="line"><span>总支出（{cur}）</span><span>{formatAmount(minor, cur)}</span></div>
    {/each}
    <div class="line"><span>笔数</span><span>{monthly().count}</span></div>
  </section>

  <section class="card">
    <div class="title">默认币种</div>
    <div class="chips">
      {#each KNOWN_CURRENCIES as c}
        <button class:active={c === defaultCurrency} onclick={() => setDefaultCurrency(c)}>{c}</button>
      {/each}
    </div>
  </section>

  <section class="card">
    <div class="title">数据</div>
    <button class="row-btn" onclick={() => doExport('json')}>导出 JSON</button>
    <button class="row-btn" onclick={() => doExport('csv')}>导出 CSV</button>
    <label class="row-btn">
      导入文件
      <input type="file" accept=".json,.csv" onchange={doImport} hidden />
    </label>
  </section>

  <section class="card">
    <div class="title">分类管理</div>
    {#each categories as c (c.id)}
      <div class="cat-row">
        <span>{c.icon} {c.name}</span>
        <button onclick={() => toggleArchive(c)}>{c.archived ? '取消归档' : '归档'}</button>
      </div>
    {/each}
    <button class="row-btn" onclick={addCategory}>新建分类</button>
  </section>
</div>

<style>
  .page { padding: 12px 12px 80px; display: flex; flex-direction: column; gap: 12px; }
  .card { background: var(--card); border-radius: var(--radius); padding: 14px; }
  .title { font-size: 13px; color: var(--fg-muted); margin-bottom: 8px; }
  .line { display: flex; justify-content: space-between; padding: 4px 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button {
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--fg);
  }
  .chips .active { border-color: var(--accent); color: var(--accent); }
  .row-btn {
    display: block;
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: var(--bg);
    color: var(--fg);
    text-align: left;
    margin-top: 6px;
  }
  .cat-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
  .cat-row button {
    padding: 4px 10px;
    background: var(--bg);
    color: var(--fg-muted);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
</style>
