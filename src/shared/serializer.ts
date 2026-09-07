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
