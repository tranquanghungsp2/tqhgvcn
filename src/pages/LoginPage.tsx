import { useState } from 'react';
import { GraduationCap, LogIn, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { signIn, signInAsStudent, error } = useAuth();
  const [mode, setMode] = useState<'teacher' | 'student'>('teacher');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

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

  async function handleStudentLogin() {
    if (!studentCode.trim() || !studentPassword) return;
    setBusy(true);
    setLocalError('');
    try {
      await signInAsStudent(studentCode.trim(), studentPassword);
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

        <div className="login-mode-switch">
          <button type="button" className={mode === 'teacher' ? 'active' : ''} onClick={() => { setMode('teacher'); setLocalError(''); }}>Giáo viên</button>
          <button type="button" className={mode === 'student' ? 'active' : ''} onClick={() => { setMode('student'); setLocalError(''); }}>Học sinh</button>
        </div>

        {(localError || error) && <div className="alert danger">{localError || error}</div>}

        {mode === 'teacher' ? (
          <>
            <button className="google-btn" onClick={() => void handleLogin()} disabled={busy}>
              <LogIn size={19} />
              {busy ? 'Đang đăng nhập...' : 'Đăng nhập bằng Google'}
            </button>
            <small>Tài khoản chưa được cấp quyền sẽ ở trạng thái chờ duyệt.</small>
          </>
        ) : (
          <form className="student-login-form" onSubmit={(e) => { e.preventDefault(); void handleStudentLogin(); }}>
            <label>Mã học sinh<input required value={studentCode} onChange={(e) => setStudentCode(e.target.value)} /></label>
            <label>Mật khẩu<input required type="password" value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} /></label>
            <button className="google-btn" type="submit" disabled={busy}>
              <UserRound size={19} />
              {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
            <small>Mã học sinh và mật khẩu do giáo viên chủ nhiệm cấp.</small>
          </form>
        )}
      </div>
    </div>
  );
}
