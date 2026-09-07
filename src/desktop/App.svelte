<script lang="ts">
  import FileDropzone from './panels/FileDropzone.svelte';
  import Filters from './panels/Filters.svelte';
  import type { FilterState } from './panels/Filters.svelte';
  import Charts from './panels/Charts.svelte';
  import Details from './panels/Details.svelte';
  import CurrencyTabs from './components/CurrencyTabs.svelte';
  import type { Transaction, Category } from '../shared/types';
  import { fromMinorUnits } from '../shared/currency';

  let loaded = $state<{ transactions: Transaction[]; categories: Category[] } | null>(null);
  let currency = $state('CNY');
  let filters = $state<FilterState>({
    from: '', to: '', categories: [], minAmount: null, maxAmount: null, noteQuery: '',
  });

  let currencies = $derived(
    loaded ? [...new Set(loaded.transactions.map(t => t.currency))].sort() : []
  );

  $effect(() => {
    if (currencies.length > 0 && !currencies.includes(currency)) currency = currencies[0];
  });

  let filtered = $derived.by(() => {
    if (!loaded) return [];
    return loaded.transactions.filter(t => {
      if (t.currency !== currency) return false;
      if (t.deleted_at !== null) return false;
      if (filters.from && t.occurred_at.slice(0,10) < filters.from) return false;
      if (filters.to && t.occurred_at.slice(0,10) > filters.to) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(t.category)) return false;
      const majorAmount = fromMinorUnits(t.amount, t.currency);
      if (filters.minAmount !== null && majorAmount < filters.minAmount) return false;
      if (filters.maxAmount !== null && majorAmount > filters.maxAmount) return false;
      if (filters.noteQuery && !t.note.toLowerCase().includes(filters.noteQuery.toLowerCase())) return false;
      return true;
    });
  });

  let summary = $derived.by(() => {
    if (!loaded) return null;
    const txs = loaded.transactions.filter(t => t.deleted_at === null);
    if (txs.length === 0) return null;
    const dates = txs.map(t => t.occurred_at.slice(0, 10)).sort();
    return { count: txs.length, from: dates[0], to: dates[dates.length - 1] };
  });

  function exportPDF() {
    window.print();
  }

  async function exportPNG() {
    const midEl = document.querySelector('.mid') as HTMLElement | null;
    if (!midEl) return;
    const width = midEl.scrollWidth;
    const height = midEl.scrollHeight;
    const canvases = midEl.querySelectorAll('canvas');
    const svgs = midEl.querySelectorAll('svg');
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = getComputedStyle(midEl).backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    const midRect = midEl.getBoundingClientRect();
    for (const c of Array.from(canvases)) {
      const r = c.getBoundingClientRect();
      ctx.drawImage(c, r.left - midRect.left, r.top - midRect.top + midEl.scrollTop);
    }
    for (const s of Array.from(svgs)) {
      const xml = new XMLSerializer().serializeToString(s);
      const img = new Image();
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
      await new Promise<void>((res) => { img.onload = () => res(); });
      const r = s.getBoundingClientRect();
      ctx.drawImage(img, r.left - midRect.left, r.top - midRect.top + midEl.scrollTop, r.width, r.height);
    }
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `counting-${currency}-${new Date().toISOString().slice(0,10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
</script>

{#if !loaded}
  <FileDropzone onLoaded={(d) => loaded = d} />
{:else}
  <header class="topbar">
    <div class="brand">
      <span class="logo">¥</span>
      <span class="title">记账 · 分析</span>
    </div>
    <div class="center">
      <CurrencyTabs currencies={currencies} value={currency} onChange={(c) => currency = c} />
      {#if summary}
        <span class="meta">{summary.count} 笔 · {summary.from} → {summary.to}</span>
      {/if}
    </div>
    <div class="actions">
      <button class="ghost" onclick={() => { loaded = null; }}>重新导入</button>
      <button onclick={exportPDF}>导出 PDF</button>
      <button class="primary" onclick={exportPNG}>导出 PNG</button>
    </div>
  </header>
  <div class="three">
    <aside class="left">
      <Filters all={loaded.transactions.filter(t => t.currency === currency)}
        filters={filters}
        onFiltersChange={(f) => filters = f} />
    </aside>
    <main class="mid">
      <Charts transactions={filtered} currency={currency} />
    </main>
    <aside class="right">
      <Details transactions={filtered} currency={currency} />
    </aside>
  </div>
{/if}

<style>
  .three {
    display: grid;
    grid-template-columns: 280px 1fr 380px;
    height: calc(100vh - 56px);
  }
  .left, .right { overflow-y: auto; border-right: 1px solid var(--border); }
  .right { border-right: none; border-left: 1px solid var(--border); }
  .mid { overflow-y: auto; }

  .topbar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 20px;
    height: 56px;
    padding: 0 20px;
    border-bottom: 1px solid var(--border);
    background: var(--card);
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    font-weight: 700;
    font-size: 16px;
  }
  .title {
    font-size: 15px;
    font-weight: 600;
    color: var(--fg);
    letter-spacing: 0.2px;
  }
  .center {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }
  .meta {
    font-size: 12px;
    color: var(--fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .actions { display: flex; gap: 8px; }
  .actions button {
    padding: 6px 14px;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
  }
  .actions button:hover { border-color: var(--accent); color: var(--accent); }
  .actions .ghost { background: transparent; color: var(--fg-muted); }
  .actions .primary {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .actions .primary:hover { color: white; opacity: 0.9; }

  @media print {
    .left, .right, .topbar { display: none !important; }
    .mid { overflow: visible !important; height: auto !important; }
    .three { display: block !important; height: auto !important; grid-template-columns: none !important; }
  }
</style>
