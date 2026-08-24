import { ArrowRight, Database, RefreshCw, School, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useClassRoom } from '../context/ClassContext';
import { useState } from 'react';
import { syncStudentDirectory } from '../services/studentService';
import { migrateAssessmentCurrent } from '../services/assessmentService';

export function SettingsPage() {
  const { currentClass } = useClassRoom();
  const [syncing, setSyncing] = useState(false);
  const [migratingAssessment, setMigratingAssessment] = useState(false);
  const [message, setMessage] = useState('');

  async function syncDirectory() {
    if (!currentClass) return;
    setSyncing(true);
    setMessage('');
    try {
      const count = await syncStudentDirectory(currentClass.id);
      setMessage(`Đã đồng bộ ${count} hồ sơ sang danh bạ công khai an toàn của ${currentClass.name}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không thể đồng bộ danh bạ học sinh.');
    } finally {
      setSyncing(false);
    }
  }


  async function migrateAssessment() {
    if (!currentClass) return;
    setMigratingAssessment(true);
    setMessage('');
    try {
      const result = await migrateAssessmentCurrent(currentClass.id);
      setMessage(`Đã chuẩn hóa 5PC/10NL: ${result.currentRecords} tiêu chí hiện hành, ${result.studentsUpdated} học sinh được tính lại.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không thể chuẩn hóa dữ liệu đánh giá.');
    } finally {
      setMigratingAssessment(false);
    }
  }

  return <>
    <PageHeader title="Cài đặt hệ thống" description="Bảo mật dữ liệu, đồng bộ danh bạ, quản lý lớp và điểm mở rộng tích hợp phụ huynh." />
    {message && <div className="alert info">{message}</div>}

    <div className="settings-grid">
      <section className="card settings-card">
        <div className="metric-icon"><School size={24} /></div>
        <div><strong>Nhận diện lớp học</strong><span>Tên lớp, năm học, GVCN, khẩu hiệu và thông điệp hiển thị trên trang chủ.</span></div>
        <Link className="btn primary" to="/classes">Quản lý lớp<ArrowRight size={16} /></Link>
      </section>

      <section className="card settings-card">
        <div className="metric-icon"><ShieldCheck size={24} /></div>
        <div><strong>Phân quyền an toàn</strong><span>Cán bộ lớp chỉ đọc danh bạ công khai; hồ sơ liên hệ học sinh và phụ huynh nằm ở vùng riêng.</span></div>
        <Link className="btn ghost" to="/users">Quản lý thành viên<ArrowRight size={16} /></Link>
      </section>

      <section className="card settings-card">
        <div className="metric-icon"><Database size={24} /></div>
        <div><strong>Đồng bộ danh bạ công khai</strong><span>Dùng một lần cho dữ liệu cũ để tạo studentDirectory không chứa email, SĐT, địa chỉ hay thông tin phụ huynh.</span></div>
        <button className="btn ghost" type="button" disabled={!currentClass || syncing} onClick={() => void syncDirectory()}><RefreshCw size={16} />{syncing ? 'Đang đồng bộ...' : `Đồng bộ ${currentClass?.name || 'lớp đang chọn'}`}</button>
      </section>

      <section className="card settings-card">
        <div className="metric-icon"><Sparkles size={24} /></div>
        <div><strong>Chuẩn hóa 5PC & 10NL cũ</strong><span>Lấy lần đánh giá mới nhất của từng tiêu chí, tạo trạng thái hiện hành và tính lại trung bình mà không xóa lịch sử.</span></div>
        <button className="btn ghost" type="button" disabled={!currentClass || migratingAssessment} onClick={() => void migrateAssessment()}><RefreshCw size={16} />{migratingAssessment ? 'Đang chuẩn hóa...' : 'Chuẩn hóa đánh giá'}</button>
      </section>

    </div>

    <section className="card architecture-card">
      <div className="card-head"><div><h3><Sparkles size={19} /> Kiến trúc dữ liệu đã tối ưu</h3><p>Các thay đổi chính giúp dùng lâu dài và tránh sai lệch dữ liệu.</p></div></div>
      <div className="architecture-list">
        <div><b>Học sinh</b><span>Lưu trữ mềm thay vì xóa cứng; lịch sử điểm/sao/đánh giá không bị mồ côi.</span></div>
        <div><b>Điểm & sao</b><span>Transaction cập nhật lịch sử và tổng đồng thời; có hoàn tác an toàn.</span></div>
        <div><b>5PC & 10NL</b><span>Mỗi tiêu chí có trạng thái hiện tại riêng; đánh giá lại thay thế điểm hiện hành nhưng vẫn giữ lịch sử.</span></div>
        <div><b>Quyền riêng tư</b><span>studentDirectory dành cho giao diện tập thể; students dành cho giáo viên có quyền.</span></div>
      </div>
    </section>
  </>;
}
