import { supabase } from '../supabase/config';
import type { LearningRecord } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

export async function listLearningRecords(classId: string, max = 100): Promise<LearningRecord[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('learning_records')
    .select('*')
    .eq('class_id', classId)
    .neq('status', 'cancelled')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return rowsToCamel<LearningRecord>(data);
}

export async function addLearningRecord(input: Omit<LearningRecord, 'id' | 'createdAt' | 'status'> & { classId: string }): Promise<void> {
  const payload = objToSnake({ ...input, status: 'active' } as unknown as Record<string, unknown>);
  const { error } = await supabase.from('learning_records').insert(payload);
  if (error) throw error;
}

export async function cancelLearningRecord(_classId: string, id: string): Promise<void> {
  const { error } = await supabase.from('learning_records').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}
