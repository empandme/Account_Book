<script lang="ts">
  let { currencies, value, onChange }: {
    currencies: string[];
    value: string;
    onChange: (c: string) => void;
  } = $props();
</script>

<div class="tabs">
  {#each currencies as c}
    <button class:active={c === value} onclick={() => onChange(c)}>{c}</button>
  {/each}
</div>

<style>
  .tabs { display: flex; gap: 4px; padding: 8px 16px; border-bottom: 1px solid var(--border); }
  button {
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: var(--fg-muted);
    border-bottom: 2px solid transparent;
    cursor: pointer;
  }
  .active { color: var(--accent); border-bottom-color: var(--accent); }
</style>
