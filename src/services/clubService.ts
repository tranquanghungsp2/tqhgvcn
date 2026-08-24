import { supabase } from '../supabase/config';
import type { ClubItem } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

export async function listClubs(classId: string): Promise<ClubItem[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('class_id', classId)
    .neq('status', 'archived')
    .order('name', { ascending: true });
  if (error) throw error;
  return rowsToCamel<ClubItem>(data);
}

export async function saveClub(input: Omit<ClubItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { classId: string }): Promise<void> {
  if (!input.name.trim()) throw new Error('Tên CLB/đội nhóm không được để trống.');
  const payload = objToSnake({
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || '',
    leader: input.leader?.trim() || '',
    meetingSchedule: input.meetingSchedule?.trim() || '',
    status: 'active'
  } as unknown as Record<string, unknown>);
  const { error } = await supabase.from('clubs').insert(payload);
  if (error) throw error;
}

export async function archiveClub(_classId: string, clubId: string): Promise<void> {
  const { error } = await supabase.from('clubs').update({ status: 'archived' }).eq('id', clubId);
  if (error) throw error;
}
