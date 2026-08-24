import { useEffect, useState, type FormEvent } from 'react';
import { Ban, CheckCircle2, Edit3, PlayCircle, Plus, School, X } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { useClassRoom } from '../context/ClassContext';
import { createClass, listAllClasses, updateClass } from '../services/classService';
import type { ClassRoom } from '../types';

type ClassForm = Pick<ClassRoom, 'name' | 'schoolYear' | 'grade' | 'homeroomTeacher' | 'motto' | 'slogan'>;

const emptyForm: ClassForm = {
  name: '',
  schoolYear: '2026-2027',
  grade: '',
  homeroomTeacher: '',
  motto: 'Đoàn kết – Yêu thương – Tôn trọng – Trách nhiệm – Tiến bộ mỗi ngày',
  slogan: 'Gia đình yêu thương • Nhà trường tin tưởng • Chúng em đoàn kết, cùng nhau trưởng thành.'
};

export function ClassesPage() {
  const { currentClassId, setCurrentClassId, reloadClasses } = useClassRoom();
  const [items, setItems] = useState<ClassRoom[]>([]);
  const [form, setForm] = useState<ClassForm>(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function reload() {
    try { setItems(await listAllClasses()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể tải danh sách lớp.'); }
  }

  useEffect(() => { void reload(); }, []);
  function resetForm() { setEditingId(''); setForm(emptyForm); }
  function editClass(item: ClassRoom) {
    setEditingId(item.id);
    setForm({ name: item.name, schoolYear: item.schoolYear, grade: item.grade || '', homeroomTeacher: item.homeroomTeacher || '', motto: item.motto || '', slogan: item.slogan || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try {
      if (editingId) { await updateClass(editingId, form); setMessage(`Đã cập nhật lớp ${form.name}.`); }
      else { const id = await createClass({ ...form, isActive: true }); setCurrentClassId(id); setMessage(`Đã tạo lớp ${form.name} và chọn làm lớp đang làm việc.`); }
      resetForm(); await Promise.all([reload(), reloadClasses()]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu lớp.'); }
    finally { setBusy(false); }
  }

  async function toggleActive(item: ClassRoom) {
    setError(''); setMessage('');
    try {
      await updateClass(item.id, { isActive: !item.isActive });
      if (item.id === currentClassId && item.isActive) setCurrentClassId('');
      setMessage(item.isActive ? `Đã ngừng hoạt động lớp ${item.name}.` : `Đã kích hoạt lại lớp ${item.name}.`);
      await Promise.all([reload(), reloadClasses()]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể đổi trạng thái lớp.'); }
  }

  return <>
    <PageHeader title="Quản lý lớp" description="Tạo, sửa, kích hoạt/ngừng lớp. Lớp đang hoạt động sẽ xuất hiện ở ô chọn lớp phía trên." />
    {message && <div className="alert info">{message}</div>}
    {error && <div className="alert danger">{error}</div>}
    <div className="split-grid">
      <form className="card form-card" onSubmit={submit}>
        <div className="card-head"><div><h3>{editingId ? 'Sửa thông tin lớp' : 'Tạo lớp mới'}</h3><p>Không cần tạo collection thủ công trong Firebase.</p></div></div>
        <label>Tên lớp<input required placeholder="Ví dụ: 6A1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Năm học<input required placeholder="2026-2027" value={form.schoolYear} onChange={(e) => setForm({ ...form, schoolYear: e.target.value })} /></label>
        <label>Khối<input placeholder="Ví dụ: 6" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></label>
        <label>Giáo viên chủ nhiệm<input value={form.homeroomTeacher} onChange={(e) => setForm({ ...form, homeroomTeacher: e.target.value })} /></label>
        <label>Khẩu hiệu lớp<input value={form.motto || ''} onChange={(e) => setForm({ ...form, motto: e.target.value })} /></label>
        <label>Thông điệp Trang chủ<textarea value={form.slogan || ''} onChange={(e) => setForm({ ...form, slogan: e.target.value })} /></label>
        <div className="row-actions end">
          {editingId && <button type="button" className="btn ghost" onClick={resetForm}><X size={16} />Hủy sửa</button>}
          <button className="btn primary" disabled={busy}>{!editingId && <Plus size={17} />}{busy ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo lớp'}</button>
        </div>
      </form>
      <section className="card">
        <div className="card-head"><div><h3>Danh sách lớp</h3><p>{items.length} lớp • {items.filter((x) => x.isActive).length} đang hoạt động.</p></div></div>
        <div className="class-list">
          {items.map((item) => <div className="class-row class-row-actions" key={item.id}>
            <div className="class-icon"><School size={21} /></div>
            <div className="class-main"><strong>{item.name}</strong><span>{item.schoolYear}{item.grade ? ` • Khối ${item.grade}` : ''}{item.homeroomTeacher ? ` • GVCN: ${item.homeroomTeacher}` : ''}</span><small>ID: {item.id}</small></div>
            <div className="class-actions">
              {item.isActive && <button className="icon-btn" onClick={() => setCurrentClassId(item.id)}>{item.id === currentClassId ? <CheckCircle2 size={15} /> : <PlayCircle size={15} />}{item.id === currentClassId ? 'Đang chọn' : 'Chọn lớp'}</button>}
              <button className="icon-btn" onClick={() => editClass(item)}><Edit3 size={15} />Sửa</button>
              <button className={item.isActive ? 'icon-btn danger-text' : 'icon-btn'} onClick={() => void toggleActive(item)}>{item.isActive ? <Ban size={15} /> : <PlayCircle size={15} />}{item.isActive ? 'Ngừng' : 'Kích hoạt'}</button>
              <span className={item.isActive ? 'pill success' : 'pill'}>{item.isActive ? 'Hoạt động' : 'Đã ngừng'}</span>
            </div>
          </div>)}
          {items.length === 0 && <div className="empty-inline">Chưa có lớp. Tạo lớp đầu tiên ở biểu mẫu bên trái.</div>}
        </div>
      </section>
    </div>
  </>;
}
