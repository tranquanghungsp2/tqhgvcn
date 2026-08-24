import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Bell, Info, Plus, TrendingUp } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { addNotification, listNotifications } from '../services/notificationService';
import type { NotificationItem } from '../types';

export function NotificationsPage() {
  const { currentClassId } = useClassRoom();
  const { profile, can } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('Chung');
  const [priority, setPriority] = useState<NotificationItem['priority']>('normal');
  const [sendToParents, setSendToParents] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reload() {
    if (!currentClassId) return;
    setItems(await listNotifications(currentClassId));
  }

  useEffect(() => {
    void reload();
  }, [currentClassId, profile?.uid]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!currentClassId || !profile || !title.trim() || !content.trim()) return;
    setBusy(true);
    try {
      await addNotification({
        classId: currentClassId,
        title: title.trim(),
        content: content.trim(),
        type,
        priority,
        sendToParents,
        creatorUid: profile.uid,
        creatorName: profile.displayName,
      });
      setTitle('');
      setContent('');
      setSendToParents(false);
      setShowForm(false);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  if (!currentClassId) return <EmptyClass />;

  return (
    <>
      <PageHeader
        title="Thông báo lớp"
        description="Đăng thông báo theo mức ưu tiên và đánh dấu những nội dung cần chuyển tới phụ huynh."
        actions={can('manageNotifications') ? (
          <button className="btn primary" onClick={() => setShowForm((value) => !value)}>
            <Plus size={17} />Tạo thông báo
          </button>
        ) : undefined}
      />

      {showForm && (
        <form className="card form-card" onSubmit={submit}>
          <div className="form-grid cols-2">
            <label>Tiêu đề<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>Loại<select value={type} onChange={(event) => setType(event.target.value)}><option>Chung</option><option>Học tập</option><option>Hoạt động</option><option>Nhắc nhở</option></select></label>
            <label>Mức ưu tiên<select value={priority} onChange={(event) => setPriority(event.target.value as NotificationItem['priority'])}><option value="normal">Bình thường</option><option value="high">Quan trọng</option><option value="urgent">Khẩn</option></select></label>
            <label className="check-label"><input type="checkbox" checked={sendToParents} onChange={(event) => setSendToParents(event.target.checked)} /> Đánh dấu gửi phụ huynh</label>
          </div>
          <label>Nội dung<textarea required value={content} onChange={(event) => setContent(event.target.value)} /></label>
          <div className="row-actions end"><button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Hủy</button><button className="btn primary" disabled={busy}>{busy ? 'Đang đăng...' : 'Đăng thông báo'}</button></div>
        </form>
      )}

      <div className="notification-list">
        {items.map((item) => {
          const PriorityIcon = item.priority === 'urgent' ? AlertTriangle : item.priority === 'high' ? TrendingUp : Info;
          return (
            <article key={item.id} className={`notification-card priority-${item.priority}`}>
              <div className="notification-badge"><PriorityIcon size={20} /></div>
              <div>
                <div className="notification-title">
                  <h3>{item.title}</h3>
                  <span className={`pill ${item.priority === 'urgent' ? 'danger' : item.priority === 'high' ? 'warning' : 'teal'}`}>{item.type}</span>
                </div>
                <p>{item.content}</p>
                <div className="notification-footer-actions">
                  <small>{item.creatorName}{item.sendToParents ? ' • Cần thông tin tới phụ huynh' : ''}</small>
                </div>
              </div>
            </article>
          );
        })}
        {items.length === 0 && <div className="empty-state card"><div className="empty-icon"><Bell size={46} /></div><h3>Chưa có thông báo</h3><p>Các thông báo của lớp sẽ xuất hiện tại đây.</p></div>}
      </div>
    </>
  );
}
