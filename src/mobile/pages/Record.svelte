<script lang="ts">
  import Keypad from '../components/Keypad.svelte';
  import CategoryGrid from '../components/CategoryGrid.svelte';
  import CurrencyPicker from '../components/CurrencyPicker.svelte';
  import DatePicker from '../components/DatePicker.svelte';
  import { addTransaction, listCategories, seedCategoriesIfEmpty, getSetting, setSetting } from '../../shared/db';
  import { toMinorUnits, formatAmount } from '../../shared/currency';
  import type { Category } from '../../shared/types';

  let { onSaved }: { onSaved?: () => void } = $props();

  let amountText = $state('');
  let currency = $state('CNY');
  let recentCurrencies = $state<string[]>(['CNY']);
  let categories = $state<Category[]>([]);
  let selectedCat = $state<Category | null>(null);
  let note = $state('');
  let occurredAt = $state(new Date().toISOString());

  $effect(() => { init(); });

  async function init() {
    await seedCategoriesIfEmpty();
    categories = await listCategories();
    if (!selectedCat && categories.length > 0) selectedCat = categories[0];
    currency = await getSetting('default_currency', 'CNY');
    recentCurrencies = await getSetting('recent_currencies', ['CNY']);
  }

  async function save() {
    const major = parseFloat(amountText);
    if (isNaN(major) || major <= 0) return;
    if (!selectedCat) return;
    const minor = toMinorUnits(major, currency);
    await addTransaction({
      amount: minor,
      currency,
      kind: 'expense',
      category: selectedCat.name,
      note,
      occurred_at: occurredAt,
      account_id: null,
      tags: [],
    });
    const next = [currency, ...recentCurrencies.filter(c => c !== currency)].slice(0, 6);
    await setSetting('recent_currencies', next);
    recentCurrencies = next;
    amountText = '';
    note = '';
    occurredAt = new Date().toISOString();
    onSaved?.();
  }

  function displayAmount(): string {
    if (amountText === '') return formatAmount(0, currency);
    const major = parseFloat(amountText || '0');
    if (isNaN(major)) return formatAmount(0, currency);
    return formatAmount(toMinorUnits(major, currency), currency);
  }
</script>

<div class="page">
  <div class="header">
    <div class="hint">支出</div>
    <div class="amount-row">
      <div class="amount">{displayAmount()}</div>
      <CurrencyPicker value={currency} recent={recentCurrencies} onChange={(c) => currency = c} />
    </div>
  </div>

  <CategoryGrid
    categories={categories}
    selectedId={selectedCat?.id ?? null}
    onSelect={(id) => selectedCat = categories.find(c => c.id === id) ?? null}
  />

  <div class="meta">
    <input placeholder="备注" bind:value={note} />
    <DatePicker value={occurredAt} onChange={(v) => occurredAt = v} />
  </div>

  <Keypad value={amountText} currency={currency} onChange={(v) => amountText = v} onSubmit={save} />
</div>

<style>
  .page { padding-bottom: 12px; }
  .header {
    padding: 16px 20px 12px;
  }
  .hint {
    font-size: 12px;
    color: var(--fg-muted);
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .amount-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .amount {
    font-size: 44px;
    font-weight: 700;
    color: var(--fg);
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
    line-height: 1.15;
  }
  .meta { display: flex; gap: 8px; padding: 0 12px 8px; }
  .meta input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    color: var(--fg);
    font-size: 14px;
  }
</style>
