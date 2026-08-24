import type { AppUser } from '../types';
import { rowToCamel } from './caseUtils';

export function mapProfileRow(row: Record<string, unknown>, classIds: string[] = []): AppUser {
  const camel = rowToCamel<Omit<AppUser, 'uid' | 'classIds'> & { id: string }>(row);
  const { id, ...rest } = camel;
  return { uid: id, classIds, ...rest };
}
