import { supabase } from '../supabase/config';
import type { NotificationItem } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

export async function addNotification(input: Omit<NotificationItem, 'id' | 'createdAt' | 'status'> & { classId: string }): Promise<void> {
  const payload = objToSnake({ ...input, status: 'active' } as unknown as Record<string, unknown>);
  const { error } = await supabase.from('notifications').insert(payload);
  if (error) throw error;
}

export async function listNotifications(classId: string): Promise<NotificationItem[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return rowsToCamel<NotificationItem>(data);
}
