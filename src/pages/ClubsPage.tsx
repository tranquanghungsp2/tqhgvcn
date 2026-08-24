import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Plus, Trash2, Users } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { archiveClub, listClubs, saveClub } from '../services/clubService';
import { listStudentDirectory } from '../services/studentService';
import type { ClubItem, PublicStudent } from '../types';

export function ClubsPage() {
  const { currentClassId } = useClassRoom();
  const { profile, can } = useAuth();
  const canEdit = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'assistant' || can('manageClassContent');
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [students, setStudents] = useState<PublicStudent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<ClubItem['type']>('CLB');
  const [description, setDescription] = useState('');
  const [leader, setLeader] = useState('');
  const [meetingSchedule, setMeetingSchedule] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function reload() {
    if (!currentClassId) return;
    const [clubData, studentData] = await Promise.all([listClubs(currentClassId), listStudentDirectory(currentClassId)]);
    setClubs(clubData);
    setStudents(studentData);
  }
  useEffect(() => { void reload(); }, [currentClassId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!currentClassId || !profile || !name.trim()) return;
    setBusy(true);
    try {
      const selected = students.filter((student) => memberIds.includes(student.id));
      await saveClub({
        classId: currentClassId,
        name,
        type,
        description,
        leader,
        meetingSchedule,
        memberIds,
        memberNames: selected.map((student) => student.fullName),
        creatorUid: profile.uid,
        creatorName: profile.displayName
      });
      setName(''); setDescription(''); setLeader(''); setMeetingSchedule(''); setMemberIds([]); setShowForm(false);
      await reload();
    } finally { setBusy(false); }
  }

  if (!currentClassId) return <EmptyClass />;
  return <>
    <PageHeader title="CLB & Đội nhóm" description="Tổ chức các nhóm sở thích, đội nhiệm vụ và không gian để mỗi học sinh phát huy thế mạnh." actions={canEdit ? <button className="btn primary" onClick={() => setShowForm((value) => !value)}><Plus size={16} />Thêm CLB/đội</button> : undefined} />
    {showForm && canEdit && <form className="card form-card" onSubmit={submit}>
      <div className="form-grid cols-3">
        <label>Tên CLB/đội<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Loại<select value={type} onChange={(event) => setType(event.target.value as ClubItem['type'])}><option>CLB</option><option>Đội nhóm</option></select></label>
        <label>Trưởng nhóm<input value={leader} onChange={(event) => setLeader(event.target.value)} placeholder="Tên học sinh/giáo viên" /></label>
        <label>Lịch sinh hoạt<input value={meetingSchedule} onChange={(event) => setMeetingSchedule(event.target.value)} placeholder="Ví dụ: Thứ 5, 16:30" /></label>
        <label className="span-2">Thành viên<select multiple value={memberIds} onChange={(event) => setMemberIds(Array.from(event.target.selectedOptions as HTMLCollectionOf<HTMLOptionElement>).map((option) => option.value))}>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select><small>Giữ Ctrl/Cmd để chọn nhiều bạn.</small></label>
        <label className="span-3">Mô tả<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      </div>
      <div className="row-actions end"><button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Hủy</button><button className="btn primary" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu CLB/đội'}</button></div>
    </form>}

    <div className="club-grid">{clubs.map((club) => <article className="club-card" key={club.id}>
      <div className="club-icon">{club.type === 'CLB' ? '📚' : '🤝'}</div>
      <div className="club-body"><span className="pill teal">{club.type}</span><h3>{club.name}</h3><p>{club.description || 'Cùng nhau học hỏi, trải nghiệm và phát triển.'}</p><div className="club-meta"><span><Users size={14} />{club.memberNames.length} thành viên</span>{club.meetingSchedule && <span><CalendarDays size={14} />{club.meetingSchedule}</span>}</div>{club.leader && <small>Phụ trách: <b>{club.leader}</b></small>}<div className="club-members">{club.memberNames.slice(0, 8).map((member) => <span key={member}>{member.slice(0, 1)}</span>)}{club.memberNames.length > 8 && <em>+{club.memberNames.length - 8}</em>}</div></div>
      {canEdit && <button className="plain-icon danger-text" title="Lưu trữ" onClick={async () => { if (!confirm(`Lưu trữ “${club.name}”?`)) return; await archiveClub(currentClassId, club.id); await reload(); }}><Trash2 size={14} /></button>}
    </article>)}{clubs.length === 0 && <div className="empty-inline span-all">Chưa có CLB hoặc đội nhóm.</div>}</div>
  </>;
}
