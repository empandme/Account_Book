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
    <div class="amount">{displayAmount()}</div>
    <CurrencyPicker value={currency} recent={recentCurrencies} onChange={(c) => currency = c} />
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
  .page { padding-bottom: 60px; }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 16px 8px;
  }
  .amount { font-size: 40px; font-weight: 600; color: var(--fg); }
  .meta { display: flex; gap: 8px; padding: 0 12px 8px; }
  .meta input {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    color: var(--fg);
  }
</style>
