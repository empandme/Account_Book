<script lang="ts">
  import Record from './pages/Record.svelte';
  import Ledger from './pages/Ledger.svelte';
  import Me from './pages/Me.svelte';

  let tab = $state<'record' | 'ledger' | 'me'>('record');
</script>

<main>
  {#if tab === 'record'}<Record onSaved={() => tab = 'ledger'} />
  {:else if tab === 'ledger'}<Ledger />
  {:else}<Me />
  {/if}
</main>

<nav>
  <button class:active={tab === 'record'} onclick={() => tab = 'record'}>
    <span class="tab-icon">✎</span>
    <span class="tab-label">记账</span>
  </button>
  <button class:active={tab === 'ledger'} onclick={() => tab = 'ledger'}>
    <span class="tab-icon">☰</span>
    <span class="tab-label">流水</span>
  </button>
  <button class:active={tab === 'me'} onclick={() => tab = 'me'}>
    <span class="tab-icon">◉</span>
    <span class="tab-label">我的</span>
  </button>
</nav>

<style>
  main {
    padding-top: env(safe-area-inset-top);
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
    min-height: 100vh;
  }
  nav {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: color-mix(in srgb, var(--card) 92%, transparent);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-top: 1px solid var(--border);
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 50;
  }
  nav button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px 6px;
    border: none;
    background: transparent;
    color: var(--fg-muted);
    font-size: 11px;
  }
  .tab-icon { font-size: 18px; line-height: 1; }
  .tab-label { font-size: 11px; letter-spacing: 0.5px; }
  nav .active { color: var(--accent); }
</style>
