import { useEffect, useState, type FormEvent } from 'react';
import { MapPin } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { addWeeklyPlan, listWeeklyPlans } from '../services/weeklyPlanService';
import type { WeeklyPlan } from '../types';

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
function currentWeek() { const now = new Date(); const start = new Date(now.getFullYear(), 0, 1); return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7); }

export function WeeklyPlansPage() {
  const { currentClassId } = useClassRoom();
  const { profile } = useAuth();
  const [weekNumber, setWeekNumber] = useState(currentWeek());
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [day, setDay] = useState('Thứ 2');
  const [time, setTime] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() { if (currentClassId) setPlans(await listWeeklyPlans(currentClassId, weekNumber)); }
  useEffect(() => { void reload(); }, [currentClassId, weekNumber]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!currentClassId || !profile || !content.trim()) return;
    setBusy(true);
    try {
      await addWeeklyPlan({ classId: currentClassId, weekNumber, day, time, content: content.trim(), location, owner: profile.displayName, note: '', creatorUid: profile.uid, creatorName: profile.displayName });
      setContent(''); setTime(''); setLocation(''); await reload();
    } finally { setBusy(false); }
  }

  if (!currentClassId) return <EmptyClass />;
  return <>
    <PageHeader title="Kế hoạch tuần" description="Lập hoạt động theo ngày, thời gian và địa điểm." actions={<div className="week-control"><span>Tuần</span><input type="number" min="1" max="53" value={weekNumber} onChange={(e) => setWeekNumber(Number(e.target.value))} /></div>} />
    <div className="split-grid wide-left">
      <section className="card">
        <div className="card-head"><div><h3>Lịch tuần {weekNumber}</h3><p>{plans.length} hoạt động đã lưu.</p></div></div>
        <div className="week-board">{DAYS.map((d) => <div className="day-row" key={d}><div className="day-label">{d}</div><div className="day-items">{plans.filter((p) => p.day === d).map((p) => <div className="plan-item" key={p.id}><strong>{p.time || 'Cả ngày'}</strong><span>{p.content}</span>{p.location && <small className="inline-icon-text"><MapPin size={12} />{p.location}</small>}</div>)}{plans.filter((p) => p.day === d).length === 0 && <span className="muted">Chưa có hoạt động</span>}</div></div>)}</div>
      </section>
      <form className="card form-card" onSubmit={submit}>
        <div className="card-head"><div><h3>Thêm hoạt động</h3><p>Hoạt động mới của tuần {weekNumber}.</p></div></div>
        <label>Ngày<select value={day} onChange={(e) => setDay(e.target.value)}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></label>
        <label>Thời gian<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label>Nội dung<textarea required value={content} onChange={(e) => setContent(e.target.value)} /></label>
        <label>Địa điểm<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        <button className="btn primary full" disabled={busy}>{busy ? 'Đang lưu...' : 'Thêm vào kế hoạch'}</button>
      </form>
    </div>
  </>;
}
