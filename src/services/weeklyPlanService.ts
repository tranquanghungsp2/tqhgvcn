import { supabase } from '../supabase/config';
import type { WeeklyPlan } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

export async function addWeeklyPlan(input: Omit<WeeklyPlan, 'id' | 'createdAt' | 'status'> & { classId: string }): Promise<void> {
  const payload = objToSnake({ ...input, status: 'active' } as unknown as Record<string, unknown>);
  const { error } = await supabase.from('weekly_plans').insert(payload);
  if (error) throw error;
}

export async function listWeeklyPlans(classId: string, weekNumber: number): Promise<WeeklyPlan[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('class_id', classId)
    .eq('week_number', weekNumber);
  if (error) throw error;
  return rowsToCamel<WeeklyPlan>(data);
}
