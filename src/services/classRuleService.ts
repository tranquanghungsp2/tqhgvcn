import { supabase } from '../supabase/config';
import { DEFAULT_CLASS_RULES } from './constants';
import type { ClassRule } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

export async function listClassRules(classId: string): Promise<ClassRule[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('class_rules')
    .select('*')
    .eq('class_id', classId)
    .neq('is_active', false)
    .order('order', { ascending: true });
  if (error) throw error;
  return rowsToCamel<ClassRule>(data);
}

export async function saveClassRule(input: {
  classId: string;
  id?: string;
  order: number;
  title: string;
  description: string;
  icon?: string;
  creatorUid: string;
  creatorName: string;
}): Promise<string> {
  const { id, ...rest } = input;
  const payload = objToSnake({
    ...rest,
    title: input.title.trim(),
    description: input.description.trim(),
    icon: input.icon || '🌿',
    isActive: true
  } as unknown as Record<string, unknown>);

  if (id) {
    const { error } = await supabase.from('class_rules').update(payload).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from('class_rules').insert(payload).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function archiveClassRule(_classId: string, ruleId: string): Promise<void> {
  const { error } = await supabase.from('class_rules').update({ is_active: false }).eq('id', ruleId);
  if (error) throw error;
}

export async function seedDefaultClassRules(classId: string, creatorUid: string, creatorName: string): Promise<void> {
  const rows = DEFAULT_CLASS_RULES.map((item, index) => objToSnake({
    classId,
    order: index + 1,
    ...item,
    isActive: true,
    creatorUid,
    creatorName
  } as unknown as Record<string, unknown>));
  const { error } = await supabase.from('class_rules').insert(rows);
  if (error) throw error;
}
