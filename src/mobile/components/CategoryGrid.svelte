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
    gap: 10px;
    padding: 8px 12px 12px;
  }
  button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 4px 10px;
    border: 1.5px solid transparent;
    border-radius: 14px;
    background: var(--card);
    color: var(--fg);
    transition: transform 0.08s, border-color 0.12s;
  }
  button:active { transform: scale(0.97); }
  .selected {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, var(--card));
  }
  .icon { font-size: 26px; line-height: 1; }
  .name { font-size: 12px; color: var(--fg-muted); }
  .selected .name { color: var(--accent); font-weight: 500; }
</style>
