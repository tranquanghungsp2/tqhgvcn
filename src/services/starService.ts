import { supabase } from '../supabase/config';
import type { StarAward } from '../types';
import { rowsToCamel } from './caseUtils';

export async function awardStar(input: {
  classId: string;
  studentId: string;
  studentName: string;
  starType: string;
  reason: string;
  weekNumber: number;
}): Promise<void> {
  const { error } = await supabase.rpc('award_star', {
    p_class_id: input.classId,
    p_student_id: input.studentId,
    p_student_name: input.studentName,
    p_star_type: input.starType,
    p_reason: input.reason || '',
    p_week_number: input.weekNumber
  });
  if (error) throw error;
}

export async function revokeStar(input: { classId: string; award: StarAward }): Promise<void> {
  const { error } = await supabase.rpc('revoke_star', { p_award_id: input.award.id });
  if (error) throw error;
}

export async function listRecentStarAwards(classId: string, max = 40): Promise<StarAward[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('star_awards')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return rowsToCamel<StarAward>(data);
}
