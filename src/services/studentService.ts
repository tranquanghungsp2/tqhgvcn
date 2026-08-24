import { supabase } from '../supabase/config';
import type { PublicStudent, Student, StudentCreateInput } from '../types';
import { objToSnake, rowsToCamel } from './caseUtils';

function isVisibleStatus(status?: string) {
  return status !== 'Lưu trữ';
}

function studentPayload(input: StudentCreateInput) {
  return objToSnake({
    ...input,
    studentCode: input.studentCode?.trim() || '',
    fullName: input.fullName.trim(),
    avatarURL: input.avatarURL?.trim() || '',
    groupName: input.groupName?.trim() || '',
    totalScore: Number.isFinite(input.totalScore) ? input.totalScore : 100,
    totalStars: Number.isFinite(input.totalStars) ? input.totalStars : 0,
    qualityAvg: Number.isFinite(input.qualityAvg) ? input.qualityAvg : 0,
    competencyAvg: Number.isFinite(input.competencyAvg) ? input.competencyAvg : 0,
    qualityScoreSum: Number.isFinite(input.qualityScoreSum) ? input.qualityScoreSum : 0,
    qualityScoreCount: Number.isFinite(input.qualityScoreCount) ? input.qualityScoreCount : 0,
    competencyScoreSum: Number.isFinite(input.competencyScoreSum) ? input.competencyScoreSum : 0,
    competencyScoreCount: Number.isFinite(input.competencyScoreCount) ? input.competencyScoreCount : 0
  } as unknown as Record<string, unknown>);
}

export async function listStudents(classId: string, includeArchived = false): Promise<Student[]> {
  if (!classId) return [];
  let query = supabase.from('students').select('*').eq('class_id', classId).order('full_name', { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  const items = rowsToCamel<Student>(data);
  return includeArchived ? items : items.filter((item) => isVisibleStatus(item.status));
}

// Đọc từ view student_directory (KHÔNG có email/SĐT/địa chỉ/phụ huynh) — dùng
// cho vai trò chỉ được thấy danh bạ công khai (vd. cán bộ lớp).
export async function listStudentDirectory(classId: string, includeArchived = false): Promise<PublicStudent[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('student_directory')
    .select('*')
    .eq('class_id', classId)
    .order('full_name', { ascending: true });
  if (error) throw error;
  const items = rowsToCamel<PublicStudent>(data);
  return includeArchived ? items : items.filter((item) => isVisibleStatus(item.status));
}

export async function createStudent(classId: string, input: StudentCreateInput): Promise<void> {
  const { error } = await supabase.from('students').insert({ ...studentPayload(input), class_id: classId });
  if (error) throw error;
}

export async function createStudentsBatch(classId: string, inputs: StudentCreateInput[]): Promise<number> {
  if (!classId || inputs.length === 0) return 0;
  const chunkSize = 300;
  let created = 0;
  for (let start = 0; start < inputs.length; start += chunkSize) {
    const chunk = inputs.slice(start, start + chunkSize).map((input) => ({ ...studentPayload(input), class_id: classId }));
    const { error } = await supabase.from('students').insert(chunk);
    if (error) throw error;
    created += chunk.length;
  }
  return created;
}

export async function updateStudent(classId: string, studentId: string, values: Partial<Student>): Promise<void> {
  // Các chỉ số tổng hợp (điểm, sao, đánh giá) chỉ được thay đổi bởi các hàm
  // RPC nghiệp vụ tương ứng (add_score, award_star, add_assessment...) để
  // không làm lệch lịch sử — giữ đúng tinh thần của bản Firestore gốc.
  const {
    id: _id,
    createdAt: _createdAt,
    archivedAt: _archivedAt,
    totalScore: _totalScore,
    totalStars: _totalStars,
    qualityAvg: _qualityAvg,
    competencyAvg: _competencyAvg,
    qualityScoreSum: _qualityScoreSum,
    qualityScoreCount: _qualityScoreCount,
    competencyScoreSum: _competencyScoreSum,
    competencyScoreCount: _competencyScoreCount,
    ...rest
  } = values;
  const payload = objToSnake(rest as Record<string, unknown>);
  const { error } = await supabase.from('students').update(payload).eq('id', studentId).eq('class_id', classId);
  if (error) throw error;
}

export async function archiveStudent(classId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ status: 'Lưu trữ', archived_at: new Date().toISOString() })
    .eq('id', studentId)
    .eq('class_id', classId);
  if (error) throw error;
}

export async function restoreStudent(classId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ status: 'Đang học', archived_at: null })
    .eq('id', studentId)
    .eq('class_id', classId);
  if (error) throw error;
}

// Giữ API cũ để các màn hình cũ không bị vỡ; hành vi là lưu trữ mềm, không xóa cứng.
export async function removeStudent(classId: string, studentId: string): Promise<void> {
  await archiveStudent(classId, studentId);
}

export async function createLegacyStudentOnly(classId: string, input: StudentCreateInput): Promise<string> {
  const { data, error } = await supabase
    .from('students')
    .insert({ ...studentPayload(input), class_id: classId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Ở bản Firestore, students và studentDirectory là 2 collection ghi đôi nên
 * có thể lệch nhau và cần đồng bộ thủ công. Ở Supabase, student_directory là
 * MỘT VIEW đọc trực tiếp từ bảng students — luôn đồng bộ tuyệt đối, không có
 * khái niệm "lệch dữ liệu" nữa. Hàm này giữ lại để các trang cũ không lỗi khi
 * gọi, nhưng luôn trả về 0 (không có gì cần đồng bộ).
 */
export async function syncStudentDirectory(_classId: string): Promise<number> {
  return 0;
}
