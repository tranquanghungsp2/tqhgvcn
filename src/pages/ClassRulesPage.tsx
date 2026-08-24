import { useEffect, useState, type FormEvent } from 'react';
import { Heart, Plus, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { archiveClassRule, listClassRules, saveClassRule, seedDefaultClassRules } from '../services/classRuleService';
import type { ClassRule } from '../types';

export function ClassRulesPage() {
  const { currentClassId, currentClass } = useClassRoom();
  const { profile, can } = useAuth();
  const canEdit = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'assistant' || can('manageClassContent');
  const [rules, setRules] = useState<ClassRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🌿');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function reload() {
    if (currentClassId) setRules(await listClassRules(currentClassId));
  }
  useEffect(() => { void reload(); }, [currentClassId]);

  async function seed() {
    if (!currentClassId || !profile) return;
    setBusy(true); setMessage('');
    try { await seedDefaultClassRules(currentClassId, profile.uid, profile.displayName); await reload(); setMessage('Đã tạo 10 nội quy mẫu. Bạn có thể chỉnh sửa hoặc bổ sung tiếp.'); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!currentClassId || !profile || !title.trim() || !description.trim()) return;
    setBusy(true); setMessage('');
    try {
      await saveClassRule({ classId: currentClassId, order: rules.length + 1, title, description, icon, creatorUid: profile.uid, creatorName: profile.displayName });
      setTitle(''); setDescription(''); setIcon('🌿'); setShowForm(false); await reload();
    } finally { setBusy(false); }
  }

  if (!currentClassId) return <EmptyClass />;
  return <>
    <PageHeader title={`Nội quy ${currentClass?.name || 'lớp'}`} description="Đoàn kết – Yêu thương – Tôn trọng – Trách nhiệm – Tiến bộ mỗi ngày."
      actions={canEdit ? <div className="row-actions"><button className="btn ghost" disabled={busy || rules.length > 0} onClick={() => void seed()}><Sparkles size={16} />10 nội quy mẫu</button><button className="btn primary" onClick={() => setShowForm((v) => !v)}><Plus size={16} />Thêm nội quy</button></div> : undefined} />
    {message && <div className="alert info">{message}</div>}
    {showForm && canEdit && <form className="card form-card" onSubmit={submit}>
      <div className="form-grid cols-3"><label>Biểu tượng<input value={icon} onChange={(e) => setIcon(e.target.value)} /></label><label>Tiêu đề<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label><label className="span-2">Nội dung<textarea required value={description} onChange={(e) => setDescription(e.target.value)} /></label></div>
      <div className="row-actions end"><button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Hủy</button><button className="btn primary" disabled={busy}>Lưu nội quy</button></div>
    </form>}

    <section className="rules-poster">
      <div className="rules-banner"><ShieldCheck size={25} /><strong>10 ĐIỀU NỘI QUY {currentClass?.name?.toUpperCase() || 'LỚP'}</strong><Heart size={21} fill="currentColor" /></div>
      <div className="rules-grid">
        {rules.map((rule, index) => <article className="rule-card" key={rule.id}>
          <div className={`rule-number rule-color-${index % 5}`}>{String(index + 1).padStart(2, '0')}</div>
          <div className="rule-icon">{rule.icon || '🌿'}</div>
          <h3>{rule.title}</h3><p>{rule.description}</p>
          {canEdit && <button className="rule-delete" title="Ẩn nội quy" onClick={async () => { if (!confirm(`Ẩn nội quy “${rule.title}”?`)) return; await archiveClassRule(currentClassId, rule.id); await reload(); }}><Trash2 size={14} /></button>}
        </article>)}
        {rules.length === 0 && <div className="empty-inline span-all">Chưa có nội quy. Giáo viên có thể dùng bộ 10 nội quy mẫu để bắt đầu.</div>}
      </div>
      <div className="rules-bottom"><div><strong>🌳 Ý NGHĨA CỦA NỘI QUY</strong><p>Nội quy là nền tảng để mỗi thành viên rèn luyện bản thân, tôn trọng nhau và cùng xây dựng tập thể văn minh, hạnh phúc.</p></div><div><strong>🪶 LỜI CAM KẾT CỦA LỚP</strong><p>Chúng mình cùng cam kết thực hiện tốt nội quy để lớp luôn là một tập thể đoàn kết – yêu thương – tiến bộ mỗi ngày.</p></div></div>
    </section>
  </>;
}
