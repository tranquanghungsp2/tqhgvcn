import { Clock3, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function PendingPage() {
  const { profile, signOutUser } = useAuth();
  return (
    <div className="auth-page">
      <div className="pending-card">
        <div className="pending-icon"><Clock3 size={38} /></div>
        <h1>{profile?.isActive === false ? 'Tài khoản đang bị khóa' : 'Tài khoản đang chờ duyệt'}</h1>
        <p><strong>{profile?.email}</strong></p>
        <p>
          {profile?.isActive === false
            ? 'Vui lòng liên hệ quản trị viên để mở lại tài khoản.'
            : 'Admin đầu tiên: mở Supabase Dashboard → Table Editor → bảng profiles → dòng có UID này và đặt role="admin", is_approved=true. Các thành viên tiếp theo nên được mời trước trong màn Thành viên.'}
        </p>
        <div className="uid-box"><span>UID</span><code>{profile?.uid}</code></div>
        <div className="row-actions">
          <button className="btn ghost" onClick={() => window.location.reload()}><RefreshCw size={16} />Kiểm tra lại</button>
          <button className="btn primary" onClick={() => void signOutUser()}><LogOut size={16} />Đăng xuất</button>
        </div>
      </div>
    </div>
  );
}
