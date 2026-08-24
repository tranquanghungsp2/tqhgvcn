import { supabase } from '../supabase/config';
import type { AppUser } from '../types';
import { mapProfileRow } from './mappers';

export async function loginWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { queryParams: { prompt: 'select_account' } }
  });
  if (error) throw error;
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Tạo/duyệt profile giờ nằm ở trigger phía server (handle_new_user trong
 * migration.sql), chạy tự động ngay khi có tài khoản mới trong auth.users.
 * Hàm này chỉ đọc lại profile — không tự set role/permission như bản Firebase
 * (bản cũ làm việc này ở client, kém an toàn hơn).
 */
export async function loadProfile(userId: string): Promise<AppUser | null> {
  const [{ data: profileRow, error: profileError }, { data: classRows, error: classError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_classes').select('class_id').eq('user_id', userId)
  ]);
  if (profileError) throw profileError;
  if (classError) throw classError;
  if (!profileRow) return null;
  const classIds = (classRows || []).map((row) => row.class_id as string);
  return mapProfileRow(profileRow, classIds);
}

export async function loginWithStudentCode(studentCode: string, password: string): Promise<void> {
  const email = `${studentCode.trim().toLowerCase()}@hocsinh.local`;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Sai Mã học sinh hoặc mật khẩu.');
}
