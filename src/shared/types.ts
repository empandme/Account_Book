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
