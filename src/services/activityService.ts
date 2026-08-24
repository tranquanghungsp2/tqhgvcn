import { supabase } from '../supabase/config';
import type { ActivityItem } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

export async function listActivities(classId: string): Promise<ActivityItem[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('class_id', classId)
    .neq('status', 'cancelled')
    .order('date', { ascending: true });
  if (error) throw error;
  return rowsToCamel<ActivityItem>(data);
}

export async function saveActivity(input: Omit<ActivityItem, 'id' | 'createdAt' | 'updatedAt'> & { classId: string; id?: string }): Promise<string> {
  const { id, ...data } = input;
  const payload = objToSnake(data as unknown as Record<string, unknown>);
  if (id) {
    const { error } = await supabase.from('activities').update(payload).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data: inserted, error } = await supabase.from('activities').insert(payload).select('id').single();
  if (error) throw error;
  return inserted.id as string;
}

export async function cancelActivity(_classId: string, id: string): Promise<void> {
  const { error } = await supabase.from('activities').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}
