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
    gap: 10px;
    padding: 10px 12px;
  }
  button {
    height: 58px;
    border: none;
    border-radius: 14px;
    background: var(--card);
    color: var(--fg);
    font-size: 26px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    transition: background 0.08s;
  }
  button:active { background: var(--border); transform: scale(0.98); }
  .muted { opacity: 0.3; }
  .clear {
    background: var(--border);
    color: var(--fg-muted);
    font-size: 18px;
    font-weight: 500;
  }
  .submit {
    background: var(--accent);
    color: white;
    grid-column: span 2;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 2px;
  }
  .submit:active { background: color-mix(in srgb, var(--accent) 85%, black); }
</style>
