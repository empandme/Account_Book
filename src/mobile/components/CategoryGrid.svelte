<script lang="ts">
  import type { Category } from '../../shared/types';
  let { categories, selectedId, onSelect }: {
    categories: Category[];
    selectedId: string | null;
    onSelect: (id: string) => void;
  } = $props();
</script>

<div class="grid">
  {#each categories as c (c.id)}
    <button class:selected={c.id === selectedId} onclick={() => onSelect(c.id)}>
      <span class="icon">{c.icon}</span>
      <span class="name">{c.name}</span>
    </button>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 12px;
  }
  button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 4px;
    border: 1px solid transparent;
    border-radius: var(--radius);
    background: var(--card);
    color: var(--fg);
  }
  .selected { border-color: var(--accent); }
  .icon { font-size: 24px; }
  .name { font-size: 12px; color: var(--fg-muted); }
</style>
