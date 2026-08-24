import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Edit3, Plus, Power, PowerOff, Save, ShieldCheck, X } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { EMPTY_PERMISSIONS, OFFICER_PERMISSIONS, TEACHER_PERMISSIONS } from '../services/constants';
import { listStudents } from '../services/studentService';
import { disableInvitation, listInvitations, listUsers, saveInvitation, updateUserAccess } from '../services/userService';
import type { AppUser, Invitation, PermissionKey, Permissions, Role, Student } from '../types';

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manageStudents: 'Quản lý học sinh',
  manageScores: 'Chấm điểm trực tiếp',
  submitScoreProposals: 'Gửi đề nghị chấm điểm',
  manageAssessments: 'Đánh giá 5PC/10NL',
  manageStars: 'Tặng sao',
  manageWeeklyPlans: 'Kế hoạch tuần',
  manageClassContent: 'Nội dung lớp',
  manageNotifications: 'Quản lý thông báo',
  contactParents: 'Liên hệ phụ huynh',
  viewReports: 'Xem báo cáo',
  manageUsers: 'Quản lý thành viên',
  manageSettings: 'Cài đặt hệ thống'
};

function roleLabel(role: Role) {
  if (role === 'admin') return 'Admin';
  if (role === 'teacher') return 'Giáo viên';
  if (role === 'assistant') return 'Trợ giảng';
  if (role === 'student') return 'Học sinh';
  return 'Cán bộ lớp';
}

function defaultPermissions(role: Role): Permissions {
  if (role === 'teacher' || role === 'assistant') return { ...TEACHER_PERMISSIONS };
  if (role === 'student') return { ...EMPTY_PERMISSIONS, viewReports: true };
  if (role === 'student_officer') return { ...OFFICER_PERMISSIONS };
  return { ...TEACHER_PERMISSIONS };
}

function normalizePermissions(value?: Partial<Permissions>): Permissions {
  return { ...EMPTY_PERMISSIONS, ...(value || {}) };
}

interface AccessDraft {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  permissions: Permissions;
  classIds: string[];
  linkedStudentId: string;
  linkedStudentName: string;
  isApproved: boolean;
  isActive: boolean;
}

export function UsersPage() {
  const { profile } = useAuth();
  const { classes } = useClassRoom();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<Role>('teacher');
  const [permissions, setPermissions] = useState<Permissions>({ ...TEACHER_PERMISSIONS });
  const [classIds, setClassIds] = useState<string[]>([]);
  const [officerStudents, setOfficerStudents] = useState<Student[]>([]);
  const [linkedStudentId, setLinkedStudentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<AccessDraft | null>(null);
  const [editStudents, setEditStudents] = useState<Student[]>([]);

  async function reload() {
    const [u, i] = await Promise.all([listUsers(), listInvitations()]);
    setUsers(u);
    setInvitations(i);
  }

  useEffect(() => { void reload(); }, []);

  useEffect(() => {
    const classId = role === 'student_officer' ? classIds[0] : '';
    setLinkedStudentId('');
    if (!classId) {
      setOfficerStudents([]);
      return;
    }
    void listStudents(classId).then(setOfficerStudents).catch(() => setOfficerStudents([]));
  }, [role, classIds.join('|')]);

  useEffect(() => {
    const classId = editing?.role === 'student_officer' ? editing.classIds[0] : '';
    if (!classId) {
      setEditStudents([]);
      return;
    }
    void listStudents(classId).then(setEditStudents).catch(() => setEditStudents([]));
  }, [editing?.role, editing?.classIds.join('|')]);

  const pendingCount = useMemo(() => users.filter((item) => !item.isApproved).length, [users]);

  function togglePermission(key: PermissionKey) {
    if (role === 'student_officer') return;
    setPermissions((current) => ({ ...current, [key]: !current[key] }));
  }

  function toggleClass(id: string) {
    if (role === 'student_officer') {
      setClassIds([id]);
      return;
    }
    setClassIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  function changeRole(next: Role) {
    setRole(next);
    setClassIds([]);
    setLinkedStudentId('');
    setPermissions(defaultPermissions(next));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setMessage('');
    try {
      const linkedStudent = officerStudents.find((item) => item.id === linkedStudentId);
      await saveInvitation({
        email,
        displayName,
        role,
        permissions,
        classIds,
        linkedStudentId: role === 'student_officer' ? linkedStudent?.id : '',
        linkedStudentName: role === 'student_officer' ? linkedStudent?.fullName : '',
        createdBy: profile.uid
      });
      setMessage(`Đã cấp quyền trước cho ${email.trim().toLowerCase()}.`);
      setEmail('');
      setDisplayName('');
      setClassIds([]);
      setLinkedStudentId('');
      setRole('teacher');
      setPermissions({ ...TEACHER_PERMISSIONS });
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không thể tạo lời mời.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(user: AppUser) {
    setEditing({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      permissions: normalizePermissions(user.permissions),
      classIds: [...(user.classIds || [])],
      linkedStudentId: user.linkedStudentId || '',
      linkedStudentName: user.linkedStudentName || '',
      isApproved: user.isApproved,
      isActive: user.isActive
    });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function editRole(next: Role) {
    setEditing((current) => current ? {
      ...current,
      role: next,
      permissions: defaultPermissions(next),
      classIds: [],
      linkedStudentId: '',
      linkedStudentName: ''
    } : current);
  }

  function editToggleClass(id: string) {
    setEditing((current) => {
      if (!current) return current;
      if (current.role === 'student_officer') {
        return { ...current, classIds: [id], linkedStudentId: '', linkedStudentName: '' };
      }
      return {
        ...current,
        classIds: current.classIds.includes(id) ? current.classIds.filter((x) => x !== id) : [...current.classIds, id]
      };
    });
  }

  async function saveEditing() {
    if (!editing) return;
    if (editing.role === 'student_officer' && editing.classIds.length !== 1) {
      setMessage('Cán bộ lớp phải được gán đúng 1 lớp.');
      return;
    }
    if (editing.role === 'student_officer' && !editing.linkedStudentId) {
      setMessage('Hãy liên kết cán bộ lớp với đúng học sinh chủ tài khoản.');
      return;
    }

    const linkedStudent = editStudents.find((item) => item.id === editing.linkedStudentId);
    setBusy(true);
    setMessage('');
    try {
      await updateUserAccess(editing.uid, {
        role: editing.role,
        permissions: editing.role === 'student_officer' ? { ...OFFICER_PERMISSIONS } : editing.permissions,
        classIds: editing.classIds,
        linkedStudentId: editing.role === 'student_officer' ? editing.linkedStudentId : '',
        linkedStudentName: editing.role === 'student_officer' ? (linkedStudent?.fullName || editing.linkedStudentName) : '',
        isApproved: editing.isApproved,
        isActive: editing.isActive
      });
      setMessage(`Đã cập nhật quyền cho ${editing.displayName}.`);
      setEditing(null);
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không thể cập nhật quyền.');
    } finally {
      setBusy(false);
    }
  }

  async function quickApprove(user: AppUser) {
    setBusy(true);
    try {
      await updateUserAccess(user.uid, {
        isApproved: true,
        permissions: normalizePermissions(user.permissions)
      });
      setMessage(`Đã duyệt ${user.displayName}. Hãy kiểm tra lớp và quyền truy cập của tài khoản này.`);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  return <>
    <PageHeader title="Quản lý thành viên" description="Cấp Gmail, duyệt tài khoản, gán lớp và chỉnh quyền chi tiết. Cán bộ lớp chỉ dùng danh bạ công khai và gửi đề nghị điểm." />
    {message && <div className="alert info">{message}</div>}
    {pendingCount > 0 && <div className="alert warning"><ShieldCheck size={18} />Có <b>{pendingCount}</b> tài khoản đang chờ duyệt. Nên mở Chỉnh quyền để gán lớp trước khi duyệt.</div>}

    {editing && <section className="card form-card member-editor">
      <div className="card-head">
        <div><h3>Chỉnh quyền: {editing.displayName}</h3><p>{editing.email}</p></div>
        <button className="icon-btn" type="button" onClick={() => setEditing(null)}><X size={16} />Đóng</button>
      </div>
      <div className="form-grid cols-3">
        <label>Vai trò<select value={editing.role} onChange={(e) => editRole(e.target.value as Role)} disabled={editing.uid === profile?.uid}>
          <option value="admin">Admin</option>
          <option value="teacher">Giáo viên</option>
          <option value="assistant">Trợ giảng</option>
          <option value="student">Học sinh</option>
          <option value="student_officer">Cán bộ lớp</option>
        </select></label>
        <label>Phê duyệt<select value={editing.isApproved ? 'yes' : 'no'} onChange={(e) => setEditing((c) => c ? { ...c, isApproved: e.target.value === 'yes' } : c)} disabled={editing.uid === profile?.uid}>
          <option value="yes">Đã duyệt</option><option value="no">Chờ duyệt</option>
        </select></label>
        <label>Trạng thái<select value={editing.isActive ? 'active' : 'locked'} onChange={(e) => setEditing((c) => c ? { ...c, isActive: e.target.value === 'active' } : c)} disabled={editing.uid === profile?.uid}>
          <option value="active">Hoạt động</option><option value="locked">Đã khóa</option>
        </select></label>
      </div>

      <div className="permission-section">
        <h4>{editing.role === 'student_officer' ? 'Chọn đúng 1 lớp' : 'Lớp được truy cập'}</h4>
        <div className="check-grid">
          {classes.map((c) => <label className="check-card" key={c.id}>
            <input type={editing.role === 'student_officer' ? 'radio' : 'checkbox'} name={editing.role === 'student_officer' ? 'editOfficerClass' : undefined} checked={editing.classIds.includes(c.id)} onChange={() => editToggleClass(c.id)} />
            <span><strong>{c.name}</strong><small>{c.schoolYear}</small></span>
          </label>)}
        </div>
      </div>

      {editing.role === 'student_officer' && <div className="permission-section officer-link-box">
        <h4>Liên kết học sinh</h4>
        <select value={editing.linkedStudentId} onChange={(e) => {
          const student = editStudents.find((item) => item.id === e.target.value);
          setEditing((c) => c ? { ...c, linkedStudentId: e.target.value, linkedStudentName: student?.fullName || '' } : c);
        }} disabled={editing.classIds.length !== 1}>
          <option value="">-- Chọn học sinh là chủ tài khoản --</option>
          {editStudents.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
        </select>
      </div>}

      {editing.role !== 'student_officer' && editing.role !== 'admin' && <div className="permission-section">
        <div className="section-inline-head"><h4>Quyền chức năng</h4><button className="btn ghost small" type="button" onClick={() => setEditing((c) => c ? { ...c, permissions: defaultPermissions(c.role) } : c)}>Khôi phục mặc định</button></div>
        <div className="check-grid">{(Object.keys(PERMISSION_LABELS) as PermissionKey[]).map((key) => <label className="check-card" key={key}><input type="checkbox" checked={editing.permissions[key]} onChange={() => setEditing((c) => c ? { ...c, permissions: { ...c.permissions, [key]: !c.permissions[key] } } : c)} /><span><strong>{PERMISSION_LABELS[key]}</strong></span></label>)}</div>
      </div>}

      <button className="btn primary" type="button" disabled={busy} onClick={() => void saveEditing()}><Save size={17} />Lưu quyền truy cập</button>
    </section>}

    <form className="card form-card" onSubmit={submit}>
      <div className="card-head"><div><h3>Cấp quyền trước cho Gmail</h3><p>Người dùng đăng nhập Google đúng Gmail này sẽ nhận quyền đã cấu hình, không lưu mật khẩu.</p></div></div>
      <div className="form-grid cols-3">
        <label>Họ tên<input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
        <label>Gmail<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Vai trò<select value={role} onChange={(e) => changeRole(e.target.value as Role)}>
          <option value="teacher">Giáo viên</option>
          <option value="assistant">Trợ giảng</option>
          <option value="student">Học sinh</option>
          <option value="student_officer">Cán bộ lớp</option>
        </select></label>
      </div>

      <div className="permission-section">
        <h4>{role === 'student_officer' ? 'Chọn đúng 1 lớp cho cán bộ' : 'Lớp được truy cập'}</h4>
        <div className="check-grid">
          {classes.map((c) => <label className="check-card" key={c.id}>
            <input type={role === 'student_officer' ? 'radio' : 'checkbox'} name={role === 'student_officer' ? 'officerClass' : undefined} checked={classIds.includes(c.id)} onChange={() => toggleClass(c.id)} />
            <span><strong>{c.name}</strong><small>{c.schoolYear}</small></span>
          </label>)}
          {classes.length === 0 && <span className="muted">Hãy tạo lớp trước trong Quản lý lớp.</span>}
        </div>
      </div>

      {role === 'student_officer' && <div className="permission-section officer-link-box">
        <h4>Liên kết với học sinh</h4>
        <p className="muted">Dùng để ngăn cán bộ tự đề nghị chấm điểm cho chính mình.</p>
        <select required value={linkedStudentId} onChange={(e) => setLinkedStudentId(e.target.value)} disabled={classIds.length !== 1}>
          <option value="">-- Chọn học sinh là chủ tài khoản --</option>
          {officerStudents.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
        </select>
        <div className="alert info compact-alert">Cán bộ lớp chỉ đọc danh bạ công khai, không được đọc email/SĐT/địa chỉ/phụ huynh. Đề nghị điểm phải được giáo viên duyệt.</div>
      </div>}

      <div className="permission-section">
        <h4>Quyền chức năng</h4>
        {role === 'student_officer'
          ? <div className="check-grid"><div className="check-card"><span><strong className="inline-icon-text"><Check size={14} />Gửi đề nghị chấm điểm</strong><small>Không được chấm chính mình • tối đa 10 điểm/lần • giáo viên duyệt</small></span></div></div>
          : <div className="check-grid">{(Object.keys(PERMISSION_LABELS) as PermissionKey[]).map((key) => <label className="check-card" key={key}><input type="checkbox" checked={permissions[key]} onChange={() => togglePermission(key)} /><span><strong>{PERMISSION_LABELS[key]}</strong></span></label>)}</div>}
      </div>
      <button className="btn primary" disabled={busy}><Plus size={17} />{busy ? 'Đang lưu...' : 'Cấp quyền thành viên'}</button>
    </form>

    <div className="two-cards">
      <section className="card">
        <div className="card-head"><div><h3>Tài khoản đã đăng nhập</h3><p>{users.length} tài khoản Firebase.</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>Thành viên</th><th>Vai trò</th><th>Liên kết</th><th>Duyệt</th><th>Trạng thái</th><th></th></tr></thead><tbody>{users.map((u) => <tr key={u.uid}>
          <td><strong>{u.displayName}</strong><div className="subtle">{u.email}</div></td>
          <td><span className="pill teal">{roleLabel(u.role)}</span></td>
          <td>{u.role === 'student_officer' ? (u.linkedStudentName || 'Chưa liên kết') : `${u.classIds?.length || 0} lớp`}</td>
          <td>{u.isApproved ? <span className="inline-icon-text approve-text"><Check size={14} />Đã duyệt</span> : <button className="btn ghost small" disabled={busy} onClick={() => void quickApprove(u)}><Check size={14} />Duyệt</button>}</td>
          <td>{u.isActive ? 'Hoạt động' : 'Đã khóa'}</td>
          <td><div className="row-actions"><button className="icon-btn" onClick={() => startEdit(u)}><Edit3 size={15} />Chỉnh</button>{u.uid !== profile?.uid && <button className="icon-btn" disabled={busy} onClick={async () => { await updateUserAccess(u.uid, { isActive: !u.isActive }); await reload(); }}>{u.isActive ? <PowerOff size={15} /> : <Power size={15} />}{u.isActive ? 'Khóa' : 'Mở'}</button>}</div></td>
        </tr>)}</tbody></table></div>
      </section>
      <section className="card">
        <div className="card-head"><div><h3>Gmail đã cấp trước</h3><p>Danh sách lời mời / quyền chờ đăng nhập.</p></div></div>
        <div className="invite-list">{invitations.map((invite) => <div className="invite-row" key={invite.email}><div><strong>{invite.displayName || invite.email}</strong><span>{invite.email} • {roleLabel(invite.role)} • {invite.classIds.length} lớp{invite.linkedStudentName ? ` • ${invite.linkedStudentName}` : ''}</span></div><div><span className={invite.isActive ? 'pill success' : 'pill'}>{invite.isActive ? 'Đang hiệu lực' : 'Đã tắt'}</span>{invite.isActive && <button className="icon-btn danger-text" onClick={async () => { await disableInvitation(invite.email); await reload(); }}>Tắt</button>}</div></div>)}{invitations.length === 0 && <div className="empty-inline">Chưa có Gmail được cấp trước.</div>}</div>
      </section>
    </div>
  </>;
}
