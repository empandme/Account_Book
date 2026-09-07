<script lang="ts" module>
  export type FilterState = {
    from: string;
    to: string;
    categories: string[];
    minAmount: number | null;
    maxAmount: number | null;
    noteQuery: string;
  };
</script>

<script lang="ts">
  import type { Transaction } from '../../shared/types';

  let { all, filters, onFiltersChange }: {
    all: Transaction[];
    filters: FilterState;
    onFiltersChange: (f: FilterState) => void;
  } = $props();

  let cats = $derived([...new Set(all.map(t => t.category))]);

  function patch(p: Partial<FilterState>) {
    onFiltersChange({ ...filters, ...p });
  }

  function preset(kind: 'this-month' | 'last-month' | 'this-semester' | 'all') {
    const now = new Date();
    if (kind === 'all') { patch({ from: '', to: '' }); return; }
    if (kind === 'this-month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
      patch({ from, to: '' }); return;
    }
    if (kind === 'last-month') {
      const from = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,10);
      const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0,10);
      patch({ from, to }); return;
    }
    const semesterStartMonth = now.getMonth() < 6 ? 1 : 8;
    const from = new Date(now.getFullYear(), semesterStartMonth - 1, 1).toISOString().slice(0,10);
    patch({ from, to: '' });
  }
</script>

<div class="panel">
  <div class="group">
    <div class="label">时间范围</div>
    <div class="chips">
      <button onclick={() => preset('this-month')}>本月</button>
      <button onclick={() => preset('last-month')}>上月</button>
      <button onclick={() => preset('this-semester')}>本学期</button>
      <button onclick={() => preset('all')}>全部</button>
    </div>
    <div class="row">
      <input type="date" value={filters.from} oninput={(e) => patch({ from: (e.target as HTMLInputElement).value })} />
      <span>—</span>
      <input type="date" value={filters.to} oninput={(e) => patch({ to: (e.target as HTMLInputElement).value })} />
    </div>
  </div>

  <div class="group">
    <div class="label">分类</div>
    <div class="chips">
      {#each cats as c}
        <button
          class:active={filters.categories.includes(c)}
          onclick={() => patch({
            categories: filters.categories.includes(c)
              ? filters.categories.filter(x => x !== c)
              : [...filters.categories, c]
          })}
        >{c}</button>
      {/each}
    </div>
  </div>

  <div class="group">
    <div class="label">金额区间（当前币种）</div>
    <div class="row">
      <input type="number" placeholder="min"
        value={filters.minAmount ?? ''}
        oninput={(e) => {
          const v = (e.target as HTMLInputElement).value;
          patch({ minAmount: v === '' ? null : Number(v) });
        }} />
      <input type="number" placeholder="max"
        value={filters.maxAmount ?? ''}
        oninput={(e) => {
          const v = (e.target as HTMLInputElement).value;
          patch({ maxAmount: v === '' ? null : Number(v) });
        }} />
    </div>
  </div>

  <div class="group">
    <div class="label">备注关键词</div>
    <input type="text" value={filters.noteQuery}
      oninput={(e) => patch({ noteQuery: (e.target as HTMLInputElement).value })} />
  </div>
</div>

<style>
  .panel { padding: 16px; display: flex; flex-direction: column; gap: 20px; }
  .group { display: flex; flex-direction: column; gap: 8px; }
  .label { font-size: 12px; color: var(--fg-muted); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button {
    padding: 4px 10px;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 999px;
    cursor: pointer;
  }
  .chips .active { border-color: var(--accent); color: var(--accent); }
  .row { display: flex; gap: 8px; align-items: center; }
  .row input, .group > input {
    flex: 1;
    padding: 6px 10px;
    background: var(--card);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
</style>
