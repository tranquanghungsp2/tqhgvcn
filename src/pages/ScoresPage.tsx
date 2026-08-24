import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import {
  addScore,
  cancelScore,
  listOwnScoreProposals,
  listPendingScoreProposals,
  listRecentScores,
  reviewScoreProposal,
  submitScoreProposal
} from '../services/scoreService';
import { listStudentDirectory, listStudents } from '../services/studentService';
import type { PublicStudent, ScoreProposal, ScoreRecord, ScoreType } from '../types';

function proposalStatusLabel(status: ScoreProposal['status']) {
  if (status === 'approved') return 'Đã duyệt';
  if (status === 'rejected') return 'Từ chối';
  return 'Chờ duyệt';
}

export function ScoresPage() {
  const { currentClassId } = useClassRoom();
  const { profile, can } = useAuth();
  const canDirectScore = can('manageScores');
  const canPropose = can('submitScoreProposals');

  const [students, setStudents] = useState<PublicStudent[]>([]);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [proposals, setProposals] = useState<ScoreProposal[]>([]);
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState<ScoreType>('Điểm cộng');
  const [value, setValue] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const eligibleStudents = useMemo(() => {
    if (!canPropose || canDirectScore) return students;
    return students.filter((student) => student.id !== profile?.linkedStudentId);
  }, [students, canPropose, canDirectScore, profile?.linkedStudentId]);

  async function reload() {
    if (!currentClassId || !profile) return;
    const studentData = canDirectScore ? await listStudents(currentClassId) : await listStudentDirectory(currentClassId);
    setStudents(studentData);

    if (canDirectScore) {
      const [scoreData, pendingData] = await Promise.all([
        listRecentScores(currentClassId),
        listPendingScoreProposals(currentClassId)
      ]);
      setScores(scoreData);
      setProposals(pendingData);
    } else if (canPropose) {
      setScores([]);
      setProposals(await listOwnScoreProposals(currentClassId, profile.uid));
    }
  }

  useEffect(() => {
    void reload().catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu điểm.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClassId, profile?.uid, canDirectScore, canPropose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const student = eligibleStudents.find((item) => item.id === studentId);
    if (!student || !profile || !currentClassId) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (canDirectScore) {
        await addScore({
          classId: currentClassId,
          studentId,
          studentName: student.fullName,
          type,
          value,
          note
        });
        setMessage('Đã lưu điểm thi đua.');
      } else if (canPropose) {
        await submitScoreProposal({
          classId: currentClassId,
          studentId,
          studentName: student.fullName,
          type,
          value,
          note
        });
        setMessage('Đã gửi đề nghị. Giáo viên sẽ duyệt trước khi điểm thay đổi.');
      }
      setStudentId(''); setNote(''); setValue(1);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu điểm.');
    } finally { setBusy(false); }
  }

  async function review(item: ScoreProposal, action: 'approved' | 'rejected') {
    if (!profile || !currentClassId) return;
    const verb = action === 'approved' ? 'duyệt' : 'từ chối';
    if (!confirm(`Xác nhận ${verb} đề nghị ${item.type} ${item.value} điểm cho ${item.studentName}?`)) return;
    setError(''); setMessage('');
    try {
      await reviewScoreProposal({
        classId: currentClassId,
        proposal: item,
        action
      });
      setMessage(action === 'approved' ? 'Đã duyệt và cập nhật điểm học sinh.' : 'Đã từ chối đề nghị.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xử lý đề nghị.');
    }
  }

  if (!currentClassId) return <EmptyClass />;

  const officerMode = canPropose && !canDirectScore;

  return <>
    <PageHeader
      title={officerMode ? 'Đề nghị chấm điểm lớp' : 'Chấm điểm thi đua'}
      description={officerMode
        ? 'Cán bộ lớp gửi đề nghị; không được tự chấm cho chính mình. Giáo viên/Admin duyệt trước khi điểm thay đổi.'
        : 'Học sinh bắt đầu từ 100 điểm; Điểm cộng/Khắc phục cộng, Điểm trừ/Vi phạm trừ. Đề nghị của cán bộ lớp được duyệt tại đây.'}
    />
    {message && <div className="alert info">{message}</div>}
    {error && <div className="alert danger">{error}</div>}

    <div className="split-grid">
      <form className="card form-card" onSubmit={submit}>
        <div className="card-head"><div><h3>{officerMode ? 'Gửi đề nghị' : 'Thêm điểm trực tiếp'}</h3><p>{officerMode ? 'Mỗi lần tối đa 10 điểm và phải ghi rõ lý do.' : 'Ghi rõ lý do để dễ tra cứu lịch sử.'}</p></div></div>
        {officerMode && profile?.linkedStudentName && <div className="alert info compact-alert">Tài khoản cán bộ đang liên kết với học sinh: <b>{profile.linkedStudentName}</b>.</div>}
        <label>Học sinh<select required value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">-- Chọn học sinh --</option>{eligibleStudents.map((s) => <option key={s.id} value={s.id}>{s.fullName} • {s.totalScore} điểm</option>)}</select></label>
        <label>Loại điểm<select value={type} onChange={(e) => setType(e.target.value as ScoreType)}><option>Điểm cộng</option><option>Điểm trừ</option><option>Khắc phục</option><option>Vi phạm</option></select></label>
        <label>Số điểm<input type="number" min="1" max={officerMode ? 10 : undefined} step="1" value={value} onChange={(e) => setValue(Number(e.target.value))} /></label>
        <label>Ghi chú<textarea required={officerMode} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: Không trực nhật đúng phân công..." /></label>
        <button className="btn primary full" disabled={busy || !studentId}>{busy ? 'Đang lưu...' : officerMode ? 'Gửi giáo viên duyệt' : 'Lưu điểm thi đua'}</button>
      </form>

      <section className="card">
        <div className="card-head"><div><h3>{officerMode ? 'Đề nghị của tôi' : 'Đề nghị cán bộ lớp chờ duyệt'}</h3><p>{proposals.length} bản ghi.</p></div></div>
        <div className="activity-list">
          {proposals.map((item) => <div className="activity-row proposal-row" key={item.id}>
            <div className={item.type === 'Điểm cộng' || item.type === 'Khắc phục' ? 'delta plus' : 'delta minus'}>{item.type === 'Điểm cộng' || item.type === 'Khắc phục' ? '+' : '-'}{item.value}</div>
            <div className="activity-main"><strong>{item.studentName}</strong><span>{item.type} • {item.note || 'Không ghi chú'}</span><small>Đề nghị bởi {item.proposerName}</small></div>
            {officerMode ? <span className={item.status === 'approved' ? 'pill success' : item.status === 'rejected' ? 'pill danger' : 'pill warning'}>{proposalStatusLabel(item.status)}</span> :
              <div className="proposal-actions"><button className="icon-btn approve-text" onClick={() => void review(item, 'approved')}><Check size={15} />Duyệt</button><button className="icon-btn danger-text" onClick={() => void review(item, 'rejected')}><X size={15} />Từ chối</button></div>}
          </div>)}
          {proposals.length === 0 && <div className="empty-inline">{officerMode ? 'Bạn chưa gửi đề nghị nào.' : 'Không có đề nghị nào đang chờ.'}</div>}
        </div>
      </section>
    </div>

    {canDirectScore && <section className="card score-history-card">
      <div className="card-head"><div><h3>Lịch sử điểm gần đây</h3><p>{scores.length} bản ghi mới nhất.</p></div></div>
      <div className="activity-list">{scores.map((item) => <div className={`activity-row ${item.status === 'cancelled' ? 'cancelled-row' : ''}`} key={item.id}><div className={item.delta >= 0 ? 'delta plus' : 'delta minus'}>{item.delta >= 0 ? '+' : ''}{item.delta}</div><div className="activity-main"><strong>{item.studentName}</strong><span>{item.type} • {item.note || 'Không ghi chú'}</span>{item.source === 'officer_proposal' && <small className="inline-icon-text"><CheckCircle2 size={13} />Từ đề nghị cán bộ lớp</small>}{item.status === 'cancelled' && <small>Đã hoàn tác</small>}</div><small>{item.assessorName}</small>{item.status === 'active' && <button className="icon-btn" onClick={async () => { if (!profile || !currentClassId || !confirm(`Hoàn tác ${item.delta >= 0 ? '+' : ''}${item.delta} điểm của ${item.studentName}?`)) return; await cancelScore({ classId: currentClassId, score: item }); setMessage('Đã hoàn tác bản ghi điểm.'); await reload(); }}><RotateCcw size={14} />Hoàn tác</button>}</div>)}{scores.length === 0 && <div className="empty-inline">Chưa có lịch sử điểm.</div>}</div>
    </section>}
  </>;
}
