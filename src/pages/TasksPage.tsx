import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Plus, Trash2, Users } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { formatDateVi, todayISO } from '../services/dateUtils';
import { listStudentDirectory } from '../services/studentService';
import { cancelTask, listTasks, saveTask, updateTaskProgress } from '../services/taskService';
import type { PublicStudent, TaskCategory, TaskItem, TaskStatus } from '../types';

const CATEGORIES: TaskCategory[] = ['Học tập', 'Hoạt động', 'Việc tốt', 'Nề nếp', 'Dự án', 'CLB - Đội nhóm', 'Kỹ năng sống', 'Thể chất'];

function statusLabel(status: TaskStatus) {
  if (status === 'done') return 'Đã hoàn thành';
  if (status === 'upcoming') return 'Sắp diễn ra';
  return 'Đang thực hiện';
}

export function TasksPage() {
  const { currentClassId } = useClassRoom();
  const { profile, can } = useAuth();
  const canEdit = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'assistant' || can('manageClassContent');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [students, setStudents] = useState<PublicStudent[]>([]);
  const [filter, setFilter] = useState<'doing' | 'upcoming' | 'done'>('doing');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Học tập'); const [dueDate, setDueDate] = useState(todayISO());
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]); const [busy, setBusy] = useState(false);

  async function reload() {
    if (!currentClassId) return;
    const [taskData, studentData] = await Promise.all([listTasks(currentClassId), listStudentDirectory(currentClassId)]);
    setTasks(taskData); setStudents(studentData);
  }
  useEffect(() => { void reload(); }, [currentClassId]);

  const visible = useMemo(() => tasks.filter((task) => task.status === filter), [tasks, filter]);
  const completed = tasks.filter((task) => task.status === 'done').length;
  const avgProgress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!currentClassId || !profile || !title.trim()) return;
    setBusy(true);
    try {
      const names = students.filter((s) => assigneeIds.includes(s.id)).map((s) => s.fullName);
      await saveTask({ classId: currentClassId, title: title.trim(), description: description.trim(), category, progress: 0, status: 'doing', dueDate, assigneeIds, assigneeNames: names, owner: profile.displayName, creatorUid: profile.uid, creatorName: profile.displayName });
      setTitle(''); setDescription(''); setAssigneeIds([]); setShowForm(false); await reload();
    } finally { setBusy(false); }
  }

  if (!currentClassId) return <EmptyClass />;
  return <>
    <PageHeader title="Nhiệm vụ - Kế hoạch" description="Chủ động hôm nay – Thành công ngày mai. Theo dõi nhiệm vụ, tiến độ và thành viên cùng thực hiện."
      actions={canEdit ? <button className="btn primary" onClick={() => setShowForm((v) => !v)}><Plus size={17} />Thêm nhiệm vụ</button> : undefined} />
    <div className="task-summary-bar"><div><CheckCircle2 /><strong>{completed}</strong><span>Đã hoàn thành</span></div><div><Clock3 /><strong>{tasks.filter((t) => t.status === 'doing').length}</strong><span>Đang thực hiện</span></div><div><CalendarDays /><strong>{tasks.filter((t) => t.status === 'upcoming').length}</strong><span>Sắp diễn ra</span></div><div><strong>{avgProgress}%</strong><span>Tỷ lệ hoàn thành chung</span></div></div>

    {showForm && canEdit && <form className="card form-card" onSubmit={submit}>
      <div className="form-grid cols-3"><label>Tên nhiệm vụ<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>Nhóm<select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label>Hạn hoàn thành<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label><label className="span-2">Mô tả<textarea value={description} onChange={(e) => setDescription(e.target.value)} /></label><label>Phân công<select multiple value={assigneeIds} onChange={(e) => setAssigneeIds(Array.from(e.target.selectedOptions as HTMLCollectionOf<HTMLOptionElement>).map((option) => option.value))}>{students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select><small>Giữ Ctrl/Cmd để chọn nhiều bạn.</small></label></div>
      <div className="row-actions end"><button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Hủy</button><button className="btn primary" disabled={busy}>Lưu nhiệm vụ</button></div>
    </form>}

    <div className="task-tabs"><button className={filter === 'doing' ? 'active' : ''} onClick={() => setFilter('doing')}>🌱 Đang thực hiện</button><button className={filter === 'upcoming' ? 'active' : ''} onClick={() => setFilter('upcoming')}>📅 Sắp diễn ra</button><button className={filter === 'done' ? 'active' : ''} onClick={() => setFilter('done')}>☑ Đã hoàn thành</button></div>
    <div className="task-card-grid">
      {visible.map((task) => <article className={`mission-card mission-${task.category.replaceAll(' ', '-').toLowerCase()}`} key={task.id}>
        <div className="mission-top"><span className="mission-category">{task.category}</span>{canEdit && <button className="plain-icon" onClick={async () => { if (!confirm(`Hủy nhiệm vụ “${task.title}”?`)) return; await cancelTask(currentClassId, task.id); await reload(); }}><Trash2 size={15} /></button>}</div>
        <h3>{task.title}</h3><p>{task.description || 'Không có mô tả.'}</p>
        <div className="mission-progress-label"><span>Tiến độ</span><strong>{task.progress}%</strong></div><div className="mission-progress"><span style={{ width: `${task.progress}%` }} /></div>
        {canEdit && <input className="progress-range" type="range" min="0" max="100" step="5" value={task.progress} onChange={async (e) => { await updateTaskProgress(currentClassId, task.id, Number(e.target.value)); await reload(); }} />}
        <div className="mission-meta"><span><CalendarDays size={13} />{formatDateVi(task.dueDate)}</span><span><Users size={13} />{task.assigneeNames.length ? `${task.assigneeNames.slice(0, 3).join(', ')}${task.assigneeNames.length > 3 ? ` +${task.assigneeNames.length - 3}` : ''}` : 'Cả lớp'}</span></div>
        <span className={`pill ${task.status === 'done' ? 'success' : task.status === 'upcoming' ? 'warning' : 'teal'}`}>{statusLabel(task.status)}</span>
      </article>)}
      {visible.length === 0 && <div className="empty-inline span-all">Chưa có nhiệm vụ trong nhóm này.</div>}
    </div>
  </>;
}
