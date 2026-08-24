import { useEffect, useState } from 'react';
import { Crown, GraduationCap, Handshake, Palette, RotateCcw, ShieldCheck, Star, Trophy } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { STAR_TYPES } from '../services/constants';
import { awardStar, listRecentStarAwards, revokeStar } from '../services/starService';
import { listStudents } from '../services/studentService';
import type { StarAward, Student } from '../types';

const STAR_ICONS = { 'Học tập': GraduationCap, 'Kỷ luật': ShieldCheck, 'Thể thao': Trophy, 'Văn nghệ': Palette, 'Hoạt động': Handshake, 'Lãnh đạo': Crown } as const;
function getWeekNumber() { const now = new Date(); const start = new Date(now.getFullYear(), 0, 1); return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7); }

export function StarsPage() {
  const { currentClassId } = useClassRoom(); const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]); const [history, setHistory] = useState<StarAward[]>([]); const [studentId, setStudentId] = useState(''); const [starType, setStarType] = useState(STAR_TYPES[0].type); const [reason, setReason] = useState(''); const [weekNumber, setWeekNumber] = useState(getWeekNumber()); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function reload() { if (!currentClassId) return; const [s,h] = await Promise.all([listStudents(currentClassId), listRecentStarAwards(currentClassId)]); setStudents(s); setHistory(h); }
  useEffect(() => { void reload(); }, [currentClassId]);
  async function submit() { const student = students.find((item) => item.id === studentId); if (!currentClassId || !profile || !student || !reason.trim()) return; setBusy(true); setMessage(''); try { await awardStar({ classId: currentClassId, studentId, studentName: student.fullName, starType, reason: reason.trim(), weekNumber }); setReason(''); setMessage(`Đã tặng Sao ${starType} cho ${student.fullName}.`); await reload(); } catch (err) { setMessage(err instanceof Error ? err.message : 'Không thể tặng sao.'); } finally { setBusy(false); } }
  if (!currentClassId) return <EmptyClass />;
  return <><PageHeader title="Hệ thống tặng sao" description="Tặng sao bằng transaction và có thể thu hồi khi nhập nhầm; tổng sao của học sinh luôn được đồng bộ." />{message && <div className="alert info">{message}</div>}
    <section className="card form-card"><div className="form-grid cols-2"><label>Học sinh<select value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">-- Chọn học sinh --</option>{students.map((s) => <option key={s.id} value={s.id}>{s.fullName} • {s.totalStars} sao</option>)}</select></label><label>Tuần<input type="number" min="1" max="53" value={weekNumber} onChange={(e) => setWeekNumber(Number(e.target.value))} /></label></div><div className="star-grid">{STAR_TYPES.map((star) => { const Icon = STAR_ICONS[star.type as keyof typeof STAR_ICONS] || Star; return <button key={star.type} type="button" className={starType === star.type ? 'star-choice active' : 'star-choice'} onClick={() => setStarType(star.type)}><Icon size={27} /><strong>{star.type}</strong><span>{star.description}</span></button>; })}</div><label>Lý do tặng sao<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mô tả lý do tặng sao..." /></label><button className="btn primary full" disabled={busy || !studentId || !reason.trim()} onClick={() => void submit()}><Star size={17} />{busy ? 'Đang lưu...' : `Tặng Sao ${starType}`}</button></section>
    <section className="card score-history-card"><div className="card-head"><div><h3>Lịch sử tặng sao</h3><p>{history.length} bản ghi gần đây.</p></div></div><div className="activity-list">{history.map((item) => <div className={`activity-row ${item.status === 'cancelled' ? 'cancelled-row' : ''}`} key={item.id}><div className="score-circle"><Star size={15} fill="currentColor" /></div><div className="activity-main"><strong>{item.studentName}</strong><span>Sao {item.starType} • {item.reason}</span><small>Tuần {item.weekNumber} • {item.giverName}{item.status === 'cancelled' ? ' • Đã thu hồi' : ''}</small></div>{item.status === 'active' && <button className="icon-btn" onClick={async () => { if (!profile || !confirm(`Thu hồi Sao ${item.starType} của ${item.studentName}?`)) return; await revokeStar({ classId: currentClassId, award: item }); setMessage('Đã thu hồi sao và cập nhật lại tổng sao.'); await reload(); }}><RotateCcw size={14} />Thu hồi</button>}</div>)}{history.length === 0 && <div className="empty-inline">Chưa có lịch sử tặng sao.</div>}</div></section>
  </>;
}
