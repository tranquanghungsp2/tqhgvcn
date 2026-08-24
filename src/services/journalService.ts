import { supabase } from '../supabase/config';
import type { JournalEntry } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

export async function listJournalEntries(classId: string, max = 100): Promise<JournalEntry[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('class_id', classId)
    .neq('status', 'archived')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return rowsToCamel<JournalEntry>(data);
}

export async function addJournalEntry(input: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { classId: string }): Promise<void> {
  if (!input.title.trim() || !input.content.trim()) throw new Error('Tiêu đề và nội dung nhật ký không được để trống.');
  if (input.imageUrl && !/^https?:\/\//i.test(input.imageUrl)) throw new Error('Ảnh minh họa phải là URL http/https.');
  const payload = objToSnake({
    ...input,
    title: input.title.trim(),
    content: input.content.trim(),
    imageUrl: input.imageUrl?.trim() || '',
    status: 'active'
  } as unknown as Record<string, unknown>);
  const { error } = await supabase.from('journal_entries').insert(payload);
  if (error) throw error;
}

export async function archiveJournalEntry(_classId: string, entryId: string): Promise<void> {
  const { error } = await supabase.from('journal_entries').update({ status: 'archived' }).eq('id', entryId);
  if (error) throw error;
}
