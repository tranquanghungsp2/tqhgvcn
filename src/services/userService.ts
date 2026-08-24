import { supabase } from '../supabase/config';
import type { AppUser, Invitation, Permissions, Role } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';
import { mapProfileRow } from './mappers';

export async function listUsers(): Promise<AppUser[]> {
  const [{ data: profileRows, error: profileError }, { data: classRows, error: classError }] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('user_classes').select('user_id, class_id')
  ]);
  if (profileError) throw profileError;
  if (classError) throw classError;

  const classIdsByUser = new Map<string, string[]>();
  for (const row of classRows || []) {
    const list = classIdsByUser.get(row.user_id) || [];
    list.push(row.class_id);
    classIdsByUser.set(row.user_id, list);
  }

  return (profileRows || [])
    .map((row) => mapProfileRow(row, classIdsByUser.get(row.id as string) || []))
    .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email, 'vi'));
}

export async function listInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase.from('invitations').select('*');
  if (error) throw error;
  return rowsToCamel<Invitation>(data).sort((a, b) => a.email.localeCompare(b.email));
}

export async function saveInvitation(input: {
  email: string;
  displayName: string;
  role: Role;
  permissions: Permissions;
  classIds: string[];
  linkedStudentId?: string;
  linkedStudentName?: string;
  createdBy: string;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes('@')) throw new Error('Email không hợp lệ.');
  if (input.role === 'student_officer') {
    if (input.classIds.length !== 1) throw new Error('Cán bộ lớp phải được gán đúng 1 lớp.');
    if (!input.linkedStudentId) throw new Error('Hãy liên kết tài khoản cán bộ với một học sinh trong lớp.');
  }

  const payload = objToSnake({
    ...input,
    email,
    linkedStudentId: input.linkedStudentId || null,
    linkedStudentName: input.linkedStudentName || '',
    isActive: true
  } as unknown as Record<string, unknown>);

  const { error } = await supabase.from('invitations').upsert(payload, { onConflict: 'email' });
  if (error) throw error;
}

export async function updateUserAccess(
  uid: string,
  values: Partial<Pick<AppUser, 'role' | 'isApproved' | 'isActive' | 'permissions' | 'classIds' | 'linkedStudentId' | 'linkedStudentName'>>
): Promise<void> {
  const { classIds, ...profileValues } = values;

  if (Object.keys(profileValues).length > 0) {
    const payload = objToSnake(profileValues as unknown as Record<string, unknown>);
    const { error } = await supabase.from('profiles').update(payload).eq('id', uid);
    if (error) throw error;
  }

  if (classIds) {
    // Thay toàn bộ user_classes của user này bằng danh sách mới (tương đương
    // gán lại mảng classIds trong bản Firestore).
    const { error: deleteError } = await supabase.from('user_classes').delete().eq('user_id', uid);
    if (deleteError) throw deleteError;
    if (classIds.length > 0) {
      const { error: insertError } = await supabase
        .from('user_classes')
        .insert(classIds.map((classId) => ({ user_id: uid, class_id: classId })));
      if (insertError) throw insertError;
    }
  }
}

export async function disableInvitation(email: string): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .update({ is_active: false })
    .eq('email', email.trim().toLowerCase());
  if (error) throw error;
}
