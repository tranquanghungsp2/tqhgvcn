import { supabase } from '../supabase/config';
import type { ScoreProposal, ScoreRecord, ScoreType } from '../types';
import { rowsToCamel } from './caseUtils';

export function scoreDelta(type: ScoreType, value: number): number {
  return type === 'Điểm cộng' || type === 'Khắc phục' ? Math.abs(value) : -Math.abs(value);
}

// Toàn bộ thao tác cộng/trừ điểm + cập nhật totalScore của học sinh được thực
// hiện nguyên tử trong các hàm Postgres (add_score, cancel_score,
// submit_score_proposal, review_score_proposal) — xem supabase/migration.sql
// mục 8.1–8.4. Thay cho runTransaction() phía client ở bản Firestore.

export async function addScore(input: {
  classId: string;
  studentId: string;
  studentName: string;
  type: ScoreType;
  value: number;
  note?: string;
}): Promise<void> {
  if (!Number.isFinite(input.value) || input.value <= 0) throw new Error('Số điểm phải lớn hơn 0.');
  const { error } = await supabase.rpc('add_score', {
    p_class_id: input.classId,
    p_student_id: input.studentId,
    p_student_name: input.studentName,
    p_type: input.type,
    p_value: input.value,
    p_note: input.note || ''
  });
  if (error) throw error;
}

export async function cancelScore(input: { classId: string; score: ScoreRecord }): Promise<void> {
  const { error } = await supabase.rpc('cancel_score', { p_score_id: input.score.id });
  if (error) throw error;
}

export async function listRecentScores(classId: string, max = 50): Promise<ScoreRecord[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return rowsToCamel<ScoreRecord>(data);
}

export async function submitScoreProposal(input: {
  classId: string;
  studentId: string;
  studentName: string;
  type: ScoreType;
  value: number;
  note?: string;
}): Promise<void> {
  if (!Number.isFinite(input.value) || input.value < 1 || input.value > 10) {
    throw new Error('Mỗi đề nghị chỉ được từ 1 đến 10 điểm.');
  }
  const { error } = await supabase.rpc('submit_score_proposal', {
    p_class_id: input.classId,
    p_student_id: input.studentId,
    p_student_name: input.studentName,
    p_type: input.type,
    p_value: input.value,
    p_note: input.note || ''
  });
  if (error) throw error;
}

export async function listPendingScoreProposals(classId: string): Promise<ScoreProposal[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('score_proposals')
    .select('*')
    .eq('class_id', classId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return rowsToCamel<ScoreProposal>(data);
}

export async function listOwnScoreProposals(classId: string, uid: string): Promise<ScoreProposal[]> {
  if (!classId || !uid) return [];
  const { data, error } = await supabase
    .from('score_proposals')
    .select('*')
    .eq('class_id', classId)
    .eq('proposer_uid', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return rowsToCamel<ScoreProposal>(data);
}

export async function reviewScoreProposal(input: {
  classId: string;
  proposal: ScoreProposal;
  action: 'approved' | 'rejected';
  reviewNote?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('review_score_proposal', {
    p_proposal_id: input.proposal.id,
    p_action: input.action,
    p_review_note: input.reviewNote || ''
  });
  if (error) throw error;
}
