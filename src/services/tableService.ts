import { DEFAULT_TABLES } from '../data/tables';

export function getTables(): string[] {
  return [...DEFAULT_TABLES];
}

export function addTable(tables: string[], table: string): string[] {
  return [...tables, table].sort();
}

export function deleteTable(tables: string[], table: string): string[] {
  return tables.filter(current => current !== table);
}
