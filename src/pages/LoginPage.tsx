import { useState } from 'react';
import { GraduationCap, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { signIn, error } = useAuth();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  async function handleLogin() {
    setBusy(true);
    setLocalError('');
    try {
      await signIn();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-orb orb-one" />
      <div className="auth-orb orb-two" />
      <div className="login-card">
        <div className="login-logo"><GraduationCap size={38} strokeWidth={2} /></div>
        <div className="eyebrow">GDPT 2018</div>
        <h1>Quản lý lớp học</h1>
        <p>Điểm thi đua, 5 phẩm chất, 10 năng lực, sao khuyến khích và kế hoạch tuần trong một hệ thống.</p>
        {(localError || error) && <div className="alert danger">{localError || error}</div>}
        <button className="google-btn" onClick={() => void handleLogin()} disabled={busy}>
          <LogIn size={19} />
          {busy ? 'Đang đăng nhập...' : 'Đăng nhập bằng Google'}
        </button>
        <small>Tài khoản chưa được cấp quyền sẽ ở trạng thái chờ duyệt.</small>
      </div>
    </div>
  );
}
