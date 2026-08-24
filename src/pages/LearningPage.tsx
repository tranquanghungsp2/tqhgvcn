import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Award, BookOpen, Brain, GraduationCap, Plus, Star, Trash2, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { SUBJECTS } from '../services/constants';
import { todayISO } from '../services/dateUtils';
import { addLearningRecord, cancelLearningRecord, listLearningRecords } from '../services/learningService';
import { listStudents } from '../services/studentService';
import type { LearningRecord, LearningRecordType, Student } from '../types';

const TYPES: LearningRecordType[] = ['Kiểm tra', 'Bài tập', 'Phát biểu', 'Tiến bộ', 'Cần cố gắng'];

export function LearningPage() {
  const { currentClassId } = useClassRoom(); const { profile, can } = useAuth();
  const [students, setStudents] = useState<Student[]>([]); const [records, setRecords] = useState<LearningRecord[]>([]);
  const [studentId, setStudentId] = useState(''); const [subject, setSubject] = useState('Toán'); const [type, setType] = useState<LearningRecordType>('Kiểm tra');
  const [score, setScore] = useState<number | ''>(''); const [note, setNote] = useState(''); const [date, setDate] = useState(todayISO()); const [showForm, setShowForm] = useState(false); const [busy, setBusy] = useState(false);

  async function reload() { if (!currentClassId) return; const [s, r] = await Promise.all([listStudents(currentClassId), listLearningRecords(currentClassId)]); setStudents(s); setRecords(r); }
  useEffect(() => { void reload(); }, [currentClassId]);
  const selected = students.find((s) => s.id === studentId);
  const scored = records.filter((r) => typeof r.score === 'number');
  const avg = scored.length ? Math.round(scored.reduce((sum, r) => sum + Number(r.score), 0) / scored.length * 10) / 10 : 0;
  const subjectStats = useMemo(() => SUBJECTS.map((name) => {
    const values = records.filter((r) => r.subject === name && typeof r.score === 'number').map((r) => Number(r.score));
    return { name, avg: values.length ? Math.round(values.reduce((a,b) => a+b, 0) / values.length * 10) / 10 : 0, count: values.length };
  }).filter((x) => x.count > 0).sort((a,b) => b.avg - a.avg).slice(0, 6), [records]);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!currentClassId || !profile || !selected) return; setBusy(true);
    try { await addLearningRecord({ classId: currentClassId, studentId: selected.id, studentName: selected.fullName, subject, type, score: score === '' ? undefined : Number(score), note, date, creatorUid: profile.uid, creatorName: profile.displayName }); setNote(''); setScore(''); setShowForm(false); await reload(); } finally { setBusy(false); }
  }
  if (!currentClassId) return <EmptyClass />;
  return <>
    <PageHeader title="Học tập - Rèn luyện" description="Theo dõi kết quả học tập, sự tiến bộ và liên kết nhanh với điểm thi đua, 5 phẩm chất – 10 năng lực." actions={<button className="btn primary" onClick={() => setShowForm((v) => !v)}><Plus size={16} />Ghi nhận học tập</button>} />
    <div className="learning-metrics"><div><GraduationCap /><strong>{avg || '—'}</strong><span>Điểm TB bản ghi</span></div><div><TrendingUp /><strong>{records.filter((r) => r.type === 'Tiến bộ').length}</strong><span>Lần ghi nhận tiến bộ</span></div><div><BookOpen /><strong>{new Set(records.map((r) => r.subject)).size}</strong><span>Môn có dữ liệu</span></div></div>
    {showForm && <form className="card form-card" onSubmit={submit}><div className="form-grid cols-3"><label>Học sinh<select required value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">-- Chọn học sinh --</option>{students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select></label><label>Môn học<select value={subject} onChange={(e) => setSubject(e.target.value)}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></label><label>Loại ghi nhận<select value={type} onChange={(e) => setType(e.target.value as LearningRecordType)}>{TYPES.map((item) => <option key={item}>{item}</option>)}</select></label><label>Ngày<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Điểm (nếu có)<input type="number" min="0" max="10" step="0.1" value={score} onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))} /></label><label className="span-2">Nhận xét<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label></div><div className="row-actions end"><button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Hủy</button><button className="btn primary" disabled={busy}>Lưu ghi nhận</button></div></form>}
    <div className="learning-layout"><section className="card"><div className="card-head"><div><h3>Ghi nhận gần đây</h3><p>{records.length} bản ghi mới nhất.</p></div></div><div className="activity-list">{records.slice(0,30).map((item) => <div className="activity-row" key={item.id}><div className="score-circle">{typeof item.score === 'number' ? item.score : item.type === 'Tiến bộ' ? '↑' : '•'}</div><div className="activity-main"><strong>{item.studentName}</strong><span>{item.subject} • {item.type} • {item.date}</span><small>{item.note || 'Không có nhận xét'}</small></div><button className="plain-icon danger-text" title="Hủy bản ghi" onClick={async () => { if (!confirm('Hủy ghi nhận này?')) return; await cancelLearningRecord(currentClassId, item.id); await reload(); }}><Trash2 size={14} /></button></div>)}{records.length === 0 && <div className="empty-inline">Chưa có dữ liệu học tập.</div>}</div></section><aside className="learning-side"><section className="soft-panel"><div className="garden-panel-title"><Award size={18} /> THEO MÔN</div>{subjectStats.map((item) => <div className="subject-progress" key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.avg * 10}%` }} /></div><strong>{item.avg}</strong></div>)}{subjectStats.length === 0 && <div className="empty-soft">Chưa có điểm theo môn.</div>}</section><section className="soft-panel learning-tools"><div className="garden-panel-title"><Brain size={18} /> CÔNG CỤ ĐÁNH GIÁ</div>{can('manageAssessments') && <Link to="/assessments"><Brain />5 phẩm chất & 10 năng lực</Link>}{can('manageScores') && <Link to="/scores"><TrendingUp />Điểm thi đua</Link>}{can('manageStars') && <Link to="/stars"><Star />Tặng sao khích lệ</Link>}</section></aside></div>
  </>;
}
