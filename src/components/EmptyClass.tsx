import { School } from 'lucide-react';

export function EmptyClass() {
  return (
    <div className="empty-state card">
      <div className="empty-icon"><School size={46} strokeWidth={1.8} /></div>
      <h3>Chưa chọn lớp</h3>
      <p>Admin hãy tạo/kích hoạt lớp trong Quản lý lớp. Giáo viên và cán bộ lớp cần được cấp ít nhất một lớp trong phần Thành viên.</p>
    </div>
  );
}
