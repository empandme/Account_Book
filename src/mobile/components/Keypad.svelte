<script lang="ts">
  import { currencyDigits } from '../../shared/currency';

  let { value, currency, onChange, onSubmit }: {
    value: string;
    currency: string;
    onChange: (next: string) => void;
    onSubmit: () => void;
  } = $props();

  let digits = $derived(currencyDigits(currency));
  let canDot = $derived(digits > 0);

  function press(k: string) {
    if (k === 'C') { onChange(''); return; }
    if (k === '⌫') { onChange(value.slice(0, -1)); return; }
    if (k === '.') {
      if (!canDot || value.includes('.') || value === '') return;
      onChange(value + '.'); return;
    }
    if (value.includes('.')) {
      const parts = value.split('.');
      if (parts[1].length >= digits) return;
    }
    if (value === '0' && k !== '.') { onChange(k); return; }
    onChange(value + k);
  }
</script>

<div class="keypad">
  {#each ['1','2','3','4','5','6','7','8','9'] as k}
    <button onclick={() => press(k)}>{k}</button>
  {/each}
  <button onclick={() => press('.')} disabled={!canDot} class:muted={!canDot}>.</button>
  <button onclick={() => press('0')}>0</button>
  <button onclick={() => press('⌫')}>⌫</button>
  <button class="clear" onclick={() => press('C')}>清空</button>
  <button class="submit" onclick={onSubmit}>记账</button>
</div>

<style>
  .keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 12px;
  }
  button {
    height: 56px;
    border: none;
    border-radius: var(--radius);
    background: var(--card);
    color: var(--fg);
    font-size: 24px;
    font-weight: 500;
  }
  button:active { background: var(--border); }
  .muted { opacity: 0.35; }
  .clear { background: var(--border); color: var(--fg-muted); grid-column: span 1; }
  .submit { background: var(--accent); color: white; grid-column: span 2; font-size: 18px; }
</style>
