# 记账 App 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个跨 iPhone 与 Mac 的 PWA 记账应用：手机端日常记账、电脑端偶尔做统计，数据本地存储，通过手动导出 CSV/JSON 传输，部署到 GitHub Pages 且运行期不联网。

**Architecture:** 单份 Svelte + TypeScript + Vite 代码库，通过 `main.ts` 在运行时按屏幕宽度分发到 Mobile App 或 Desktop App。Mobile 使用 IndexedDB（Dexie）持久化；Desktop 只做无持久化的文件导入分析。PWA 通过 vite-plugin-pwa 生成 Manifest + Service Worker。CI 用 GitHub Actions 打包并发布到 GitHub Pages。

**Tech Stack:** Svelte 5 · TypeScript 5 · Vite 5 · Dexie 4 · svelte-spa-router 4 · uPlot 1 · vite-plugin-pwa · Vitest 2 · GitHub Actions

**Spec:** [`docs/superpowers/specs/2026-09-06-counting-app-design.md`](../specs/2026-09-06-counting-app-design.md)

## Global Constraints

- **不引入 UI 库、CSS 框架、状态管理库**（Svelte 5 的 `$state` + `$derived` runes 自足）
- **金额存储**：整数，单位 = ISO 4217 定义的该币种最小单位（CNY / USD → ×100；JPY / KRW → ×1；KWD → ×1000）
- **币种代码**：ISO 4217 三字母大写字符串
- **不做汇率换算**：多币种一律分组显示，不互转
- **手机端 gzipped bundle < 100 KB**，桌面端 < 200 KB
- **运行期无网络请求**（除首次加载与 SW 更新）
- **基础路径**：仓库名 = `counting-app`，Vite `base: '/counting-app/'`，`svelte-spa-router` 与 `manifest.start_url` / `scope` 全部匹配
- **UUID 生成**：`crypto.randomUUID()`（原生，无依赖）
- **时间**：ISO 8601 字符串 (`new Date().toISOString()`)
- **测试**：纯逻辑用 Vitest；UI 组件靠手动验收（清单在 §9 acceptance criteria 中）
- **Node 版本**：18+
- **TypeScript**：`strict: true`

---

## File Structure

```
counting-app/
├── src/
│   ├── shared/
│   │   ├── types.ts             # Transaction / Category / Settings 类型
│   │   ├── currency.ts          # ISO 4217 digits 表 + 金额格式化
│   │   ├── db.ts                # Dexie schema + CRUD
│   │   ├── serializer.ts        # CSV / JSON 导入导出
│   │   └── theme.css            # CSS 变量（浅/深色）
│   ├── mobile/
│   │   ├── App.svelte           # Tab 壳 + router
│   │   ├── pages/
│   │   │   ├── Record.svelte
│   │   │   ├── Ledger.svelte
│   │   │   └── Me.svelte
│   │   └── components/
│   │       ├── Keypad.svelte
│   │       ├── CategoryGrid.svelte
│   │       ├── CurrencyPicker.svelte
│   │       └── DatePicker.svelte
│   ├── desktop/
│   │   ├── App.svelte           # 三栏布局
│   │   ├── panels/
│   │   │   ├── FileDropzone.svelte
│   │   │   ├── Filters.svelte
│   │   │   ├── Charts.svelte
│   │   │   └── Details.svelte
│   │   └── components/
│   │       ├── CurrencyTabs.svelte
│   │       ├── TrendChart.svelte
│   │       ├── PieChart.svelte
│   │       ├── StackedAreaChart.svelte
│   │       └── HeatmapChart.svelte
│   └── main.ts                  # 运行时分发
├── tests/
│   ├── currency.test.ts
│   ├── db.test.ts
│   └── serializer.test.ts
├── public/
│   ├── icons/                   # 192/512 png
│   └── (manifest 由 plugin 生成)
├── .github/workflows/deploy.yml
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .gitignore
└── README.md
```

**分层原则**：`shared/*` 是纯 TS 模块（可 Vitest）；`mobile/*` 只依赖 `shared`；`desktop/*` 只依赖 `shared`。`main.ts` 是唯一了解两端存在的入口。

---

## Task 1: 项目脚手架 + Vite 基础配置

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `README.md`
- Create: `src/main.ts` (占位，仅显示 "hello")

**Interfaces:**
- Consumes: —
- Produces: 可运行的 Vite 项目（`npm run dev` 起本地服务；`npm run build` 出 `dist/`）

- [ ] **Step 1: 在 `/Users/williamwu/Programs/Counting APP` 中初始化 npm 项目**

```bash
cd "/Users/williamwu/Programs/Counting APP"
npm init -y
```

- [ ] **Step 2: 安装依赖**

```bash
npm install -D vite@5 typescript@5 @sveltejs/vite-plugin-svelte@3 svelte@5 vite-plugin-pwa@0 vitest@2 @types/node@20 svelte-check
npm install svelte-spa-router@4 dexie@4 uplot@1
```

- [ ] **Step 3: 写 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "types": ["svelte", "vite/client", "vitest/globals"],
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 4: 写 `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: '/counting-app/',
  plugins: [svelte()],
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Step 5: 写 `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <meta name="theme-color" content="#111111" />
    <title>记账</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: 写占位 `src/main.ts`**

```ts
const app = document.getElementById('app');
if (app) app.textContent = 'counting-app scaffold ok';
```

- [ ] **Step 7: 写 `.gitignore`**

```
node_modules
dist
.DS_Store
*.log
.env
.vite
coverage
```

- [ ] **Step 8: 在 `package.json` 的 `scripts` 里加 dev/build/test**

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "check": "svelte-check --tsconfig ./tsconfig.json"
}
```

- [ ] **Step 9: 验证脚手架**

```bash
npm run build
```
Expected: 生成 `dist/index.html`、无错误。

- [ ] **Step 10: git init + 首次提交**

```bash
git init -b main
git add .
git commit -m "chore: scaffold vite + svelte + typescript project"
```

---

## Task 2: 币种工具（`shared/currency.ts` + `shared/types.ts`）

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/currency.ts`
- Test: `tests/currency.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `types.ts`: `type Transaction`, `type Category`, `type SettingsRecord`
  - `currency.ts`:
    - `currencyDigits(code: string): number` — 返回该币种小数位数（未知币种默认 2）
    - `toMinorUnits(major: number, code: string): number` — 元→分（取整）
    - `fromMinorUnits(minor: number, code: string): number` — 分→元（浮点）
    - `formatAmount(minor: number, code: string, opts?: { withSymbol?: boolean }): string` — 返回如 `"¥12.50"` 或 `"12.50"`
    - `KNOWN_CURRENCIES: readonly string[]` — 常用码 `['CNY','USD','JPY','EUR','GBP','HKD','KRW','TWD']`

- [ ] **Step 1: 写 `src/shared/types.ts`**

```ts
export type Kind = 'expense' | 'income';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  kind: Kind;
  category: string;
  note: string;
  occurred_at: string;
  account_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  archived: boolean;
}

export interface SettingsRecord {
  key: string;
  value: unknown;
}
```

- [ ] **Step 2: 写失败的 currency 测试 `tests/currency.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  currencyDigits,
  toMinorUnits,
  fromMinorUnits,
  formatAmount,
  KNOWN_CURRENCIES,
} from '../src/shared/currency';

describe('currencyDigits', () => {
  it('returns 2 for CNY/USD/EUR', () => {
    expect(currencyDigits('CNY')).toBe(2);
    expect(currencyDigits('USD')).toBe(2);
    expect(currencyDigits('EUR')).toBe(2);
  });
  it('returns 0 for JPY/KRW', () => {
    expect(currencyDigits('JPY')).toBe(0);
    expect(currencyDigits('KRW')).toBe(0);
  });
  it('returns 3 for KWD', () => {
    expect(currencyDigits('KWD')).toBe(3);
  });
  it('defaults to 2 for unknown', () => {
    expect(currencyDigits('XXX')).toBe(2);
  });
});

describe('toMinorUnits / fromMinorUnits', () => {
  it('CNY: 12.5 -> 1250, back to 12.5', () => {
    expect(toMinorUnits(12.5, 'CNY')).toBe(1250);
    expect(fromMinorUnits(1250, 'CNY')).toBe(12.5);
  });
  it('JPY: 1200 -> 1200 (no scaling)', () => {
    expect(toMinorUnits(1200, 'JPY')).toBe(1200);
    expect(fromMinorUnits(1200, 'JPY')).toBe(1200);
  });
  it('rounds fractional cents', () => {
    expect(toMinorUnits(0.005, 'USD')).toBe(1); // banker's rounding not required; use Math.round
  });
});

describe('formatAmount', () => {
  it('CNY 1250 -> ¥12.50 by default', () => {
    expect(formatAmount(1250, 'CNY')).toBe('¥12.50');
  });
  it('JPY 1200 -> ¥1,200', () => {
    expect(formatAmount(1200, 'JPY')).toBe('¥1,200');
  });
  it('USD 800 -> $8.00', () => {
    expect(formatAmount(800, 'USD')).toBe('$8.00');
  });
  it('withSymbol=false drops symbol', () => {
    expect(formatAmount(1250, 'CNY', { withSymbol: false })).toBe('12.50');
  });
});

describe('KNOWN_CURRENCIES', () => {
  it('contains at least CNY / USD / JPY', () => {
    expect(KNOWN_CURRENCIES).toContain('CNY');
    expect(KNOWN_CURRENCIES).toContain('USD');
    expect(KNOWN_CURRENCIES).toContain('JPY');
  });
});
```

- [ ] **Step 3: 跑测试确认全失败**

```bash
npm test
```
Expected: FAIL, 找不到模块。

- [ ] **Step 4: 实现 `src/shared/currency.ts`**

```ts
const DIGITS: Record<string, number> = {
  JPY: 0, KRW: 0, VND: 0,
  KWD: 3, BHD: 3, JOD: 3, OMR: 3, TND: 3,
};

const SYMBOLS: Record<string, string> = {
  CNY: '¥', JPY: '¥', USD: '$', EUR: '€', GBP: '£',
  HKD: 'HK$', KRW: '₩', TWD: 'NT$',
};

export const KNOWN_CURRENCIES = ['CNY', 'USD', 'JPY', 'EUR', 'GBP', 'HKD', 'KRW', 'TWD'] as const;

export function currencyDigits(code: string): number {
  return DIGITS[code] ?? 2;
}

export function toMinorUnits(major: number, code: string): number {
  const scale = 10 ** currencyDigits(code);
  return Math.round(major * scale);
}

export function fromMinorUnits(minor: number, code: string): number {
  const scale = 10 ** currencyDigits(code);
  return minor / scale;
}

export function formatAmount(
  minor: number,
  code: string,
  opts: { withSymbol?: boolean } = {},
): string {
  const withSymbol = opts.withSymbol !== false;
  const digits = currencyDigits(code);
  const value = fromMinorUnits(minor, code);
  const body = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return withSymbol ? `${SYMBOLS[code] ?? code + ' '}${body}` : body;
}
```

- [ ] **Step 5: 跑测试**

```bash
npm test
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/shared tests/currency.test.ts
git commit -m "feat(shared): currency digits table, converters, formatter"
```

---

## Task 3: Dexie 数据库层（`shared/db.ts`）

**Files:**
- Create: `src/shared/db.ts`
- Test: `tests/db.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `currency.ts`
- Produces:
  - `class AppDatabase extends Dexie` 的实例 `db`
  - `db.transactions: Table<Transaction, string>`
  - `db.categories: Table<Category, string>`
  - `db.settings: Table<SettingsRecord, string>`
  - CRUD 函数：
    - `addTransaction(input: Omit<Transaction, 'id'|'created_at'|'updated_at'|'deleted_at'>): Promise<Transaction>`
    - `updateTransaction(id: string, patch: Partial<Transaction>): Promise<void>`
    - `softDeleteTransaction(id: string): Promise<void>`
    - `listTransactions(opts?: { from?: string; to?: string; includeDeleted?: boolean }): Promise<Transaction[]>` — 默认按 `occurred_at` 降序，排除软删
    - `seedCategoriesIfEmpty(): Promise<void>`
    - `listCategories(includeArchived?: boolean): Promise<Category[]>` — 按 `sort_order` 升序
    - `upsertCategory(cat: Category): Promise<void>`
    - `getSetting<T>(key: string, defaultValue: T): Promise<T>`
    - `setSetting(key: string, value: unknown): Promise<void>`

- [ ] **Step 1: 装测试环境的 IndexedDB shim**

```bash
npm install -D fake-indexeddb
```

- [ ] **Step 2: 写测试 `tests/db.test.ts`**（含 setup 引入 fake-indexeddb）

```ts
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
```

- [ ] **Step 3: 跑测试确认失败**

```bash
npm test
```
Expected: FAIL。

- [ ] **Step 4: 实现 `src/shared/db.ts`**

```ts
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
```

- [ ] **Step 5: 跑测试**

```bash
npm test
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/shared/db.ts tests/db.test.ts package.json package-lock.json
git commit -m "feat(shared): dexie schema + transactions/categories/settings crud"
```

---

## Task 4: 序列化（`shared/serializer.ts`）

**Files:**
- Create: `src/shared/serializer.ts`
- Test: `tests/serializer.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `currency.ts`
- Produces:
  - `exportJSON(transactions: Transaction[], categories: Category[]): string`
  - `exportCSV(transactions: Transaction[]): string`
  - `importJSON(text: string): { transactions: Transaction[]; categories: Category[] }`
  - `importCSV(text: string): Transaction[]`
  - JSON top-level：`{ version: 1, exported_at, transactions, categories }`
  - CSV 表头：`id,amount,currency,kind,category,note,occurred_at,tags,account_id,created_at,updated_at`
  - `amount` 在 CSV 中以主单位（元/円）保留对应小数位，导入时反算回最小单位整数

- [ ] **Step 1: 写测试 `tests/serializer.test.ts`**

```ts
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
```

- [ ] **Step 2: 跑测试确认失败**

- [ ] **Step 3: 实现 `src/shared/serializer.ts`**

```ts
import type { Transaction, Category } from './types';
import { currencyDigits, toMinorUnits, fromMinorUnits } from './currency';

const CSV_HEADER = 'id,amount,currency,kind,category,note,occurred_at,tags,account_id,created_at,updated_at';

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function csvSplit(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { cur += ch; }
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') { inQuote = true; }
      else { cur += ch; }
    }
  }
  out.push(cur);
  return out;
}

export function exportJSON(transactions: Transaction[], categories: Category[]): string {
  return JSON.stringify(
    { version: 1, exported_at: new Date().toISOString(), transactions, categories },
    null,
    2,
  );
}

export function importJSON(text: string): { transactions: Transaction[]; categories: Category[] } {
  const raw = JSON.parse(text);
  const transactions: Transaction[] = (raw.transactions ?? []).map((t: Partial<Transaction>) => ({
    id: t.id!, amount: t.amount!, currency: t.currency!, kind: (t.kind ?? 'expense'),
    category: t.category ?? '', note: t.note ?? '', occurred_at: t.occurred_at!,
    account_id: t.account_id ?? null, tags: t.tags ?? [],
    created_at: t.created_at ?? t.occurred_at!, updated_at: t.updated_at ?? t.occurred_at!,
    deleted_at: t.deleted_at ?? null,
  }));
  const categories: Category[] = (raw.categories ?? []).map((c: Partial<Category>) => ({
    id: c.id!, name: c.name ?? '', icon: c.icon ?? '', color: c.color ?? '#000',
    sort_order: c.sort_order ?? 0, archived: c.archived ?? false,
  }));
  return { transactions, categories };
}

export function exportCSV(transactions: Transaction[]): string {
  const rows = transactions.map(t => {
    const digits = currencyDigits(t.currency);
    const major = fromMinorUnits(t.amount, t.currency).toFixed(digits);
    return [
      t.id, major, t.currency, t.kind, t.category, t.note, t.occurred_at,
      t.tags.join('|'), t.account_id ?? '', t.created_at, t.updated_at,
    ].map(v => csvEscape(String(v))).join(',');
  });
  return [CSV_HEADER, ...rows].join('\n');
}

export function importCSV(text: string): Transaction[] {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  const header = csvSplit(lines[0]);
  const idx = (name: string) => header.indexOf(name);
  return lines.slice(1).map(line => {
    const cols = csvSplit(line);
    const currency = cols[idx('currency')];
    const majorAmount = parseFloat(cols[idx('amount')]);
    return {
      id: cols[idx('id')],
      amount: toMinorUnits(majorAmount, currency),
      currency,
      kind: cols[idx('kind')] as 'expense' | 'income',
      category: cols[idx('category')],
      note: cols[idx('note')],
      occurred_at: cols[idx('occurred_at')],
      tags: cols[idx('tags')] ? cols[idx('tags')].split('|') : [],
      account_id: cols[idx('account_id')] || null,
      created_at: cols[idx('created_at')],
      updated_at: cols[idx('updated_at')],
      deleted_at: null,
    };
  });
}
```

- [ ] **Step 4: 跑测试**

```bash
npm test
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/shared/serializer.ts tests/serializer.test.ts
git commit -m "feat(shared): csv/json export/import with roundtrip"
```

---

## Task 5: 主题 CSS 变量（`shared/theme.css`）

**Files:**
- Create: `src/shared/theme.css`

**Interfaces:**
- Consumes: —
- Produces: 全局 CSS 变量 `--bg`, `--fg`, `--fg-muted`, `--accent`, `--danger`, `--card`, `--border`, `--radius`, `--tap`（触控最小 44px）；随 `prefers-color-scheme: dark` 切换。

- [ ] **Step 1: 写 `src/shared/theme.css`**

```css
:root {
  color-scheme: light dark;
  --bg: #f8f8f7;
  --fg: #111111;
  --fg-muted: #6b7280;
  --accent: #10b981;
  --danger: #ef4444;
  --card: #ffffff;
  --border: #e5e7eb;
  --radius: 12px;
  --tap: 44px;
  --font: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0a0a0a;
    --fg: #f5f5f5;
    --fg-muted: #9ca3af;
    --card: #171717;
    --border: #262626;
  }
}
html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font);
  font-size: 16px;
  -webkit-tap-highlight-color: transparent;
}
* { box-sizing: border-box; }
button { font-family: inherit; font-size: inherit; }
input { font-family: inherit; }
```

- [ ] **Step 2: 提交**

```bash
git add src/shared/theme.css
git commit -m "feat(shared): light/dark theme css variables"
```

---

## Task 6: 手机数字键盘组件（`Keypad.svelte`）

**Files:**
- Create: `src/mobile/components/Keypad.svelte`

**Interfaces:**
- Consumes: `currency.ts`
- Produces: Svelte 组件
  - Props: `value: string`（外部主单位字符串，如 `"12.50"`）, `currency: string`, `onChange: (next: string) => void`, `onSubmit: () => void`
  - 行为：`0-9`、`.`、退格、清空、"记账"按钮；根据 `currencyDigits(currency)` 禁用 `.` 键（0 位）或限制小数位数

- [ ] **Step 1: 写组件**

```svelte
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
```

- [ ] **Step 2: 手动验证：起 dev 服务器，临时挂到 `main.ts` 上试点击 → 之后 revert**

```bash
npm run dev
```
预期：键盘可点击，`.` 在 CNY 下可用、切到 JPY 时不可用（测试用一个临时的 currency prop 切换按钮验证；然后撤回 main.ts 的临时代码）。

- [ ] **Step 3: 提交**

```bash
git add src/mobile/components/Keypad.svelte
git commit -m "feat(mobile): numeric keypad with currency-aware decimals"
```

---

## Task 7: 手机分类网格 + 币种选择器 + 时间选择器组件

**Files:**
- Create: `src/mobile/components/CategoryGrid.svelte`
- Create: `src/mobile/components/CurrencyPicker.svelte`
- Create: `src/mobile/components/DatePicker.svelte`

**Interfaces:**
- `CategoryGrid`:
  - Props: `categories: Category[]`, `selectedId: string | null`, `onSelect: (id: string) => void`
- `CurrencyPicker`:
  - Props: `value: string`, `recent: string[]`, `onChange: (code: string) => void`
  - 使用 `KNOWN_CURRENCIES` 作为完整列表；`recent` 排前
- `DatePicker`:
  - Props: `value: string` (ISO), `onChange: (iso: string) => void`
  - 用原生 `<input type="datetime-local">` 简单实现（浏览器差异可接受）

- [ ] **Step 1: 写 `CategoryGrid.svelte`**

```svelte
<script lang="ts">
  import type { Category } from '../../shared/types';
  let { categories, selectedId, onSelect }: {
    categories: Category[];
    selectedId: string | null;
    onSelect: (id: string) => void;
  } = $props();
</script>

<div class="grid">
  {#each categories as c (c.id)}
    <button class:selected={c.id === selectedId} onclick={() => onSelect(c.id)}>
      <span class="icon">{c.icon}</span>
      <span class="name">{c.name}</span>
    </button>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 12px;
  }
  button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 4px;
    border: 1px solid transparent;
    border-radius: var(--radius);
    background: var(--card);
    color: var(--fg);
  }
  .selected { border-color: var(--accent); }
  .icon { font-size: 24px; }
  .name { font-size: 12px; color: var(--fg-muted); }
</style>
```

- [ ] **Step 2: 写 `CurrencyPicker.svelte`**

```svelte
<script lang="ts">
  import { KNOWN_CURRENCIES } from '../../shared/currency';
  let { value, recent, onChange }: {
    value: string;
    recent: string[];
    onChange: (code: string) => void;
  } = $props();
  let open = $state(false);
  let ordered = $derived(
    [...new Set([...recent, ...KNOWN_CURRENCIES])] as string[]
  );
</script>

<button class="chip" onclick={() => open = !open}>{value} ▾</button>
{#if open}
  <div class="menu">
    {#each ordered as code}
      <button
        class:active={code === value}
        onclick={() => { onChange(code); open = false; }}
      >{code}</button>
    {/each}
  </div>
{/if}

<style>
  .chip {
    padding: 4px 10px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--fg);
    border-radius: 999px;
    font-size: 13px;
  }
  .menu {
    position: absolute;
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px;
    margin-top: 6px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    max-width: 260px;
  }
  .menu button {
    padding: 6px 10px;
    background: var(--bg);
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--fg);
  }
  .menu .active { border-color: var(--accent); }
</style>
```

- [ ] **Step 3: 写 `DatePicker.svelte`**

```svelte
<script lang="ts">
  let { value, onChange }: { value: string; onChange: (iso: string) => void } = $props();
  function toLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocal(local: string): string {
    return new Date(local).toISOString();
  }
</script>

<input
  type="datetime-local"
  value={toLocal(value)}
  oninput={(e) => onChange(fromLocal((e.target as HTMLInputElement).value))}
/>

<style>
  input {
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    color: var(--fg);
    font-size: 13px;
  }
</style>
```

- [ ] **Step 4: 提交**

```bash
git add src/mobile/components
git commit -m "feat(mobile): category grid, currency picker, date picker components"
```

---

## Task 8: 手机记账页（`Record.svelte`）

**Files:**
- Create: `src/mobile/pages/Record.svelte`

**Interfaces:**
- Consumes: `Keypad`, `CategoryGrid`, `CurrencyPicker`, `DatePicker`, `db.ts`, `currency.ts`
- Produces: 独立页面，`onSaved: () => void` 回调让父级切到流水页
  - Props: `onSaved?: () => void`

- [ ] **Step 1: 写 `Record.svelte`**

```svelte
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
```

- [ ] **Step 2: 提交**

```bash
git add src/mobile/pages/Record.svelte
git commit -m "feat(mobile): record page wires keypad, category, currency, note, date"
```

---

## Task 9: 手机流水页（`Ledger.svelte`）

**Files:**
- Create: `src/mobile/pages/Ledger.svelte`

**Interfaces:**
- Consumes: `db.ts`, `currency.ts`
- Produces: 按日期分组的列表，每日 header 显示按币种分行的当日总支出，长按（`onpointerdown` 750ms）弹出编辑/删除菜单

- [ ] **Step 1: 写 `Ledger.svelte`**

```svelte
<script lang="ts">
  import { listTransactions, softDeleteTransaction, updateTransaction, listCategories } from '../../shared/db';
  import { formatAmount } from '../../shared/currency';
  import type { Transaction, Category } from '../../shared/types';

  let transactions = $state<Transaction[]>([]);
  let categories = $state<Category[]>([]);
  let selected = $state<Transaction | null>(null);

  $effect(() => { load(); });

  async function load() {
    transactions = await listTransactions();
    categories = await listCategories(true);
  }

  function dayKey(iso: string): string {
    return iso.slice(0, 10);
  }

  let grouped = $derived.by(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const k = dayKey(t.occurred_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return [...map.entries()];
  });

  function dayTotals(list: Transaction[]): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const t of list) totals[t.currency] = (totals[t.currency] ?? 0) + t.amount;
    return totals;
  }

  function iconOf(catName: string): string {
    return categories.find(c => c.name === catName)?.icon ?? '📌';
  }

  function friendlyDay(key: string): string {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (key === today) return '今天';
    if (key === yesterday) return '昨天';
    return key;
  }

  async function onDelete(t: Transaction) {
    await softDeleteTransaction(t.id);
    selected = null;
    await load();
  }
</script>

<div class="page">
  {#each grouped as [day, list] (day)}
    <div class="day-header">
      <span>{friendlyDay(day)}</span>
      <span class="totals">
        {#each Object.entries(dayTotals(list)) as [cur, minor]}
          <span>{formatAmount(minor, cur)}</span>
        {/each}
      </span>
    </div>
    {#each list as t (t.id)}
      <button class="row" onclick={() => selected = t}>
        <span class="icon">{iconOf(t.category)}</span>
        <span class="body">
          <span class="cat">{t.category}</span>
          <span class="note">{t.note}</span>
        </span>
        <span class="amt">{formatAmount(t.amount, t.currency)}</span>
      </button>
    {/each}
  {/each}
</div>

{#if selected}
  <div class="modal" onclick={() => selected = null}>
    <div class="sheet" onclick={(e) => e.stopPropagation()}>
      <div class="title">{selected.category} · {formatAmount(selected.amount, selected.currency)}</div>
      <div class="note">{selected.note}</div>
      <div class="actions">
        <button class="danger" onclick={() => onDelete(selected!)}>删除</button>
        <button onclick={() => selected = null}>取消</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { padding-bottom: 60px; }
  .day-header {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px 4px;
    color: var(--fg-muted);
    font-size: 13px;
  }
  .day-header .totals { display: flex; gap: 8px; }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 16px;
    background: transparent;
    border: none;
    color: var(--fg);
    text-align: left;
  }
  .row:active { background: var(--border); }
  .icon { font-size: 22px; }
  .body { flex: 1; display: flex; flex-direction: column; }
  .cat { font-size: 15px; }
  .note { font-size: 12px; color: var(--fg-muted); }
  .amt { font-size: 15px; font-variant-numeric: tabular-nums; }
  .modal {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex; align-items: flex-end; justify-content: center;
  }
  .sheet {
    background: var(--card);
    width: 100%;
    max-width: 480px;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    padding: 20px 16px 24px;
  }
  .title { font-size: 17px; font-weight: 600; margin-bottom: 4px; }
  .note { color: var(--fg-muted); margin-bottom: 16px; }
  .actions { display: flex; gap: 12px; }
  .actions button {
    flex: 1;
    padding: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--fg);
    border-radius: var(--radius);
  }
  .danger { color: var(--danger); border-color: var(--danger); }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/mobile/pages/Ledger.svelte
git commit -m "feat(mobile): ledger page grouped by day with per-currency totals"
```

---

## Task 10: 手机"我的"页（`Me.svelte`）—— 总览 + 导出 + 导入 + 分类管理

**Files:**
- Create: `src/mobile/pages/Me.svelte`

**Interfaces:**
- Consumes: `db.ts`, `serializer.ts`, `currency.ts`
- Produces: 独立页面，无对外 props

- [ ] **Step 1: 写 `Me.svelte`**

```svelte
<script lang="ts">
  import { listTransactions, listCategories, upsertCategory, getSetting, setSetting, db } from '../../shared/db';
  import { exportJSON, exportCSV, importJSON, importCSV } from '../../shared/serializer';
  import { formatAmount, KNOWN_CURRENCIES } from '../../shared/currency';
  import type { Transaction, Category } from '../../shared/types';

  let transactions = $state<Transaction[]>([]);
  let categories = $state<Category[]>([]);
  let defaultCurrency = $state('CNY');
  let showingCatEditor = $state(false);

  $effect(() => { load(); });

  async function load() {
    transactions = await listTransactions();
    categories = await listCategories(true);
    defaultCurrency = await getSetting('default_currency', 'CNY');
  }

  function monthly(): { totalsByCurrency: Record<string, number>; count: number } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const list = transactions.filter(t => t.occurred_at >= from);
    const totals: Record<string, number> = {};
    for (const t of list) totals[t.currency] = (totals[t.currency] ?? 0) + t.amount;
    return { totalsByCurrency: totals, count: list.length };
  }

  async function doExport(kind: 'json' | 'csv') {
    const active = transactions.filter(t => t.deleted_at === null);
    const text = kind === 'json' ? exportJSON(active, categories) : exportCSV(active);
    const blob = new Blob([text], { type: kind === 'json' ? 'application/json' : 'text/csv' });
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `counting-${stamp}.${kind}`;
    if ('showSaveFilePicker' in window) {
      try {
        // @ts-expect-error non-standard
        const handle = await window.showSaveFilePicker({ suggestedName: filename });
        const w = await handle.createWritable();
        await w.write(blob);
        await w.close();
        return;
      } catch (_) { /* fallthrough */ }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    if (file.name.endsWith('.json')) {
      const { transactions: txs, categories: cats } = importJSON(text);
      await db.transactions.bulkPut(txs);
      await db.categories.bulkPut(cats);
    } else {
      const txs = importCSV(text);
      await db.transactions.bulkPut(txs);
    }
    await load();
  }

  async function setDefaultCurrency(c: string) {
    await setSetting('default_currency', c);
    defaultCurrency = c;
  }

  async function addCategory() {
    const name = prompt('分类名');
    if (!name) return;
    const icon = prompt('图标 emoji', '📌') ?? '📌';
    await upsertCategory({
      id: crypto.randomUUID(), name, icon,
      color: '#64748b',
      sort_order: categories.length,
      archived: false,
    });
    await load();
  }

  async function toggleArchive(c: Category) {
    await upsertCategory({ ...c, archived: !c.archived });
    await load();
  }
</script>

<div class="page">
  <section class="card">
    <div class="title">本月总览</div>
    {#each Object.entries(monthly().totalsByCurrency) as [cur, minor]}
      <div class="line"><span>总支出（{cur}）</span><span>{formatAmount(minor, cur)}</span></div>
    {/each}
    <div class="line"><span>笔数</span><span>{monthly().count}</span></div>
  </section>

  <section class="card">
    <div class="title">默认币种</div>
    <div class="chips">
      {#each KNOWN_CURRENCIES as c}
        <button class:active={c === defaultCurrency} onclick={() => setDefaultCurrency(c)}>{c}</button>
      {/each}
    </div>
  </section>

  <section class="card">
    <div class="title">数据</div>
    <button class="row-btn" onclick={() => doExport('json')}>导出 JSON</button>
    <button class="row-btn" onclick={() => doExport('csv')}>导出 CSV</button>
    <label class="row-btn">
      导入文件
      <input type="file" accept=".json,.csv" onchange={doImport} hidden />
    </label>
  </section>

  <section class="card">
    <div class="title">分类管理</div>
    {#each categories as c (c.id)}
      <div class="cat-row">
        <span>{c.icon} {c.name}</span>
        <button onclick={() => toggleArchive(c)}>{c.archived ? '取消归档' : '归档'}</button>
      </div>
    {/each}
    <button class="row-btn" onclick={addCategory}>新建分类</button>
  </section>
</div>

<style>
  .page { padding: 12px 12px 80px; display: flex; flex-direction: column; gap: 12px; }
  .card { background: var(--card); border-radius: var(--radius); padding: 14px; }
  .title { font-size: 13px; color: var(--fg-muted); margin-bottom: 8px; }
  .line { display: flex; justify-content: space-between; padding: 4px 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button {
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--fg);
  }
  .chips .active { border-color: var(--accent); color: var(--accent); }
  .row-btn {
    display: block;
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: var(--bg);
    color: var(--fg);
    text-align: left;
    margin-top: 6px;
  }
  .cat-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
  .cat-row button {
    padding: 4px 10px;
    background: var(--bg);
    color: var(--fg-muted);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/mobile/pages/Me.svelte
git commit -m "feat(mobile): me page (overview, export/import, categories, default currency)"
```

---

## Task 11: 手机 App 壳 + 底部 Tab 路由（`mobile/App.svelte`）

**Files:**
- Create: `src/mobile/App.svelte`

**Interfaces:**
- Consumes: `Record`, `Ledger`, `Me`
- Produces: 顶层 Svelte 组件，无 props

- [ ] **Step 1: 写 `App.svelte`**

```svelte
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
```

- [ ] **Step 2: 提交**

```bash
git add src/mobile/App.svelte
git commit -m "feat(mobile): tab shell with record/ledger/me switching"
```

---

## Task 12: PWA Manifest + Service Worker（vite-plugin-pwa）

**Files:**
- Modify: `vite.config.ts`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`（占位可先用纯色 PNG）
- Modify: `index.html`（加 apple-touch-icon 等 meta）

**Interfaces:**
- Consumes: `vite.config.ts`
- Produces: 构建出 `manifest.webmanifest` + Service Worker，PWA 可安装

- [ ] **Step 1: 生成占位图标（用 macOS `sips` 从纯色文件生成）**

```bash
mkdir -p public/icons
# 用 sips 生成 512×512 纯色 png（依赖 macOS）
python3 - <<'EOF'
from struct import pack
import zlib, os
def png(size, rgb):
    def chunk(t, d): return pack('>I', len(d)) + t + d + pack('>I', zlib.crc32(t+d))
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    row = b'\x00' + bytes(rgb) * size
    raw = row * size
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend
os.makedirs('public/icons', exist_ok=True)
open('public/icons/icon-192.png','wb').write(png(192,(16,185,129)))
open('public/icons/icon-512.png','wb').write(png(512,(16,185,129)))
EOF
```

- [ ] **Step 2: 更新 `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/counting-app/',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '记账',
        short_name: '记账',
        description: '本地存储的极简记账应用',
        theme_color: '#10b981',
        background_color: '#f8f8f7',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/counting-app/',
        start_url: '/counting-app/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Step 3: 更新 `index.html` 添加 iOS PWA meta**

```html
<link rel="apple-touch-icon" href="/counting-app/icons/icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="记账" />
```
（放在现有 `<head>` 里，`<script>` 之前）

- [ ] **Step 4: 验证构建产物**

```bash
npm run build
ls dist/
```
Expected: 有 `manifest.webmanifest`、`sw.js`、`icons/`。

- [ ] **Step 5: 提交**

```bash
git add vite.config.ts index.html public/icons
git commit -m "feat(pwa): manifest + service worker via vite-plugin-pwa"
```

---

## Task 13: 运行时分发入口（`main.ts`）

**Files:**
- Modify: `src/main.ts`
- Create: `src/desktop/App.svelte`（先占位，展示 "desktop 分析模式"）

**Interfaces:**
- Consumes: `mobile/App.svelte`, `desktop/App.svelte`, `theme.css`
- Produces: 挂载正确的 App 到 `#app`

- [ ] **Step 1: 写占位 `src/desktop/App.svelte`**

```svelte
<div class="placeholder">
  <h1>桌面分析模式</h1>
  <p>后续任务实现文件导入和统计图表。</p>
</div>

<style>
  .placeholder {
    padding: 40px;
    color: var(--fg);
  }
</style>
```

- [ ] **Step 2: 改写 `src/main.ts`**

```ts
import '../src/shared/theme.css';
import { mount } from 'svelte';
import MobileApp from './mobile/App.svelte';
import DesktopApp from './desktop/App.svelte';

const forced = new URLSearchParams(location.search).get('view');
const isDesktop = forced ? forced === 'desktop' : window.matchMedia('(min-width: 768px)').matches;

const target = document.getElementById('app')!;
target.innerHTML = '';
mount(isDesktop ? DesktopApp : MobileApp, { target });
```

- [ ] **Step 3: 本地跑一遍，手工验证移动/桌面视图**

```bash
npm run dev
```
在浏览器中：
- 缩窄窗口 <768px → 手机 UI；
- 拉宽 >768px + 刷新 → 桌面占位页
- 追加 `?view=mobile` / `?view=desktop` 强制切换

- [ ] **Step 4: 提交**

```bash
git add src/main.ts src/desktop/App.svelte
git commit -m "feat: runtime dispatch mobile vs desktop by viewport width"
```

---

## Task 14: 桌面文件拖拽区（`FileDropzone.svelte`）

**Files:**
- Create: `src/desktop/panels/FileDropzone.svelte`

**Interfaces:**
- Consumes: `serializer.ts`, `types.ts`
- Produces: 组件
  - Props: `onLoaded: (data: { transactions: Transaction[]; categories: Category[] }) => void`
  - 支持拖拽和 `<input type="file" multiple>`；多文件合并；支持 `.json` / `.csv` 混合

- [ ] **Step 1: 写组件**

```svelte
<script lang="ts">
  import { importJSON, importCSV } from '../../shared/serializer';
  import type { Transaction, Category } from '../../shared/types';

  let { onLoaded }: {
    onLoaded: (data: { transactions: Transaction[]; categories: Category[] }) => void;
  } = $props();

  let dragOver = $state(false);
  let error = $state('');

  async function handleFiles(files: FileList) {
    error = '';
    const allTx: Transaction[] = [];
    const allCat: Category[] = [];
    for (const f of Array.from(files)) {
      const text = await f.text();
      try {
        if (f.name.toLowerCase().endsWith('.json')) {
          const { transactions, categories } = importJSON(text);
          allTx.push(...transactions);
          allCat.push(...categories);
        } else {
          allTx.push(...importCSV(text));
        }
      } catch (e) {
        error = `${f.name} 解析失败：${(e as Error).message}`;
        return;
      }
    }
    const seen = new Set<string>();
    const dedupTx = allTx.filter(t => (seen.has(t.id) ? false : (seen.add(t.id), true)));
    const seenC = new Set<string>();
    const dedupCat = allCat.filter(c => (seenC.has(c.id) ? false : (seenC.add(c.id), true)));
    onLoaded({ transactions: dedupTx, categories: dedupCat });
  }
</script>

<div
  class="zone"
  class:over={dragOver}
  ondragover={(e) => { e.preventDefault(); dragOver = true; }}
  ondragleave={() => dragOver = false}
  ondrop={(e) => {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  }}
>
  <div class="msg">
    <p>拖入或选择 CSV / JSON 文件</p>
    <label class="btn">
      选择文件
      <input type="file" accept=".json,.csv" multiple
        onchange={(e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files) handleFiles(files);
        }} hidden />
    </label>
  </div>
  {#if error}<div class="err">{error}</div>{/if}
</div>

<style>
  .zone {
    display: flex; align-items: center; justify-content: center;
    height: 240px;
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    background: var(--card);
    margin: 40px;
  }
  .zone.over { border-color: var(--accent); background: var(--bg); }
  .msg { text-align: center; color: var(--fg-muted); }
  .btn {
    display: inline-block;
    margin-top: 12px;
    padding: 10px 16px;
    background: var(--accent);
    color: white;
    border-radius: 8px;
    cursor: pointer;
  }
  .err { color: var(--danger); margin-top: 12px; }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/desktop/panels/FileDropzone.svelte
git commit -m "feat(desktop): file dropzone with multi-file csv/json merge"
```

---

## Task 15: 桌面筛选器 + 币种 Tab

**Files:**
- Create: `src/desktop/components/CurrencyTabs.svelte`
- Create: `src/desktop/panels/Filters.svelte`

**Interfaces:**
- `CurrencyTabs`:
  - Props: `currencies: string[]`, `value: string`, `onChange: (c: string) => void`
- `Filters`:
  - Props:
    - `all: Transaction[]`
    - `filters: FilterState`
    - `onFiltersChange: (f: FilterState) => void`
  - `type FilterState = { from: string; to: string; categories: string[]; minAmount: number | null; maxAmount: number | null; noteQuery: string }`

- [ ] **Step 1: 写 `CurrencyTabs.svelte`**

```svelte
<script lang="ts">
  let { currencies, value, onChange }: {
    currencies: string[];
    value: string;
    onChange: (c: string) => void;
  } = $props();
</script>

<div class="tabs">
  {#each currencies as c}
    <button class:active={c === value} onclick={() => onChange(c)}>{c}</button>
  {/each}
</div>

<style>
  .tabs { display: flex; gap: 4px; padding: 8px 16px; border-bottom: 1px solid var(--border); }
  button {
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: var(--fg-muted);
    border-bottom: 2px solid transparent;
    cursor: pointer;
  }
  .active { color: var(--accent); border-bottom-color: var(--accent); }
</style>
```

- [ ] **Step 2: 写 `FilterState` 类型 + `Filters.svelte`**

```svelte
<script lang="ts" module>
  export type FilterState = {
    from: string;
    to: string;
    categories: string[];
    minAmount: number | null;
    maxAmount: number | null;
    noteQuery: string;
  };
</script>

<script lang="ts">
  import type { Transaction } from '../../shared/types';
  import type { FilterState } from './Filters.svelte';

  let { all, filters, onFiltersChange }: {
    all: Transaction[];
    filters: FilterState;
    onFiltersChange: (f: FilterState) => void;
  } = $props();

  let cats = $derived([...new Set(all.map(t => t.category))]);

  function patch(p: Partial<FilterState>) {
    onFiltersChange({ ...filters, ...p });
  }

  function preset(kind: 'this-month' | 'last-month' | 'this-semester' | 'all') {
    const now = new Date();
    if (kind === 'all') { patch({ from: '', to: '' }); return; }
    if (kind === 'this-month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
      patch({ from, to: '' }); return;
    }
    if (kind === 'last-month') {
      const from = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,10);
      const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0,10);
      patch({ from, to }); return;
    }
    const semesterStartMonth = now.getMonth() < 6 ? 1 : 8;
    const from = new Date(now.getFullYear(), semesterStartMonth - 1, 1).toISOString().slice(0,10);
    patch({ from, to: '' });
  }
</script>

<div class="panel">
  <div class="group">
    <div class="label">时间范围</div>
    <div class="chips">
      <button onclick={() => preset('this-month')}>本月</button>
      <button onclick={() => preset('last-month')}>上月</button>
      <button onclick={() => preset('this-semester')}>本学期</button>
      <button onclick={() => preset('all')}>全部</button>
    </div>
    <div class="row">
      <input type="date" value={filters.from} oninput={(e) => patch({ from: (e.target as HTMLInputElement).value })} />
      <span>—</span>
      <input type="date" value={filters.to} oninput={(e) => patch({ to: (e.target as HTMLInputElement).value })} />
    </div>
  </div>

  <div class="group">
    <div class="label">分类</div>
    <div class="chips">
      {#each cats as c}
        <button
          class:active={filters.categories.includes(c)}
          onclick={() => patch({
            categories: filters.categories.includes(c)
              ? filters.categories.filter(x => x !== c)
              : [...filters.categories, c]
          })}
        >{c}</button>
      {/each}
    </div>
  </div>

  <div class="group">
    <div class="label">金额区间（当前币种）</div>
    <div class="row">
      <input type="number" placeholder="min"
        value={filters.minAmount ?? ''}
        oninput={(e) => {
          const v = (e.target as HTMLInputElement).value;
          patch({ minAmount: v === '' ? null : Number(v) });
        }} />
      <input type="number" placeholder="max"
        value={filters.maxAmount ?? ''}
        oninput={(e) => {
          const v = (e.target as HTMLInputElement).value;
          patch({ maxAmount: v === '' ? null : Number(v) });
        }} />
    </div>
  </div>

  <div class="group">
    <div class="label">备注关键词</div>
    <input type="text" value={filters.noteQuery}
      oninput={(e) => patch({ noteQuery: (e.target as HTMLInputElement).value })} />
  </div>
</div>

<style>
  .panel { padding: 16px; display: flex; flex-direction: column; gap: 20px; }
  .group { display: flex; flex-direction: column; gap: 8px; }
  .label { font-size: 12px; color: var(--fg-muted); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button {
    padding: 4px 10px;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 999px;
    cursor: pointer;
  }
  .chips .active { border-color: var(--accent); color: var(--accent); }
  .row { display: flex; gap: 8px; align-items: center; }
  .row input, .group > input {
    flex: 1;
    padding: 6px 10px;
    background: var(--card);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
</style>
```

- [ ] **Step 3: 提交**

```bash
git add src/desktop/components/CurrencyTabs.svelte src/desktop/panels/Filters.svelte
git commit -m "feat(desktop): currency tabs + filters panel with presets"
```

---

## Task 16: 桌面图表组件（TrendChart + PieChart）

**Files:**
- Create: `src/desktop/components/TrendChart.svelte`
- Create: `src/desktop/components/PieChart.svelte`

**Interfaces:**
- `TrendChart`:
  - Props: `points: { day: string; amountMinor: number }[]`, `currency: string`, `granularity: 'day' | 'week' | 'month'`
  - 用 uPlot 画柱状图
- `PieChart`:
  - Props: `slices: { label: string; value: number; color: string }[]`（value = minor units）, `currency: string`
  - 纯 SVG 手绘（uPlot 不擅长饼图）

- [ ] **Step 1: 写 `TrendChart.svelte`**

```svelte
<script lang="ts">
  import uPlot from 'uplot';
  import 'uplot/dist/uPlot.min.css';
  import { fromMinorUnits, currencyDigits } from '../../shared/currency';

  let { points, currency, granularity }: {
    points: { day: string; amountMinor: number }[];
    currency: string;
    granularity: 'day' | 'week' | 'month';
  } = $props();

  let container: HTMLDivElement;
  let plot: uPlot | null = null;

  function bucketKey(dayISO: string): string {
    if (granularity === 'day') return dayISO;
    const d = new Date(dayISO);
    if (granularity === 'month') return dayISO.slice(0, 7);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.floor(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay()) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
  }

  let series = $derived.by(() => {
    const buckets = new Map<string, number>();
    for (const p of points) {
      const k = bucketKey(p.day);
      buckets.set(k, (buckets.get(k) ?? 0) + p.amountMinor);
    }
    const keys = [...buckets.keys()].sort();
    const xs = keys.map((_, i) => i);
    const ys = keys.map(k => fromMinorUnits(buckets.get(k)!, currency));
    return { keys, xs, ys };
  });

  $effect(() => {
    if (!container) return;
    plot?.destroy();
    plot = new uPlot({
      width: container.clientWidth,
      height: 240,
      scales: { x: { time: false } },
      axes: [
        { values: (_u, splits) => splits.map(i => series.keys[i] ?? '') },
        { values: (_u, splits) => splits.map(v => v.toFixed(currencyDigits(currency))) },
      ],
      series: [
        {},
        { label: currency, stroke: 'var(--accent)', fill: 'var(--accent)', paths: uPlot.paths.bars!({ size: [0.6] }) },
      ],
    }, [series.xs, series.ys], container);
  });
</script>

<div bind:this={container} class="chart" />

<style>
  .chart { width: 100%; }
  :global(.uplot .u-legend) { color: var(--fg); }
</style>
```

- [ ] **Step 2: 写 `PieChart.svelte`**

```svelte
<script lang="ts">
  import { formatAmount } from '../../shared/currency';

  let { slices, currency }: {
    slices: { label: string; value: number; color: string }[];
    currency: string;
  } = $props();

  let total = $derived(slices.reduce((s, x) => s + x.value, 0));

  function arcs(): { path: string; color: string; label: string; value: number }[] {
    if (total === 0) return [];
    let acc = 0;
    const R = 80;
    const cx = 100, cy = 100;
    return slices.map(s => {
      const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += s.value;
      const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + R * Math.cos(start);
      const y1 = cy + R * Math.sin(start);
      const x2 = cx + R * Math.cos(end);
      const y2 = cy + R * Math.sin(end);
      const large = end - start > Math.PI ? 1 : 0;
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
      return { path, color: s.color, label: s.label, value: s.value };
    });
  }
</script>

<div class="wrap">
  <svg viewBox="0 0 200 200" width="200" height="200">
    {#each arcs() as a}
      <path d={a.path} fill={a.color} stroke="var(--card)" stroke-width="1" />
    {/each}
  </svg>
  <ul class="legend">
    {#each slices as s}
      <li>
        <span class="dot" style="background: {s.color}"></span>
        <span class="lbl">{s.label}</span>
        <span class="v">{formatAmount(s.value, currency)}</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .wrap { display: flex; gap: 24px; align-items: center; }
  .legend { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .dot { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
  .lbl { flex: 1; }
  .v { font-variant-numeric: tabular-nums; color: var(--fg-muted); }
</style>
```

- [ ] **Step 3: 提交**

```bash
git add src/desktop/components/TrendChart.svelte src/desktop/components/PieChart.svelte
git commit -m "feat(desktop): trend bar chart (uPlot) + pie chart (svg)"
```

---

## Task 17: 桌面图表组件（StackedAreaChart + HeatmapChart）

**Files:**
- Create: `src/desktop/components/StackedAreaChart.svelte`
- Create: `src/desktop/components/HeatmapChart.svelte`

**Interfaces:**
- `StackedAreaChart`:
  - Props: `series: { name: string; color: string; points: { day: string; amountMinor: number }[] }[]`, `currency: string`
- `HeatmapChart`:
  - Props: `points: { day: string; amountMinor: number }[]`, `currency: string`, `year: number`
  - GitHub 风格日历热力图，一整年 53×7 格子

- [ ] **Step 1: 写 `StackedAreaChart.svelte`**

```svelte
<script lang="ts">
  import uPlot from 'uplot';
  import 'uplot/dist/uPlot.min.css';
  import { fromMinorUnits, currencyDigits } from '../../shared/currency';

  let { series, currency }: {
    series: { name: string; color: string; points: { day: string; amountMinor: number }[] }[];
    currency: string;
  } = $props();

  let container: HTMLDivElement;
  let plot: uPlot | null = null;

  let bundle = $derived.by(() => {
    const daySet = new Set<string>();
    for (const s of series) for (const p of s.points) daySet.add(p.day);
    const days = [...daySet].sort();
    const xs = days.map((_, i) => i);
    const stacks = series.map(s => {
      const map = new Map(s.points.map(p => [p.day, p.amountMinor]));
      return days.map(d => fromMinorUnits(map.get(d) ?? 0, currency));
    });
    return { days, xs, stacks };
  });

  $effect(() => {
    if (!container) return;
    plot?.destroy();
    const cumulative: number[][] = [];
    let base = new Array(bundle.days.length).fill(0);
    for (const s of bundle.stacks) {
      const next = base.map((b, i) => b + s[i]);
      cumulative.push(next);
      base = next;
    }
    plot = new uPlot({
      width: container.clientWidth,
      height: 260,
      scales: { x: { time: false } },
      axes: [
        { values: (_u, splits) => splits.map(i => bundle.days[i] ?? '') },
        { values: (_u, splits) => splits.map(v => v.toFixed(currencyDigits(currency))) },
      ],
      series: [
        {},
        ...series.map((s, i) => ({
          label: s.name,
          stroke: s.color,
          fill: s.color + '55',
        })),
      ],
    }, [bundle.xs, ...cumulative], container);
  });
</script>

<div bind:this={container} class="chart" />

<style>.chart { width: 100%; }</style>
```

- [ ] **Step 2: 写 `HeatmapChart.svelte`**

```svelte
<script lang="ts">
  import { fromMinorUnits, formatAmount } from '../../shared/currency';

  let { points, currency, year }: {
    points: { day: string; amountMinor: number }[];
    currency: string;
    year: number;
  } = $props();

  let byDay = $derived.by(() => {
    const m = new Map<string, number>();
    for (const p of points) m.set(p.day, (m.get(p.day) ?? 0) + p.amountMinor);
    return m;
  });
  let max = $derived(Math.max(1, ...[...byDay.values()]));

  function cells() {
    const arr: { x: number; y: number; day: string; v: number }[] = [];
    const start = new Date(year, 0, 1);
    const startWeekday = start.getDay();
    for (let d = 0; d < 366; d++) {
      const date = new Date(year, 0, 1 + d);
      if (date.getFullYear() !== year) break;
      const dayISO = date.toISOString().slice(0, 10);
      const offset = d + startWeekday;
      arr.push({ x: Math.floor(offset / 7), y: offset % 7, day: dayISO, v: byDay.get(dayISO) ?? 0 });
    }
    return arr;
  }

  function color(v: number): string {
    if (v === 0) return 'var(--border)';
    const t = Math.min(1, v / max);
    const alpha = 0.15 + t * 0.85;
    return `rgba(16,185,129,${alpha})`;
  }
</script>

<div class="wrap">
  <svg viewBox="0 0 800 130" width="100%">
    {#each cells() as c}
      <rect x={c.x * 14} y={c.y * 14} width="12" height="12" rx="2" fill={color(c.v)}>
        <title>{c.day}: {formatAmount(c.v, currency)}</title>
      </rect>
    {/each}
  </svg>
</div>

<style>
  .wrap { padding: 12px; overflow-x: auto; }
</style>
```

- [ ] **Step 3: 提交**

```bash
git add src/desktop/components/StackedAreaChart.svelte src/desktop/components/HeatmapChart.svelte
git commit -m "feat(desktop): stacked area + calendar heatmap charts"
```

---

## Task 18: 桌面明细面板（`Details.svelte`）

**Files:**
- Create: `src/desktop/panels/Details.svelte`

**Interfaces:**
- Props:
  - `transactions: Transaction[]`（已经按币种和筛选过滤过）
  - `currency: string`

- [ ] **Step 1: 写组件**

```svelte
<script lang="ts">
  import type { Transaction } from '../../shared/types';
  import { formatAmount, fromMinorUnits } from '../../shared/currency';

  let { transactions, currency }: {
    transactions: Transaction[];
    currency: string;
  } = $props();

  let sortField = $state<'occurred_at' | 'amount' | 'category'>('occurred_at');
  let sortAsc = $state(false);

  let sorted = $derived.by(() => {
    const arr = [...transactions];
    arr.sort((a, b) => {
      const av = a[sortField] as string | number;
      const bv = b[sortField] as string | number;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  });

  let summary = $derived.by(() => {
    const total = transactions.reduce((s, t) => s + t.amount, 0);
    const count = transactions.length;
    const days = new Set(transactions.map(t => t.occurred_at.slice(0,10))).size || 1;
    const avg = total / days;
    const max = Math.max(0, ...transactions.map(t => t.amount));
    return { total, count, avg, max };
  });

  function setSort(field: typeof sortField) {
    if (sortField === field) sortAsc = !sortAsc;
    else { sortField = field; sortAsc = false; }
  }
</script>

<div class="panel">
  <div class="summary">
    <div><span class="k">总支出</span><span class="v">{formatAmount(summary.total, currency)}</span></div>
    <div><span class="k">日均</span><span class="v">{formatAmount(Math.round(summary.avg), currency)}</span></div>
    <div><span class="k">最大单笔</span><span class="v">{formatAmount(summary.max, currency)}</span></div>
    <div><span class="k">笔数</span><span class="v">{summary.count}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th onclick={() => setSort('occurred_at')}>日期</th>
        <th onclick={() => setSort('category')}>分类</th>
        <th>备注</th>
        <th onclick={() => setSort('amount')}>金额</th>
      </tr>
    </thead>
    <tbody>
      {#each sorted as t}
        <tr>
          <td>{t.occurred_at.slice(0, 16).replace('T', ' ')}</td>
          <td>{t.category}</td>
          <td class="note">{t.note}</td>
          <td class="amt">{formatAmount(t.amount, currency)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .panel { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
  .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .summary > div { display: flex; flex-direction: column; padding: 10px; background: var(--card); border-radius: 8px; }
  .k { font-size: 11px; color: var(--fg-muted); }
  .v { font-size: 18px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border); }
  th { cursor: pointer; color: var(--fg-muted); font-weight: 500; }
  .amt { font-variant-numeric: tabular-nums; text-align: right; }
  .note { color: var(--fg-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/desktop/panels/Details.svelte
git commit -m "feat(desktop): details panel with summary tiles and sortable table"
```

---

## Task 19: 桌面图表面板 + 主 App 装配（`Charts.svelte` + `desktop/App.svelte`）

**Files:**
- Create: `src/desktop/panels/Charts.svelte`
- Modify: `src/desktop/App.svelte`

**Interfaces:**
- `Charts.svelte` props: `transactions: Transaction[]`, `currency: string`
- `desktop/App.svelte` 装配：Dropzone → 已加载后展示三栏（Filters | Charts | Details），顶部 CurrencyTabs

- [ ] **Step 1: 写 `Charts.svelte`**

```svelte
<script lang="ts">
  import type { Transaction } from '../../shared/types';
  import TrendChart from '../components/TrendChart.svelte';
  import PieChart from '../components/PieChart.svelte';
  import StackedAreaChart from '../components/StackedAreaChart.svelte';
  import HeatmapChart from '../components/HeatmapChart.svelte';

  let { transactions, currency }: { transactions: Transaction[]; currency: string } = $props();

  let granularity = $state<'day' | 'week' | 'month'>('day');

  let trendPoints = $derived(
    transactions.map(t => ({ day: t.occurred_at.slice(0, 10), amountMinor: t.amount }))
  );

  let pieSlices = $derived.by(() => {
    const m = new Map<string, number>();
    for (const t of transactions) m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
    const palette = ['#f97316', '#0ea5e9', '#ec4899', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#64748b'];
    return [...m.entries()].map(([label, value], i) => ({
      label, value, color: palette[i % palette.length],
    }));
  });

  let areaSeries = $derived.by(() => {
    const byCat = new Map<string, Map<string, number>>();
    for (const t of transactions) {
      if (!byCat.has(t.category)) byCat.set(t.category, new Map());
      const inner = byCat.get(t.category)!;
      const d = t.occurred_at.slice(0, 10);
      inner.set(d, (inner.get(d) ?? 0) + t.amount);
    }
    const palette = ['#f97316', '#0ea5e9', '#ec4899', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#64748b'];
    return [...byCat.entries()].map(([name, map], i) => ({
      name,
      color: palette[i % palette.length],
      points: [...map.entries()].map(([day, amountMinor]) => ({ day, amountMinor })),
    }));
  });

  let year = $derived(
    transactions.length > 0 ? new Date(transactions[0].occurred_at).getFullYear() : new Date().getFullYear()
  );
</script>

<div class="charts">
  <section>
    <header>
      <h3>时间趋势</h3>
      <div class="chips">
        {#each ['day','week','month'] as g}
          <button class:active={g === granularity} onclick={() => granularity = g as any}>{g}</button>
        {/each}
      </div>
    </header>
    <TrendChart points={trendPoints} currency={currency} granularity={granularity} />
  </section>

  <section>
    <h3>分类占比</h3>
    <PieChart slices={pieSlices} currency={currency} />
  </section>

  <section>
    <h3>分类趋势</h3>
    <StackedAreaChart series={areaSeries} currency={currency} />
  </section>

  <section>
    <h3>年度日历热力</h3>
    <HeatmapChart points={trendPoints} currency={currency} year={year} />
  </section>
</div>

<style>
  .charts { display: flex; flex-direction: column; gap: 24px; padding: 16px; overflow-y: auto; }
  section { background: var(--card); border-radius: var(--radius); padding: 16px; }
  h3 { font-size: 14px; margin: 0 0 12px; color: var(--fg-muted); font-weight: 500; }
  header { display: flex; justify-content: space-between; align-items: center; }
  .chips button {
    padding: 3px 8px;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 999px;
    margin-left: 4px;
    cursor: pointer;
    font-size: 11px;
  }
  .chips .active { border-color: var(--accent); color: var(--accent); }
</style>
```

- [ ] **Step 2: 改写 `desktop/App.svelte`**

```svelte
<script lang="ts">
  import FileDropzone from './panels/FileDropzone.svelte';
  import Filters from './panels/Filters.svelte';
  import type { FilterState } from './panels/Filters.svelte';
  import Charts from './panels/Charts.svelte';
  import Details from './panels/Details.svelte';
  import CurrencyTabs from './components/CurrencyTabs.svelte';
  import type { Transaction, Category } from '../shared/types';
  import { fromMinorUnits } from '../shared/currency';

  let loaded = $state<{ transactions: Transaction[]; categories: Category[] } | null>(null);
  let currency = $state('CNY');
  let filters = $state<FilterState>({
    from: '', to: '', categories: [], minAmount: null, maxAmount: null, noteQuery: '',
  });

  let currencies = $derived(
    loaded ? [...new Set(loaded.transactions.map(t => t.currency))].sort() : []
  );

  $effect(() => {
    if (currencies.length > 0 && !currencies.includes(currency)) currency = currencies[0];
  });

  let filtered = $derived.by(() => {
    if (!loaded) return [];
    return loaded.transactions.filter(t => {
      if (t.currency !== currency) return false;
      if (t.deleted_at !== null) return false;
      if (filters.from && t.occurred_at.slice(0,10) < filters.from) return false;
      if (filters.to && t.occurred_at.slice(0,10) > filters.to) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(t.category)) return false;
      const majorAmount = fromMinorUnits(t.amount, t.currency);
      if (filters.minAmount !== null && majorAmount < filters.minAmount) return false;
      if (filters.maxAmount !== null && majorAmount > filters.maxAmount) return false;
      if (filters.noteQuery && !t.note.toLowerCase().includes(filters.noteQuery.toLowerCase())) return false;
      return true;
    });
  });
</script>

{#if !loaded}
  <FileDropzone onLoaded={(d) => loaded = d} />
{:else}
  <CurrencyTabs currencies={currencies} value={currency} onChange={(c) => currency = c} />
  <div class="three">
    <aside class="left">
      <Filters all={loaded.transactions.filter(t => t.currency === currency)}
        filters={filters}
        onFiltersChange={(f) => filters = f} />
    </aside>
    <main class="mid">
      <Charts transactions={filtered} currency={currency} />
    </main>
    <aside class="right">
      <Details transactions={filtered} currency={currency} />
    </aside>
  </div>
{/if}

<style>
  .three {
    display: grid;
    grid-template-columns: 260px 1fr 360px;
    height: calc(100vh - 50px);
  }
  .left, .right { overflow-y: auto; border-right: 1px solid var(--border); }
  .right { border-right: none; border-left: 1px solid var(--border); }
  .mid { overflow-y: auto; }
</style>
```

- [ ] **Step 3: 加"导出报表"按钮到 desktop/App.svelte 顶栏（PDF + PNG）**

在 `<CurrencyTabs .../>` 后加：

```svelte
<div class="topbar">
  <CurrencyTabs currencies={currencies} value={currency} onChange={(c) => currency = c} />
  <div class="export-actions">
    <button onclick={exportPDF}>导出 PDF</button>
    <button onclick={exportPNG}>导出 PNG</button>
  </div>
</div>
```

在 `<script>` 里加：

```ts
function exportPDF() {
  window.print();
}

async function exportPNG() {
  const midEl = document.querySelector('.mid') as HTMLElement | null;
  if (!midEl) return;
  const width = midEl.scrollWidth;
  const height = midEl.scrollHeight;
  const canvases = midEl.querySelectorAll('canvas');
  const svgs = midEl.querySelectorAll('svg');
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = getComputedStyle(midEl).backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, width, height);
  const midRect = midEl.getBoundingClientRect();
  for (const c of Array.from(canvases)) {
    const r = c.getBoundingClientRect();
    ctx.drawImage(c, r.left - midRect.left, r.top - midRect.top + midEl.scrollTop);
  }
  for (const s of Array.from(svgs)) {
    const xml = new XMLSerializer().serializeToString(s);
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
    await new Promise<void>((res) => { img.onload = () => res(); });
    const r = s.getBoundingClientRect();
    ctx.drawImage(img, r.left - midRect.left, r.top - midRect.top + midEl.scrollTop, r.width, r.height);
  }
  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `counting-${currency}-${new Date().toISOString().slice(0,10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
```

在 `<style>` 里加：

```css
.topbar { display: flex; justify-content: space-between; align-items: center; }
.export-actions { display: flex; gap: 8px; padding: 8px 16px; }
.export-actions button {
  padding: 4px 12px;
  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}
@media print {
  .left, .right, .topbar { display: none !important; }
  .mid { overflow: visible !important; height: auto !important; }
  .three { display: block !important; height: auto !important; }
}
```

- [ ] **Step 4: 手动验证：跑 dev 服务器，导入手机端导出的样例 JSON，检查图表、明细、PDF 打印预览、PNG 下载**

```bash
npm run dev
```
（可先手工在浏览器控制台造几条数据、导出、再导入验证）

- [ ] **Step 5: 提交**

```bash
git add src/desktop
git commit -m "feat(desktop): assemble three-column app with charts, filters, details, pdf/png export"
```

---

## Task 20: GitHub Actions 部署 workflow

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`（添加简短使用说明）

**Interfaces:**
- Consumes: GitHub Pages 设置：仓库 Settings → Pages → Source = "GitHub Actions"
- Produces: 每次 push `main` 自动构建并发布到 `https://<user>.github.io/counting-app/`

- [ ] **Step 1: 写 workflow 文件**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 写 `README.md`**

```markdown
# 记账 App

本地存储 + PWA 的极简记账应用。手机端记账，电脑端偶尔做统计。

## 开发

```bash
npm install
npm run dev
```

## 部署

Push 到 `main` 分支即自动通过 GitHub Actions 部署到 GitHub Pages。

首次部署前：仓库 Settings → Pages → Source 选择 "GitHub Actions"。

## 使用

- iPhone Safari 打开 `https://<username>.github.io/counting-app/` → 分享 → "添加到主屏幕"
- Mac Safari 打开同一网址即自动进入分析模式
- 手机端"我的" → 导出 CSV/JSON → 通过 AirDrop/邮件/微信等发到 Mac → 拖入分析
```

- [ ] **Step 3: 在本地初始化 GitHub 远端仓库并首次推送**（手动步骤，由用户在 GitHub 网页上完成"新建仓库 counting-app"）

```bash
git remote add origin git@github.com:<你的用户名>/counting-app.git
git branch -M main
git push -u origin main
```
Expected: Actions 页面看到 build+deploy 成功；`https://<user>.github.io/counting-app/` 可访问。

- [ ] **Step 4: 提交（推送前一次性把 workflow 和 README 加进去）**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "chore: github pages deploy workflow + readme"
```

---

## Task 21: 端到端验收（对照 spec §9）

**Files:**
- 无代码改动。清单式验收。

**Interfaces:**
- Consumes: 部署好的 GitHub Pages URL
- Produces: 验收清单全部勾选，或列出未过项目

- [ ] **Step 1: 手机端安装 PWA**

在 iPhone Safari 打开部署 URL → 分享 → "添加到主屏幕" → 主屏幕图标可点击进入。

- [ ] **Step 2: 断网可用性**

打开飞行模式 → 从主屏幕启动 App → 能正常记账、看流水、切页。

- [ ] **Step 3: 记账速度**

秒表测试：从点开图标到完成一笔 CNY 支出记录 ≤ 3 秒。

- [ ] **Step 4: 编辑 / 软删除**

在流水页长按或点击一笔 → 弹出菜单 → 删除 → 从列表消失；再次导出 JSON 时 `deleted_at` 非 null。

- [ ] **Step 5: 分类增删改排序**

我的 → 分类管理 → 新建 / 归档 / 恢复分类，记账页立即反映。

- [ ] **Step 6: 多币种记账**

记账页切换到 USD，键盘允许 2 位小数；切换到 JPY，`.` 键置灰不可用。分别记 3 笔。

- [ ] **Step 7: 流水页与本月总览按币种分开**

流水页每日 header 显示 `¥xx · $xx`；我的页本月总览按币种分行显示总支出。

- [ ] **Step 8: 导出 CSV/JSON**

我的 → 导出 JSON → 通过 Share Sheet 存到"文件"/发到 Mac；同理导出 CSV，用 Excel 打开列显正确、中文备注不乱码（UTF-8 BOM 若需要可后续加）。

- [ ] **Step 9: Mac 桌面模式**

Mac Safari 打开同一网址 → 自动进入分析模式（>=768px），首屏为 Dropzone。

- [ ] **Step 10: 电脑端图表**

拖入之前导出的 JSON → 币种 Tab 出现所有币种 → 每个 Tab 内 4 种图表（时间趋势、分类占比、分类趋势、日历热力）+ 明细列表 + 汇总数正确。

- [ ] **Step 11: 电脑端筛选器**

时间预设（本月/上月/本学期/全部）、分类多选、金额区间、备注关键词均能正确过滤图表和明细。

- [ ] **Step 12: 电脑端 PDF / PNG 导出**

点"导出 PDF" → 浏览器打印预览只显示中间图表栏 → 选"存储为 PDF"生成正确文件。
点"导出 PNG" → 自动下载一个 PNG 文件，含所有图表。

- [ ] **Step 13: bundle 大小**

```bash
npm run build
ls -la dist/assets
```
Expected：与 mobile 相关的 chunk gzipped < 100 KB；与 desktop 相关的 chunk gzipped < 200 KB。（可用 `gzip -c file.js | wc -c` 手工确认。）

- [ ] **Step 14: 运行期无外部请求**

在浏览器 DevTools Network 面板打开、清空 → 使用记账/查看/导出 → 除首次 SW 拉取外，无任何请求发往 `<user>.github.io` 之外的域名。

- [ ] **Step 15: 记录未通过项**

若上述任何一项未过，回到对应 Task 修复并单独提交（`fix(<scope>): ...`），然后重新走对应验收步骤。

- [ ] **Step 16: 打 v1 tag**

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 完成
