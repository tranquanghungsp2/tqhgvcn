import { supabase } from '../supabase/config';
import type { PublicStudent, Student } from '../types';
import { rowsToCamel } from './caseUtils';

export interface DashboardStats {
  totalStudents: number;
  avgScore: number;
  totalStars: number;
  qualityAvg: number;
  competencyAvg: number;
}

function average(values: number[]) {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
}

export async function getDashboardStats(classId: string): Promise<DashboardStats> {
  if (!classId) return { totalStudents: 0, avgScore: 0, totalStars: 0, qualityAvg: 0, competencyAvg: 0 };
  const { data, error } = await supabase.from('students').select('*').eq('class_id', classId);
  if (error) throw error;
  const students = rowsToCamel<Student>(data).filter((item) => item.status !== 'Lưu trữ');
  const qualityValues = students.map((item) => Number(item.qualityAvg || 0)).filter((value) => value > 0);
  const competencyValues = students.map((item) => Number(item.competencyAvg || 0)).filter((value) => value > 0);
  return {
    totalStudents: students.length,
    avgScore: average(students.map((item) => Number(item.totalScore || 0))),
    totalStars: students.reduce((sum, item) => sum + Number(item.totalStars || 0), 0),
    qualityAvg: average(qualityValues),
    competencyAvg: average(competencyValues)
  };
}

// Dùng cho các vai trò chỉ thấy được danh bạ công khai (vd. cán bộ lớp) —
// đọc từ view student_directory, không có email/SĐT/địa chỉ.
export async function getPublicDashboardStats(classId: string): Promise<DashboardStats> {
  if (!classId) return { totalStudents: 0, avgScore: 0, totalStars: 0, qualityAvg: 0, competencyAvg: 0 };
  const { data, error } = await supabase.from('student_directory').select('*').eq('class_id', classId);
  if (error) throw error;
  const students = rowsToCamel<PublicStudent>(data).filter((item) => item.status !== 'Lưu trữ');
  return {
    totalStudents: students.length,
    avgScore: average(students.map((item) => Number(item.totalScore || 0))),
    totalStars: students.reduce((sum, item) => sum + Number(item.totalStars || 0), 0),
    qualityAvg: 0,
    competencyAvg: 0
  };
}
