import { supabase } from '../supabase/config';
import type { AssessmentCategory, AssessmentCurrent, AssessmentRecord, Student } from '../types';
import { rowsToCamel } from './caseUtils';

function criterionHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function currentAssessmentId(studentId: string, category: AssessmentCategory, criterion: string) {
  return `${studentId}_${category}_${criterionHash(criterion)}`;
}

// Việc cộng điểm/tính trung bình được thực hiện nguyên tử (atomic) trong hàm
// Postgres add_assessment (xem supabase/migration.sql mục 8.5) — thay cho
// runTransaction() phía client ở bản Firestore.
export async function addAssessment(input: {
  classId: string;
  studentId: string;
  studentName: string;
  category: AssessmentCategory;
  criterion: string;
  score: number;
  comment?: string;
}): Promise<void> {
  if (!Number.isFinite(input.score) || input.score < 1 || input.score > 5) {
    throw new Error('Điểm đánh giá phải từ 1 đến 5.');
  }
  const { error } = await supabase.rpc('add_assessment', {
    p_class_id: input.classId,
    p_student_id: input.studentId,
    p_student_name: input.studentName,
    p_category: input.category,
    p_criterion: input.criterion,
    p_score: input.score,
    p_comment: input.comment || ''
  });
  if (error) throw error;
}

export async function listAssessments(classId: string, studentId?: string): Promise<AssessmentRecord[]> {
  if (!classId) return [];
  let query = supabase.from('assessments').select('*').eq('class_id', classId);
  if (studentId) query = query.eq('student_id', studentId);
  const { data, error } = await query;
  if (error) throw error;
  return rowsToCamel<AssessmentRecord>(data);
}

export async function listCurrentAssessments(classId: string, studentId?: string): Promise<AssessmentCurrent[]> {
  if (!classId) return [];
  let query = supabase.from('assessment_current').select('*').eq('class_id', classId);
  if (studentId) query = query.eq('student_id', studentId);
  const { data, error } = await query;
  if (error) throw error;
  return rowsToCamel<AssessmentCurrent>(data);
}

/**
 * Công cụ dành cho Admin (trang Cài đặt): tính lại toàn bộ assessmentCurrent +
 * trung bình phẩm chất/năng lực của học sinh từ lịch sử "assessments".
 * Ở bản Supabase, add_assessment() luôn giữ dữ liệu đồng bộ nguyên tử, nên
 * hàm này chỉ cần thiết nếu có chỉnh sửa dữ liệu thủ công ngoài luồng ứng dụng.
 */
export async function migrateAssessmentCurrent(classId: string): Promise<{ currentRecords: number; studentsUpdated: number }> {
  if (!classId) return { currentRecords: 0, studentsUpdated: 0 };

  const [{ data: assessmentRows, error: assessmentError }, { data: studentRows, error: studentError }] = await Promise.all([
    supabase.from('assessments').select('*').eq('class_id', classId),
    supabase.from('students').select('*').eq('class_id', classId)
  ]);
  if (assessmentError) throw assessmentError;
  if (studentError) throw studentError;

  const assessments = rowsToCamel<AssessmentRecord>(assessmentRows);
  const students = rowsToCamel<Student>(studentRows);

  const latest = new Map<string, AssessmentRecord>();
  for (const record of assessments) {
    if (record.status === 'cancelled') continue;
    const key = currentAssessmentId(record.studentId, record.category, record.criterion);
    const previous = latest.get(key);
    if (!previous || new Date(record.createdAt || 0).getTime() >= new Date(previous.createdAt || 0).getTime()) {
      latest.set(key, record);
    }
  }

  const aggregates = new Map<string, { qualitySum: number; qualityCount: number; competencySum: number; competencyCount: number }>();
  for (const record of latest.values()) {
    const current = aggregates.get(record.studentId) || { qualitySum: 0, qualityCount: 0, competencySum: 0, competencyCount: 0 };
    if (record.category === 'quality') {
      current.qualitySum += Number(record.score || 0);
      current.qualityCount += 1;
    } else {
      current.competencySum += Number(record.score || 0);
      current.competencyCount += 1;
    }
    aggregates.set(record.studentId, current);
  }

  const currentRows = Array.from(latest.entries()).map(([key, record]) => ({
    id: key,
    class_id: classId,
    student_id: record.studentId,
    student_name: record.studentName,
    category: record.category,
    criterion: record.criterion,
    score: Number(record.score || 0),
    comment: record.comment || '',
    assessor_uid: record.assessorUid || null,
    assessor_name: record.assessorName || '',
    status: 'active',
    history_id: record.id
  }));

  for (let start = 0; start < currentRows.length; start += 400) {
    const chunk = currentRows.slice(start, start + 400);
    const { error } = await supabase.from('assessment_current').upsert(chunk, { onConflict: 'id' });
    if (error) throw error;
  }

  let studentsUpdated = 0;
  for (let start = 0; start < students.length; start += 400) {
    const chunk = students.slice(start, start + 400);
    const updates = chunk.map((student) => {
      const agg = aggregates.get(student.id) || { qualitySum: 0, qualityCount: 0, competencySum: 0, competencyCount: 0 };
      const qualityAvg = agg.qualityCount ? Math.round((agg.qualitySum / agg.qualityCount) * 10) / 10 : 0;
      const competencyAvg = agg.competencyCount ? Math.round((agg.competencySum / agg.competencyCount) * 10) / 10 : 0;
      return { id: student.id, qualityAvg, competencyAvg, agg };
    });
    await Promise.all(updates.map(async (item) => {
      const { error } = await supabase.from('students').update({
        quality_score_sum: item.agg.qualitySum,
        quality_score_count: item.agg.qualityCount,
        competency_score_sum: item.agg.competencySum,
        competency_score_count: item.agg.competencyCount,
        quality_avg: item.qualityAvg,
        competency_avg: item.competencyAvg
      }).eq('id', item.id);
      if (error) throw error;
      studentsUpdated += 1;
    }));
  }

  return { currentRecords: latest.size, studentsUpdated };
}
