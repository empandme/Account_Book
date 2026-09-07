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
  .tabs {
    display: flex;
    gap: 4px;
    padding: 3px;
    background: var(--bg);
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  button {
    padding: 4px 14px;
    border: none;
    background: transparent;
    color: var(--fg-muted);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  button:hover { color: var(--fg); }
  .active {
    background: var(--card);
    color: var(--accent);
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  }
</style>
