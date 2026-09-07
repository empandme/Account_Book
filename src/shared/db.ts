import Dexie, { type Table } from 'dexie';
import type { Transaction, Category, SettingsRecord } from './types';

class AppDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super('counting-app');
    this.version(1).stores({
      transactions: 'id, occurred_at, category, kind, currency, deleted_at',
      categories: 'id, sort_order, archived',
      settings: 'key',
    });
  }
}

export const db = new AppDatabase();

const DEFAULT_CATEGORIES: Category[] = [
  { name: '吃饭', icon: '🍜', color: '#f97316' },
  { name: '交通', icon: '🚌', color: '#0ea5e9' },
  { name: '购物', icon: '🛍️', color: '#ec4899' },
  { name: '日用', icon: '🧴', color: '#22c55e' },
  { name: '娱乐', icon: '🎮', color: '#a855f7' },
  { name: '学习', icon: '📚', color: '#f59e0b' },
  { name: '医疗', icon: '🏥', color: '#ef4444' },
  { name: '其他', icon: '💰', color: '#64748b' },
].map((c, i) => ({ id: crypto.randomUUID(), sort_order: i, archived: false, ...c }));

export async function addTransaction(
  input: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>,
): Promise<Transaction> {
  const now = new Date().toISOString();
  const t: Transaction = {
    ...input,
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.transactions.add(t);
  return t;
}

export async function updateTransaction(id: string, patch: Partial<Transaction>): Promise<void> {
  await db.transactions.update(id, { ...patch, updated_at: new Date().toISOString() });
}

export async function softDeleteTransaction(id: string): Promise<void> {
  await db.transactions.update(id, { deleted_at: new Date().toISOString() });
}

export async function listTransactions(
  opts: { from?: string; to?: string; includeDeleted?: boolean } = {},
): Promise<Transaction[]> {
  let coll = db.transactions.orderBy('occurred_at').reverse();
  if (!opts.includeDeleted) coll = coll.filter(t => t.deleted_at === null);
  if (opts.from) coll = coll.filter(t => t.occurred_at >= opts.from!);
  if (opts.to) coll = coll.filter(t => t.occurred_at <= opts.to!);
  return coll.toArray();
}

export async function seedCategoriesIfEmpty(): Promise<void> {
  const count = await db.categories.count();
  if (count === 0) await db.categories.bulkAdd(DEFAULT_CATEGORIES);
}

export async function listCategories(includeArchived = false): Promise<Category[]> {
  const all = await db.categories.orderBy('sort_order').toArray();
  return includeArchived ? all : all.filter(c => !c.archived);
}

export async function upsertCategory(cat: Category): Promise<void> {
  await db.categories.put(cat);
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const row = await db.settings.get(key);
  return (row?.value as T) ?? defaultValue;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}
