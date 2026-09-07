<script lang="ts">
  import { KNOWN_CURRENCIES } from '../../shared/currency';
  let { value, onChange }: {
    value: string;
    recent?: string[];
    onChange: (code: string) => void;
  } = $props();

  function toggle() {
    const list: string[] = [...KNOWN_CURRENCIES];
    if (list.length < 2) return;
    const idx = list.indexOf(value);
    const next = list[(idx + 1) % list.length];
    onChange(next);
  }
</script>

<button class="chip" onclick={toggle}>{value} ⇄</button>

<style>
  .chip {
    padding: 6px 12px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--fg);
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  .chip:active { background: var(--border); transform: scale(0.96); }
</style>
