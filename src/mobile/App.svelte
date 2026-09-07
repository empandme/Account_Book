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
  <button class:active={tab === 'record'} onclick={() => tab = 'record'}>记账</button>
  <button class:active={tab === 'ledger'} onclick={() => tab = 'ledger'}>流水</button>
  <button class:active={tab === 'me'} onclick={() => tab = 'me'}>我的</button>
</nav>

<style>
  main {
    padding-bottom: 64px;
    min-height: 100vh;
  }
  nav {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: var(--card);
    border-top: 1px solid var(--border);
    padding-bottom: env(safe-area-inset-bottom);
  }
  nav button {
    padding: 12px;
    border: none;
    background: transparent;
    color: var(--fg-muted);
    font-size: 13px;
  }
  nav .active { color: var(--accent); }
</style>
