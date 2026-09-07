<script lang="ts">
  import { KNOWN_CURRENCIES } from '../../shared/currency';
  let { value, recent, onChange }: {
    value: string;
    recent: string[];
    onChange: (code: string) => void;
  } = $props();
  let open = $state(false);
  let ordered = $derived(
    [...new Set([...recent, ...KNOWN_CURRENCIES])] as string[]
  );
</script>

<button class="chip" onclick={() => open = !open}>{value} ▾</button>
{#if open}
  <div class="menu">
    {#each ordered as code}
      <button
        class:active={code === value}
        onclick={() => { onChange(code); open = false; }}
      >{code}</button>
    {/each}
  </div>
{/if}

<style>
  .chip {
    padding: 4px 10px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--fg);
    border-radius: 999px;
    font-size: 13px;
  }
  .menu {
    position: absolute;
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px;
    margin-top: 6px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    max-width: 260px;
  }
  .menu button {
    padding: 6px 10px;
    background: var(--bg);
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--fg);
  }
  .menu .active { border-color: var(--accent); }
</style>
