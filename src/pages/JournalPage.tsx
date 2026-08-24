import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { todayISO } from '../services/dateUtils';
import { addJournalEntry, archiveJournalEntry, listJournalEntries } from '../services/journalService';
import type { JournalEntry, JournalMood } from '../types';

const MOODS: JournalMood[] = ['Tự hào', 'Vui', 'Đáng nhớ', 'Cần cố gắng'];
function moodEmoji(mood: JournalMood) { return mood === 'Tự hào' ? '🏆' : mood === 'Vui' ? '😊' : mood === 'Đáng nhớ' ? '📸' : '🌱'; }

export function JournalPage() {
  const { currentClassId } = useClassRoom();
  const { profile, can } = useAuth();
  const canEdit = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'assistant' || can('manageClassContent');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalMood>('Đáng nhớ');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function reload() { if (!currentClassId) return; setEntries(await listJournalEntries(currentClassId)); }
  useEffect(() => { void reload(); }, [currentClassId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!currentClassId || !profile) return;
    setBusy(true); setError('');
    try {
      await addJournalEntry({ classId: currentClassId, date, title, content, mood, tags: tags.split(',').map((item) => item.trim()).filter(Boolean), imageUrl, authorUid: profile.uid, authorName: profile.displayName });
      setTitle(''); setContent(''); setTags(''); setImageUrl(''); setShowForm(false); await reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu nhật ký.'); }
    finally { setBusy(false); }
  }

  if (!currentClassId) return <EmptyClass />;
  return <>
    <PageHeader title="Nhật ký lớp" description="Lưu những khoảnh khắc, câu chuyện và bài học đáng nhớ trong hành trình của tập thể." actions={canEdit ? <button className="btn primary" onClick={() => setShowForm((value) => !value)}><Plus size={16} />Viết nhật ký</button> : undefined} />
    {error && <div className="alert danger">{error}</div>}
    {showForm && canEdit && <form className="card form-card" onSubmit={submit}><div className="form-grid cols-3"><label>Ngày<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Chủ đề<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Cảm xúc<select value={mood} onChange={(event) => setMood(event.target.value as JournalMood)}>{MOODS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="span-3">Câu chuyện<textarea className="large" required value={content} onChange={(event) => setContent(event.target.value)} /></label><label>Thẻ<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="học tập, hoạt động, tiến bộ" /></label><label className="span-2">Ảnh minh họa URL<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label></div><div className="row-actions end"><button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Hủy</button><button className="btn primary" disabled={busy}>Lưu kỷ niệm</button></div></form>}

    <div className="journal-timeline">{entries.map((entry) => <article className="journal-entry" key={entry.id}>
      <div className="journal-date"><CalendarDays size={15} /><span>{entry.date}</span></div>
      <div className="journal-mood">{moodEmoji(entry.mood)}</div>
      <div className="journal-content">{entry.imageUrl && <img src={entry.imageUrl} alt="" />}<div><span className="pill success">{entry.mood}</span><h3>{entry.title}</h3><p>{entry.content}</p><div className="journal-tags">{entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><small>Ghi bởi {entry.authorName}</small></div></div>
      {canEdit && <button className="plain-icon danger-text" title="Lưu trữ" onClick={async () => { if (!confirm(`Lưu trữ nhật ký “${entry.title}”?`)) return; await archiveJournalEntry(currentClassId, entry.id); await reload(); }}><Trash2 size={14} /></button>}
    </article>)}{entries.length === 0 && <div className="empty-inline">Chưa có trang nhật ký nào.</div>}</div>
  </>;
}
