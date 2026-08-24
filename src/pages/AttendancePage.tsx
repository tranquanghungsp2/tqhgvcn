import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock3, Save, UserMinus } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { listAttendanceByDate, saveAttendanceBatch } from '../services/attendanceService';
import { todayISO } from '../services/dateUtils';
import { listStudents } from '../services/studentService';
import type { AttendanceStatus, Student } from '../types';

type RowState = { status: AttendanceStatus; note: string };

export function AttendancePage() {
  const { currentClassId } = useClassRoom(); const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]); const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState<Record<string, RowState>>({}); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');

  async function reload() {
    if (!currentClassId) return;
    const [studentData, records] = await Promise.all([listStudents(currentClassId), listAttendanceByDate(currentClassId, date)]);
    setStudents(studentData);
    const recordMap = new Map(records.map((item) => [item.studentId, item]));
    setRows(Object.fromEntries(studentData.map((student) => {
      const item = recordMap.get(student.id);
      return [student.id, { status: item?.status || 'present', note: item?.note || '' }];
    })));
  }
  useEffect(() => { void reload(); }, [currentClassId, date]);

  const stats = useMemo(() => Object.values(rows).reduce<Record<AttendanceStatus, number>>((acc, row) => { acc[row.status] += 1; return acc; }, { present: 0, late: 0, absent: 0, excused: 0 }), [rows]);

  async function save() {
    if (!currentClassId || !profile) return;
    setBusy(true); setMessage('');
    try {
      await saveAttendanceBatch({ classId: currentClassId, date, recorderUid: profile.uid, recorderName: profile.displayName, records: students.map((student) => ({ studentId: student.id, studentName: student.fullName, status: rows[student.id]?.status || 'present', note: rows[student.id]?.note || '' })) });
      setMessage(`Đã lưu chuyên cần ngày ${date}.`);
    } finally { setBusy(false); }
  }

  if (!currentClassId) return <EmptyClass />;
  return <>
    <PageHeader title="Nề nếp - Chuyên cần" description="Điểm danh theo ngày, theo dõi đi muộn/vắng và ghi chú nguyên nhân." actions={<div className="row-actions"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /><button className="btn primary" disabled={busy} onClick={() => void save()}><Save size={16} />{busy ? 'Đang lưu...' : 'Lưu điểm danh'}</button></div>} />
    {message && <div className="alert success-alert"><CheckCircle2 size={16} />{message}</div>}
    <div className="attendance-stats"><div><CheckCircle2 /><strong>{stats.present}</strong><span>Có mặt</span></div><div><Clock3 /><strong>{stats.late}</strong><span>Đi muộn</span></div><div><UserMinus /><strong>{stats.absent}</strong><span>Vắng</span></div><div><CalendarCheck /><strong>{stats.excused}</strong><span>Có phép</span></div></div>
    <section className="card"><div className="table-wrap"><table><thead><tr><th>Học sinh</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody>{students.map((student) => <tr key={student.id}><td><div className="person-cell"><div className="mini-avatar">{student.fullName.slice(0,1)}</div><div><strong>{student.fullName}</strong><span>{student.studentCode || student.groupName || 'Học sinh'}</span></div></div></td><td><select value={rows[student.id]?.status || 'present'} onChange={(e) => setRows((current) => ({ ...current, [student.id]: { ...current[student.id], status: e.target.value as AttendanceStatus } }))}><option value="present">Có mặt</option><option value="late">Đi muộn</option><option value="absent">Vắng</option><option value="excused">Vắng có phép</option></select></td><td><input value={rows[student.id]?.note || ''} onChange={(e) => setRows((current) => ({ ...current, [student.id]: { ...current[student.id], note: e.target.value } }))} placeholder="Ghi chú nếu có..." /></td></tr>)}</tbody></table>{students.length === 0 && <div className="empty-inline">Chưa có học sinh.</div>}</div></section>
  </>;
}
