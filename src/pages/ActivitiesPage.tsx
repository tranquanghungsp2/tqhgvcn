import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, MapPin, Plus, Sparkles, Trash2 } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { cancelActivity, listActivities, saveActivity } from '../services/activityService';
import { formatDateVi, todayISO } from '../services/dateUtils';
import type { ActivityItem } from '../types';

export function ActivitiesPage() {
  const { currentClassId } = useClassRoom(); const { profile, can } = useAuth();
  const canEdit = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'assistant' || can('manageClassContent');
  const [items, setItems] = useState<ActivityItem[]>([]); const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState(''); const [category, setCategory] = useState('Hoạt động lớp'); const [date, setDate] = useState(todayISO()); const [description, setDescription] = useState(''); const [location, setLocation] = useState(''); const [highlight, setHighlight] = useState(true); const [busy, setBusy] = useState(false);
  async function reload() { if (currentClassId) setItems(await listActivities(currentClassId)); }
  useEffect(() => { void reload(); }, [currentClassId]);
  async function submit(e: FormEvent) { e.preventDefault(); if (!currentClassId || !profile || !title.trim()) return; setBusy(true); try { await saveActivity({ classId: currentClassId, title, category, date, description, location, status: date > todayISO() ? 'upcoming' : 'doing', highlight, creatorUid: profile.uid, creatorName: profile.displayName }); setTitle(''); setDescription(''); setLocation(''); setShowForm(false); await reload(); } finally { setBusy(false); } }
  if (!currentClassId) return <EmptyClass />;
  return <><PageHeader title="Hoạt động lớp" description="CLB, đội nhóm, trải nghiệm, thể thao, sự kiện và những khoảnh khắc đáng nhớ." actions={canEdit ? <button className="btn primary" onClick={() => setShowForm((v) => !v)}><Plus size={16} />Thêm hoạt động</button> : undefined} />
  {showForm && canEdit && <form className="card form-card" onSubmit={submit}><div className="form-grid cols-3"><label>Tên hoạt động<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>Nhóm<select value={category} onChange={(e) => setCategory(e.target.value)}><option>Hoạt động lớp</option><option>CLB</option><option>Đội nhóm</option><option>Thể thao</option><option>Trải nghiệm</option><option>Văn nghệ</option><option>Thi đua</option></select></label><label>Ngày<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Địa điểm<input value={location} onChange={(e) => setLocation(e.target.value)} /></label><label className="span-2">Mô tả<textarea value={description} onChange={(e) => setDescription(e.target.value)} /></label><label className="check-label"><input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} /> Hiển thị nổi bật ở Trang chủ</label></div><div className="row-actions end"><button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Hủy</button><button className="btn primary" disabled={busy}>Lưu hoạt động</button></div></form>}
  <div className="activity-feature-grid">{items.map((item) => <article className="event-card" key={item.id}><div className="event-visual">{item.category === 'Thể thao' ? '⚽' : item.category === 'CLB' ? '🏰' : item.category === 'Văn nghệ' ? '🎤' : item.category === 'Trải nghiệm' ? '🚌' : '🏆'}</div><div className="event-body"><div className="event-top"><span className="pill teal">{item.category}</span>{item.highlight && <span className="pill warning"><Sparkles size={11} />Nổi bật</span>}</div><h3>{item.title}</h3><p>{item.description || 'Hoạt động của tập thể lớp.'}</p><div className="event-meta"><span><CalendarDays size={14} />{formatDateVi(item.date)}</span>{item.location && <span><MapPin size={14} />{item.location}</span>}</div>{canEdit && <button className="icon-btn danger-text" onClick={async () => { if (!confirm(`Hủy hoạt động “${item.title}”?`)) return; await cancelActivity(currentClassId, item.id); await reload(); }}><Trash2 size={14} />Hủy</button>}</div></article>)}{items.length === 0 && <div className="empty-inline span-all">Chưa có hoạt động.</div>}</div></>;
}
