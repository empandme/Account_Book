import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, addTransaction, listTransactions, softDeleteTransaction,
  seedCategoriesIfEmpty, listCategories, upsertCategory,
  getSetting, setSetting } from '../src/shared/db';

beforeEach(async () => {
  await db.transactions.clear();
  await db.categories.clear();
  await db.settings.clear();
});

describe('transactions CRUD', () => {
  it('adds and lists a transaction with generated id/timestamps', async () => {
    const t = await addTransaction({
      amount: 1250, currency: 'CNY', kind: 'expense',
      category: '吃饭', note: '午餐', occurred_at: '2026-09-06T12:00:00.000Z',
      account_id: null, tags: [],
    });
    expect(t.id).toBeTruthy();
    expect(t.created_at).toBeTruthy();
    expect(t.deleted_at).toBeNull();
    const list = await listTransactions();
    expect(list).toHaveLength(1);
    expect(list[0].amount).toBe(1250);
  });

  it('soft-deletes and excludes from default list', async () => {
    const t = await addTransaction({
      amount: 100, currency: 'CNY', kind: 'expense',
      category: 'x', note: '', occurred_at: '2026-09-06T00:00:00.000Z',
      account_id: null, tags: [],
    });
    await softDeleteTransaction(t.id);
    expect(await listTransactions()).toHaveLength(0);
    expect(await listTransactions({ includeDeleted: true })).toHaveLength(1);
  });

  it('lists in occurred_at DESC order', async () => {
    await addTransaction({ amount: 1, currency: 'CNY', kind: 'expense', category: 'a', note: '', occurred_at: '2026-09-01T00:00:00.000Z', account_id: null, tags: [] });
    await addTransaction({ amount: 2, currency: 'CNY', kind: 'expense', category: 'a', note: '', occurred_at: '2026-09-05T00:00:00.000Z', account_id: null, tags: [] });
    const list = await listTransactions();
    expect(list.map(t => t.amount)).toEqual([2, 1]);
  });
});

describe('categories seed and list', () => {
  it('seeds default categories when empty', async () => {
    await seedCategoriesIfEmpty();
    const cats = await listCategories();
    expect(cats.length).toBeGreaterThanOrEqual(8);
    expect(cats.map(c => c.name)).toContain('吃饭');
  });

  it('does not re-seed if categories exist', async () => {
    await upsertCategory({ id: 'x', name: '自定义', icon: '🌟', color: '#000', sort_order: 0, archived: false });
    await seedCategoriesIfEmpty();
    const cats = await listCategories();
    expect(cats).toHaveLength(1);
  });

  it('lists non-archived by default, sorted by sort_order', async () => {
    await upsertCategory({ id: 'b', name: 'B', icon: '', color: '#000', sort_order: 2, archived: false });
    await upsertCategory({ id: 'a', name: 'A', icon: '', color: '#000', sort_order: 1, archived: false });
    await upsertCategory({ id: 'c', name: 'C', icon: '', color: '#000', sort_order: 3, archived: true });
    const cats = await listCategories();
    expect(cats.map(c => c.id)).toEqual(['a', 'b']);
  });
});

describe('settings kv', () => {
  it('returns default when missing', async () => {
    expect(await getSetting('foo', 'bar')).toBe('bar');
  });
  it('roundtrips value', async () => {
    await setSetting('foo', { x: 1 });
    expect(await getSetting('foo', null)).toEqual({ x: 1 });
  });
});
