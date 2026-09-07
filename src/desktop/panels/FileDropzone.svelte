<script lang="ts">
  import { importJSON, importCSV } from '../../shared/serializer';
  import type { Transaction, Category } from '../../shared/types';

  let { onLoaded }: {
    onLoaded: (data: { transactions: Transaction[]; categories: Category[] }) => void;
  } = $props();

  let dragOver = $state(false);
  let error = $state('');

  async function handleFiles(files: FileList) {
    error = '';
    const allTx: Transaction[] = [];
    const allCat: Category[] = [];
    for (const f of Array.from(files)) {
      const text = await f.text();
      try {
        if (f.name.toLowerCase().endsWith('.json')) {
          const { transactions, categories } = importJSON(text);
          allTx.push(...transactions);
          allCat.push(...categories);
        } else {
          allTx.push(...importCSV(text));
        }
      } catch (e) {
        error = `${f.name} 解析失败：${(e as Error).message}`;
        return;
      }
    }
    const seen = new Set<string>();
    const dedupTx = allTx.filter(t => (seen.has(t.id) ? false : (seen.add(t.id), true)));
    const seenC = new Set<string>();
    const dedupCat = allCat.filter(c => (seenC.has(c.id) ? false : (seenC.add(c.id), true)));
    onLoaded({ transactions: dedupTx, categories: dedupCat });
  }
</script>

<div
  class="zone"
  class:over={dragOver}
  role="button"
  tabindex="0"
  ondragover={(e) => { e.preventDefault(); dragOver = true; }}
  ondragleave={() => dragOver = false}
  ondrop={(e) => {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  }}
  onkeydown={() => {}}
>
  <div class="msg">
    <p>拖入或选择 CSV / JSON 文件</p>
    <label class="btn">
      选择文件
      <input type="file" accept=".json,.csv" multiple
        onchange={(e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files) handleFiles(files);
        }} hidden />
    </label>
  </div>
  {#if error}<div class="err">{error}</div>{/if}
</div>

<style>
  .zone {
    display: flex; align-items: center; justify-content: center;
    height: 240px;
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    background: var(--card);
    margin: 40px;
  }
  .zone.over { border-color: var(--accent); background: var(--bg); }
  .msg { text-align: center; color: var(--fg-muted); }
  .btn {
    display: inline-block;
    margin-top: 12px;
    padding: 10px 16px;
    background: var(--accent);
    color: white;
    border-radius: 8px;
    cursor: pointer;
  }
  .err { color: var(--danger); margin-top: 12px; }
</style>
