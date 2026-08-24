import { supabase } from '../supabase/config';
import type { TaskItem, TaskStatus } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

export async function listTasks(classId: string): Promise<TaskItem[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('class_id', classId)
    .neq('status', 'cancelled');
  if (error) throw error;
  return rowsToCamel<TaskItem>(data).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
}

export async function saveTask(input: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'> & { classId: string; id?: string }): Promise<string> {
  const { id, ...data } = input;
  const progress = Math.max(0, Math.min(100, Number(data.progress || 0)));
  const status: TaskStatus = progress >= 100 ? 'done' : data.status;
  const payload = objToSnake({ ...data, progress, status } as unknown as Record<string, unknown>);

  if (id) {
    const { error } = await supabase.from('tasks').update(payload).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data: inserted, error } = await supabase.from('tasks').insert(payload).select('id').single();
  if (error) throw error;
  return inserted.id as string;
}

export async function updateTaskProgress(_classId: string, taskId: string, progress: number): Promise<void> {
  const next = Math.max(0, Math.min(100, Math.round(progress)));
  const { error } = await supabase
    .from('tasks')
    .update({ progress: next, status: next >= 100 ? 'done' : 'doing' })
    .eq('id', taskId);
  if (error) throw error;
}

export async function cancelTask(_classId: string, taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', taskId);
  if (error) throw error;
}
