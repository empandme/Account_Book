import { describe, it, expect } from 'vitest';
import { exportJSON, exportCSV, importJSON, importCSV } from '../src/shared/serializer';
import type { Transaction, Category } from '../src/shared/types';

const sampleTx: Transaction = {
  id: 't1', amount: 1250, currency: 'CNY', kind: 'expense',
  category: '吃饭', note: '午餐, 加辣', occurred_at: '2026-09-06T12:00:00.000Z',
  account_id: null, tags: [],
  created_at: '2026-09-06T12:00:00.000Z', updated_at: '2026-09-06T12:00:00.000Z',
  deleted_at: null,
};
const sampleJpy: Transaction = { ...sampleTx, id: 't2', amount: 1200, currency: 'JPY' };
const sampleCat: Category = { id: 'c1', name: '吃饭', icon: '🍜', color: '#f97316', sort_order: 0, archived: false };

describe('exportJSON / importJSON', () => {
  it('roundtrips transactions and categories', () => {
    const json = exportJSON([sampleTx, sampleJpy], [sampleCat]);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.categories).toHaveLength(1);
    const { transactions, categories } = importJSON(json);
    expect(transactions[0]).toEqual(sampleTx);
    expect(categories[0]).toEqual(sampleCat);
  });

  it('fills defaults for missing optional fields on import', () => {
    const partial = JSON.stringify({
      version: 1,
      exported_at: '2026-09-06T00:00:00.000Z',
      transactions: [{
        id: 'x', amount: 100, currency: 'CNY', kind: 'expense',
        category: 'x', note: '', occurred_at: '2026-09-06T00:00:00.000Z',
      }],
      categories: [],
    });
    const { transactions } = importJSON(partial);
    expect(transactions[0].account_id).toBeNull();
    expect(transactions[0].tags).toEqual([]);
    expect(transactions[0].deleted_at).toBeNull();
  });
});

describe('exportCSV / importCSV', () => {
  it('produces header row + one row per tx with amount in major units', () => {
    const csv = exportCSV([sampleTx]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,amount,currency,kind,category,note,occurred_at,tags,account_id,created_at,updated_at');
    expect(lines[1]).toContain('12.50');
    expect(lines[1]).toContain('CNY');
  });

  it('escapes commas and quotes in note', () => {
    const csv = exportCSV([sampleTx]);
    expect(csv).toContain('"午餐, 加辣"');
  });

  it('JPY exports as integer, no decimals', () => {
    const csv = exportCSV([sampleJpy]);
    expect(csv).toContain('1200,JPY');
    expect(csv).not.toContain('1200.00');
  });

  it('roundtrips back to minor units', () => {
    const csv = exportCSV([sampleTx, sampleJpy]);
    const parsed = importCSV(csv);
    expect(parsed[0].amount).toBe(1250);
    expect(parsed[0].currency).toBe('CNY');
    expect(parsed[1].amount).toBe(1200);
    expect(parsed[1].currency).toBe('JPY');
  });
});
