import { supabase } from '../supabase/config';
import type { GoodDeedRecord } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

export async function listGoodDeeds(classId: string, max = 200): Promise<GoodDeedRecord[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('good_deeds')
    .select('*')
    .eq('class_id', classId)
    .neq('status', 'cancelled')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return rowsToCamel<GoodDeedRecord>(data);
}

export async function addGoodDeed(input: Omit<GoodDeedRecord, 'id' | 'createdAt' | 'status'> & { classId: string }): Promise<void> {
  const payload = objToSnake({
    ...input,
    leafValue: Math.max(1, Math.min(5, Number(input.leafValue || 1))),
    status: 'active'
  } as unknown as Record<string, unknown>);
  const { error } = await supabase.from('good_deeds').insert(payload);
  if (error) throw error;
}

export async function cancelGoodDeed(_classId: string, id: string): Promise<void> {
  const { error } = await supabase.from('good_deeds').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}

export function countGoodDeedsByStudent(records: GoodDeedRecord[]): Record<string, number> {
  return records.reduce<Record<string, number>>((acc, item) => {
    acc[item.studentId] = (acc[item.studentId] || 0) + Number(item.leafValue || 1);
    return acc;
  }, {});
}
