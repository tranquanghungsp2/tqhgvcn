import { supabase } from '../supabase/config';
import type { ParentCommunication } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

export async function listParentCommunications(classId: string, max = 50): Promise<ParentCommunication[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('parent_communications')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return rowsToCamel<ParentCommunication>(data);
}

export async function logParentCommunication(input: Omit<ParentCommunication, 'id' | 'createdAt'> & { classId: string }): Promise<void> {
  const payload = objToSnake({ ...input } as unknown as Record<string, unknown>);
  const { error } = await supabase.from('parent_communications').insert(payload);
  if (error) throw error;
}
