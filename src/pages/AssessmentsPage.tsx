import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Brain, HeartHandshake } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { addAssessment, listAssessments } from '../services/assessmentService';
import { COMPETENCY_CRITERIA, QUALITY_CRITERIA } from '../services/constants';
import { listStudents } from '../services/studentService';
import type { AssessmentCategory, AssessmentRecord, Student } from '../types';

export function AssessmentsPage() {
  const { currentClassId } = useClassRoom();
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState<AssessmentCategory>('quality');
  const [criterion, setCriterion] = useState(QUALITY_CRITERIA[0]);
  const [score, setScore] = useState(4);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const criteria = category === 'quality' ? QUALITY_CRITERIA : COMPETENCY_CRITERIA;
  const selectedStudent = useMemo(() => students.find((item) => item.id === studentId), [students, studentId]);

  async function reload() {
    if (!currentClassId) return;
    const [studentData, assessmentData] = await Promise.all([listStudents(currentClassId), listAssessments(currentClassId)]);
    setStudents(studentData);
    setRecords(assessmentData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 30));
  }

  useEffect(() => { void reload(); }, [currentClassId]);
  useEffect(() => { setCriterion(criteria[0]); }, [category]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!currentClassId || !profile || !selectedStudent) return;
    setBusy(true); setError('');
    try {
      await addAssessment({
        classId: currentClassId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        category,
        criterion,
        score,
        comment
      });
      setComment(''); await reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu đánh giá.'); }
    finally { setBusy(false); }
  }

  if (!currentClassId) return <EmptyClass />;

  return <>
    <PageHeader title="Đánh giá 5 phẩm chất & 10 năng lực" description="Thang điểm 1–5; hệ thống tự cập nhật điểm trung bình của từng học sinh." />
    {error && <div className="alert danger">{error}</div>}
    <div className="assessment-summary-grid">
      <div className="card compact"><div className="metric-icon"><HeartHandshake size={24} /></div><div><strong>5 phẩm chất</strong><span>Yêu nước • Nhân ái • Chăm chỉ • Trung thực • Trách nhiệm</span></div></div>
      <div className="card compact"><div className="metric-icon"><Brain size={24} /></div><div><strong>10 năng lực</strong><span>3 năng lực chung + 7 năng lực đặc thù</span></div></div>
    </div>
    <div className="split-grid">
      <form className="card form-card" onSubmit={submit}>
        <div className="card-head"><div><h3>Phiếu đánh giá</h3><p>Chọn học sinh và tiêu chí cần đánh giá.</p></div></div>
        <label>Học sinh<select required value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">-- Chọn học sinh --</option>{students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select></label>
        <div className="segmented"><button type="button" className={category === 'quality' ? 'active' : ''} onClick={() => setCategory('quality')}>5 Phẩm chất</button><button type="button" className={category === 'competency' ? 'active' : ''} onClick={() => setCategory('competency')}>10 Năng lực</button></div>
        <label>Tiêu chí<select value={criterion} onChange={(e) => setCriterion(e.target.value)}>{criteria.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Điểm đánh giá<input type="number" min="1" max="5" step="0.1" value={score} onChange={(e) => setScore(Number(e.target.value))} /></label>
        <label>Nhận xét<textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Nhận xét cụ thể..." /></label>
        <button className="btn primary full" disabled={busy || !studentId}>{busy ? 'Đang lưu...' : 'Lưu đánh giá'}</button>
      </form>
      <section className="card">
        <div className="card-head"><div><h3>Đánh giá gần đây</h3><p>Lịch sử mới nhất trong lớp.</p></div></div>
        <div className="activity-list">{records.map((item) => <div className="activity-row" key={item.id}><div className="score-circle">{item.score}</div><div className="activity-main"><strong>{item.studentName}</strong><span>{item.criterion} • {item.category === 'quality' ? 'Phẩm chất' : 'Năng lực'}</span><small>{item.comment || 'Không có nhận xét'}</small></div></div>)}{records.length === 0 && <div className="empty-inline">Chưa có đánh giá.</div>}</div>
      </section>
    </div>
  </>;
}
