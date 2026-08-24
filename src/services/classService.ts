import { supabase } from '../supabase/config';
import type { AppUser, ClassRoom } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

function sortClasses(items: ClassRoom[]): ClassRoom[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

export async function listAllClasses(): Promise<ClassRoom[]> {
  const { data, error } = await supabase.from('classes').select('*');
  if (error) throw error;
  return sortClasses(rowsToCamel<ClassRoom>(data));
}

export async function listClassesForUser(user: AppUser): Promise<ClassRoom[]> {
  if (user.role === 'admin') {
    const all = await listAllClasses();
    return all.filter((item) => item.isActive);
  }
  if (!user.classIds || user.classIds.length === 0) return [];
  const { data, error } = await supabase.from('classes').select('*').in('id', user.classIds);
  if (error) throw error;
  return sortClasses(rowsToCamel<ClassRoom>(data).filter((item) => item.isActive));
}

export async function createClass(input: Omit<ClassRoom, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const name = input.name.trim();
  const schoolYear = input.schoolYear.trim();
  if (!name) throw new Error('Tên lớp không được để trống.');
  if (!schoolYear) throw new Error('Năm học không được để trống.');

  const payload = objToSnake({
    ...input,
    name,
    schoolYear,
    grade: input.grade?.trim() || '',
    homeroomTeacher: input.homeroomTeacher?.trim() || '',
    motto: input.motto?.trim() || '',
    slogan: input.slogan?.trim() || '',
    isActive: input.isActive !== false
  } as unknown as Record<string, unknown>);

  const { data, error } = await supabase.from('classes').insert(payload).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function updateClass(
  classId: string,
  values: Partial<Pick<ClassRoom, 'name' | 'schoolYear' | 'grade' | 'homeroomTeacher' | 'motto' | 'slogan' | 'isActive'>>
): Promise<void> {
  const next: typeof values = { ...values };
  if (typeof next.name === 'string') next.name = next.name.trim();
  if (typeof next.schoolYear === 'string') next.schoolYear = next.schoolYear.trim();
  if (typeof next.grade === 'string') next.grade = next.grade.trim();
  if (typeof next.homeroomTeacher === 'string') next.homeroomTeacher = next.homeroomTeacher.trim();
  if (typeof next.motto === 'string') next.motto = next.motto.trim();
  if (typeof next.slogan === 'string') next.slogan = next.slogan.trim();

  const payload = objToSnake(next as unknown as Record<string, unknown>);
  const { error } = await supabase.from('classes').update(payload).eq('id', classId);
  if (error) throw error;
}
