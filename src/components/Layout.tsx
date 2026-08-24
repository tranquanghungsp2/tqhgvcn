import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Award,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardPenLine,
  GraduationCap,
  Handshake,
  Heart,
  HeartHandshake,
  Home,
  Library,
  LogOut,
  Mail,
  Medal,
  NotebookTabs,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TreePine,
  UserCog,
  Users,
  type LucideIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import type { PermissionKey, Role } from '../types';

type NavSection = 'overview' | 'daily' | 'growth' | 'community' | 'tools' | 'admin';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permission?: PermissionKey;
  anyPermission?: PermissionKey[];
  adminOnly?: boolean;
  classContentOnly?: boolean;
  hideForOfficer?: boolean;
  section: NavSection;
}

interface NavGroup {
  id: NavSection;
  label: string;
  icon: LucideIcon;
}

const NAV_GROUPS: NavGroup[] = [
  { id: 'overview', label: 'TỔNG QUAN', icon: Home },
  { id: 'daily', label: 'QUẢN LÝ HẰNG NGÀY', icon: CheckSquare },
  { id: 'growth', label: 'PHÁT TRIỂN LỚP', icon: Heart },
  { id: 'community', label: 'HỒ SƠ & KẾT NỐI', icon: Users },
  { id: 'tools', label: 'CÔNG CỤ GVCN', icon: Settings },
  { id: 'admin', label: 'QUẢN TRỊ', icon: ShieldCheck }
];

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Trang chủ', icon: Home, section: 'overview' },
  { to: '/class-tree', label: 'Cây lớp', icon: TreePine, section: 'overview' },
  { to: '/class-rules', label: 'Nội quy lớp', icon: ShieldCheck, section: 'overview' },

  { to: '/tasks', label: 'Nhiệm vụ - Kế hoạch', icon: CheckSquare, section: 'daily' },
  { to: '/attendance', label: 'Nề nếp - Chuyên cần', icon: CalendarCheck, classContentOnly: true, section: 'daily' },
  { to: '/learning', label: 'Học tập', icon: GraduationCap, classContentOnly: true, section: 'daily' },
  { to: '/activities', label: 'Hoạt động', icon: Sparkles, section: 'daily' },

  { to: '/good-deeds', label: 'Việc tốt mỗi ngày', icon: Heart, section: 'growth' },
  { to: '/achievements', label: 'Thành tích - Tiến bộ', icon: Medal, section: 'growth' },
  { to: '/clubs', label: 'CLB & Đội nhóm', icon: Handshake, section: 'growth' },
  { to: '/journal', label: 'Nhật ký lớp', icon: BookOpen, section: 'growth' },

  { to: '/students', label: 'Hồ sơ học sinh', icon: Users, permission: 'manageStudents', hideForOfficer: true, section: 'community' },
  { to: '/parents', label: 'Phụ huynh đồng hành', icon: HeartHandshake, permission: 'contactParents', section: 'community' },
  { to: '/library', label: 'Thư viện lớp', icon: Library, section: 'community' },
  { to: '/reports', label: 'Báo cáo - Thống kê', icon: NotebookTabs, permission: 'viewReports', section: 'community' },

  { to: '/scores', label: 'Điểm thi đua', icon: ClipboardPenLine, anyPermission: ['manageScores', 'submitScoreProposals'], section: 'tools' },
  { to: '/assessments', label: 'Đánh giá 5PC & 10NL', icon: Award, permission: 'manageAssessments', section: 'tools' },
  { to: '/stars', label: 'Tặng sao', icon: Star, permission: 'manageStars', section: 'tools' },
  { to: '/weekly-plans', label: 'Lịch tuần', icon: CalendarDays, permission: 'manageWeeklyPlans', section: 'tools' },
  { to: '/notifications', label: 'Thông báo', icon: Bell, section: 'tools' },

  { to: '/classes', label: 'Quản lý lớp', icon: School, adminOnly: true, section: 'admin' },
  { to: '/users', label: 'Thành viên', icon: UserCog, adminOnly: true, section: 'admin' },
  { to: '/settings', label: 'Cài đặt', icon: Settings, adminOnly: true, section: 'admin' }
];

function roleLabel(role?: Role) {
  if (role === 'admin') return 'Quản trị viên';
  if (role === 'teacher') return 'Giáo viên';
  if (role === 'assistant') return 'Trợ giảng';
  if (role === 'viewer') return 'Chỉ xem';
  if (role === 'student_officer') return 'Cán bộ lớp';
  return '';
}

function isPathActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

export function Layout() {
  const { profile, signOutUser, can } = useAuth();
  const { classes, currentClassId, currentClass, setCurrentClassId, loadingClasses, classError } = useClassRoom();
  const location = useLocation();
  const classContentAccess = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'assistant' || can('manageClassContent');

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return profile?.role === 'admin';
    if (item.hideForOfficer && profile?.role === 'student_officer') return false;
    if (item.classContentOnly && !classContentAccess) return false;
    if (item.anyPermission) return item.anyPermission.some((permission) => can(permission));
    if (!item.permission) return true;
    return can(item.permission);
  });

  const activeSection = NAV_GROUPS.find((group) =>
    visibleItems.some((item) => item.section === group.id && isPathActive(location.pathname, item.to))
  )?.id || 'overview';

  const [openSection, setOpenSection] = useState<NavSection | null>(activeSection);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('gvcn.sidebarCollapsed') === '1';
  });

  useEffect(() => {
    setOpenSection(activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('gvcn.sidebarCollapsed', sidebarCollapsed ? '1' : '0');
    }
  }, [sidebarCollapsed]);

  const renderGroup = (group: NavGroup) => {
    const items = visibleItems.filter((item) => item.section === group.id);
    if (!items.length) return null;
    const GroupIcon = group.icon;
    const isOpen = openSection === group.id;
    const hasActive = group.id === activeSection;

    return (
      <div className={`nav-section-block ${isOpen ? 'open' : 'closed'} ${hasActive ? 'has-active' : ''}`}>
        <button
          type="button"
          className="nav-section-toggle"
          onClick={() => setOpenSection((current) => current === group.id ? null : group.id)}
          title={sidebarCollapsed ? group.label : undefined}
          aria-expanded={isOpen}
        >
          <span className="nav-section-label-wrap">
            <GroupIcon size={15} strokeWidth={2.1} />
            <span className="nav-section-title">{group.label}</span>
          </span>
          <span className="nav-section-meta">
            <small>{items.length}</small>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>

        <div className="nav-section-items">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={item.label}
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <span className="nav-icon"><Icon size={18} strokeWidth={2.15} /></span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`app-shell class-garden-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar garden-sidebar">
        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={() => setSidebarCollapsed((value) => !value)}
          title={sidebarCollapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
          aria-label={sidebarCollapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>

        <div className="class-crest">
          <div className="crest-shield"><span>{currentClass?.name || 'LỚP'}</span><small>WE ARE ONE</small></div>
          <strong>{currentClass?.name ? `LỚP ${currentClass.name.replace(/^lớp\s*/i, '')}` : 'QUẢN LÝ LỚP'}</strong>
          <span>Năm học {currentClass?.schoolYear || '—'}</span>
        </div>

        <nav className="sidebar-nav" aria-label="Menu chính">
          {NAV_GROUPS.map(renderGroup)}
        </nav>

        <div className="garden-quote"><span>🌿 Mỗi chiếc lá là một nỗ lực nhỏ.</span><span>Cả khu vườn lớn mạnh nhờ chúng ta cùng nhau! ❤️</span></div>

        <div className="sidebar-footer">
          <div className="user-mini">
            {profile?.photoURL ? <img src={profile.photoURL} alt="" /> : <div className="avatar-fallback">GV</div>}
            <div className="user-mini-text">
              <strong>{profile?.displayName}</strong>
              <span>{roleLabel(profile?.role)}</span>
            </div>
          </div>
          <button className="btn sidebar-logout full" onClick={() => void signOutUser()} title="Đăng xuất">
            <LogOut size={17} /><span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar garden-topbar">
          <div className="topbar-title">
            <h1>{currentClass?.name || 'Lớp học'} – Cùng nhau gieo yêu thương, gặt thành công</h1>
            <p>{currentClass?.motto || 'Đoàn kết – Yêu thương – Tôn trọng – Trách nhiệm – Tiến bộ mỗi ngày'}</p>
          </div>
          <div className="topbar-actions">
            <NavLink className="top-icon-button" to="/notifications" title="Thông báo"><Bell size={20} /><span className="top-dot" /></NavLink>
            {can('contactParents') && <NavLink className="top-icon-button" to="/parents" title="Phụ huynh"><Mail size={20} /></NavLink>}
            <div className="class-picker compact-picker">
              <select value={currentClassId} onChange={(event) => setCurrentClassId(event.target.value)} disabled={loadingClasses || Boolean(classError)} title={classError || ''}>
                {classError && <option value="">Lỗi tải lớp</option>}
                {!classError && classes.length === 0 && <option value="">Chưa có lớp</option>}
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name} • {item.schoolYear}</option>)}
              </select>
            </div>
            <div className="top-user">
              {profile?.photoURL ? <img src={profile.photoURL} alt="" /> : <div className="top-avatar">GV</div>}
              <div><strong>{profile?.displayName}</strong><span>{roleLabel(profile?.role)}</span></div>
            </div>
          </div>
        </header>
        <main className="content garden-content"><Outlet /></main>
      </div>
    </div>
  );
}
