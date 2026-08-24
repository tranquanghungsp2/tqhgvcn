import { supabase } from '../supabase/config';
import type { AttendanceRecord, AttendanceStatus } from '../types';
import { rowsToCamel } from './caseUtils';

export async function listAttendanceByDate(classId: string, date: string): Promise<AttendanceRecord[]> {
  if (!classId || !date) return [];
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('class_id', classId)
    .eq('date', date);
  if (error) throw error;
  return rowsToCamel<AttendanceRecord>(data);
}

export async function saveAttendanceBatch(input: {
  classId: string;
  date: string;
  records: Array<{ studentId: string; studentName: string; status: AttendanceStatus; note?: string }>;
  recorderUid: string;
  recorderName: string;
}): Promise<void> {
  if (input.records.length === 0) return;
  const rows = input.records.map((item) => ({
    id: `${input.date}_${item.studentId}`,
    class_id: input.classId,
    date: input.date,
    student_id: item.studentId,
    student_name: item.studentName,
    status: item.status,
    note: item.note || '',
    recorder_uid: input.recorderUid,
    recorder_name: input.recorderName
  }));
  // upsert theo id "date_studentId" — giữ đúng tính idempotent của bản gốc
  const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function listAttendanceRange(classId: string, fromDate: string, toDate: string): Promise<AttendanceRecord[]> {
  if (!classId) return [];
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('class_id', classId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false });
  if (error) throw error;
  return rowsToCamel<AttendanceRecord>(data);
}
