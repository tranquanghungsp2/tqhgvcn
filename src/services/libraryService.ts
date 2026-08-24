import { supabase } from '../supabase/config';
import type { LibraryItem } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

export async function listLibraryItems(classId: string): Promise<LibraryItem[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('library_items')
    .select('*')
    .eq('class_id', classId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return rowsToCamel<LibraryItem>(data);
}

export async function saveLibraryItem(input: Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { classId: string }): Promise<void> {
  const url = input.url.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('Liên kết tài liệu phải bắt đầu bằng http:// hoặc https://');
  const payload = objToSnake({ ...input, url, status: 'active' } as unknown as Record<string, unknown>);
  const { error } = await supabase.from('library_items').insert(payload);
  if (error) throw error;
}

export async function cancelLibraryItem(_classId: string, id: string): Promise<void> {
  const { error } = await supabase.from('library_items').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}
