import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, Heart, Medal, Sparkles, Star, TreePine, Users } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { listActivities } from '../services/activityService';
import { currentWeekNumber, formatDateVi, todayISO } from '../services/dateUtils';
import { listGoodDeeds } from '../services/goodDeedService';
import { listStudentDirectory, listStudents } from '../services/studentService';
import { listTasks } from '../services/taskService';
import { listWeeklyPlans } from '../services/weeklyPlanService';
import type { ActivityItem, GoodDeedRecord, PublicStudent, Student, TaskItem, WeeklyPlan } from '../types';

const QUALITIES = [
  { label: 'YÊU NƯỚC', icon: '❤️' },
  { label: 'NHÂN ÁI', icon: '🤝' },
  { label: 'CHĂM CHỈ', icon: '🌱' },
  { label: 'TRUNG THỰC', icon: '🛡️' },
  { label: 'TRÁCH NHIỆM', icon: '⚖️' }
];

export function DashboardPage() {
  const { currentClassId, currentClass } = useClassRoom();
  const { profile, can } = useAuth();
  const [students, setStudents] = useState<Array<Student | PublicStudent>>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [goodDeeds, setGoodDeeds] = useState<GoodDeedRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentClassId || !profile) return;
    setLoading(true);
    const canReadPrivateStudents = profile.role === 'admin' || ['manageStudents', 'manageScores', 'manageAssessments', 'manageStars', 'contactParents'].some((permission) => can(permission as Parameters<typeof can>[0]));
    const studentPromise = canReadPrivateStudents
      ? listStudents(currentClassId)
      : listStudentDirectory(currentClassId);
    Promise.all([
      studentPromise,
      listTasks(currentClassId),
      listActivities(currentClassId),
      listWeeklyPlans(currentClassId, currentWeekNumber()),
      listGoodDeeds(currentClassId, 100)
    ]).then(([studentData, taskData, activityData, planData, deedData]) => {
      setStudents(studentData);
      setTasks(taskData);
      setActivities(activityData);
      setPlans(planData);
      setGoodDeeds(deedData);
    }).finally(() => setLoading(false));
  }, [currentClassId, profile, can]);

  const topStudents = useMemo(() => [...students]
    .sort((a, b) => (Number(b.totalStars || 0) - Number(a.totalStars || 0)) || (Number(b.totalScore || 0) - Number(a.totalScore || 0)))
    .slice(0, 5), [students]);
  const activeTasks = tasks.filter((item) => item.status === 'doing' || item.status === 'upcoming').slice(0, 6);
  const highlightedActivities = activities.filter((item) => item.highlight || item.status === 'upcoming').slice(0, 4);
  const today = todayISO();
  const todayDeeds = goodDeeds.filter((item) => item.date === today).length;
  const avgProgress = tasks.length ? Math.round(tasks.reduce((sum, item) => sum + Number(item.progress || 0), 0) / tasks.length) : 0;
  const doneThisWeek = tasks.filter((item) => item.status === 'done').length;

  if (!currentClassId) return <EmptyClass />;

  return <div className="garden-dashboard">
    <section className="dashboard-welcome">
      <div>
        <span className="eyebrow garden-eyebrow">🌿 KHU VƯỜN {currentClass?.name || ''}</span>
        <h2>Cùng nhau gieo yêu thương – <em>Gặt thành công</em></h2>
        <p>{currentClass?.slogan || 'Gia đình yêu thương • Nhà trường tin tưởng • Chúng em đoàn kết, cùng nhau trưởng thành.'}</p>
      </div>
      <div className="welcome-metrics">
        <div><strong>{students.length}</strong><span>thành viên</span></div>
        <div><strong>{todayDeeds}</strong><span>việc tốt hôm nay</span></div>
        <div><strong>{avgProgress}%</strong><span>tiến trình chung</span></div>
      </div>
    </section>

    <div className="home-showcase-grid">
      <section className="soft-panel today-panel">
        <div className="garden-panel-title"><CheckCircle2 size={19} /> NHIỆM VỤ HÔM NAY</div>
        <div className="today-task-list">
          {activeTasks.map((task) => <Link to="/tasks" key={task.id} className="today-task-row">
            <span className={task.progress >= 100 ? 'task-check done' : 'task-check'}>{task.progress >= 100 ? '✓' : '○'}</span>
            <div><strong>{task.title}</strong><small>{task.category} • {task.dueDate ? `Hạn ${formatDateVi(task.dueDate)}` : 'Không đặt hạn'}</small></div>
            <b>{task.progress}%</b>
          </Link>)}
          {!loading && activeTasks.length === 0 && <div className="empty-soft">Chưa có nhiệm vụ đang thực hiện.</div>}
        </div>
        <Link className="soft-link" to="/tasks">Xem nhiệm vụ <ArrowRight size={14} /></Link>
      </section>

      <section className="class-tree-hero">
        <div className="tree-canopy">
          {QUALITIES.map((quality) => <div className="quality-orb" key={quality.label}><span>{quality.icon}</span><b>{quality.label}</b></div>)}
          <div className="tree-trunk-label"><strong>ĐOÀN KẾT</strong><strong>YÊU THƯƠNG</strong><strong>TIẾN BỘ MỖI NGÀY</strong><span>❤️</span></div>
        </div>
        <div className="tree-roots"><span>🌱 CHÚNG EM CHỦ ĐỘNG 🌱</span></div>
        <div className="tree-water left">💚<small>GIA ĐÌNH<br/>YÊU THƯƠNG</small></div>
        <div className="tree-water right">💙<small>NHÀ TRƯỜNG<br/>DẪN DẮT</small></div>
      </section>

      <section className="soft-panel activity-panel">
        <div className="garden-panel-title"><Sparkles size={19} /> HOẠT ĐỘNG NỔI BẬT</div>
        <div className="activity-mini-grid">
          {highlightedActivities.map((item) => <Link to="/activities" className="activity-mini-card" key={item.id}>
            <span>{item.category.includes('Thể') ? '⚽' : item.category.includes('CLB') ? '🏰' : item.category.includes('Đội') ? '🧑‍🤝‍🧑' : '🏆'}</span>
            <strong>{item.title}</strong><small>{formatDateVi(item.date)}</small>
          </Link>)}
          {!loading && highlightedActivities.length === 0 && <div className="empty-soft span-all">Chưa có hoạt động nổi bật.</div>}
        </div>
        <Link className="soft-link" to="/activities">Xem tất cả <ArrowRight size={14} /></Link>
      </section>
    </div>

    <div className="progress-home-row">
      <section className="soft-panel progress-card">
        <div className="progress-ring" style={{ '--progress': `${avgProgress * 3.6}deg` } as CSSProperties}><span>{avgProgress}%</span></div>
        <div><strong>TIẾN TRÌNH CỦA LỚP</strong><p>Cả lớp đang tiến bộ mỗi ngày.</p><div className="mini-progress"><span style={{ width: `${Math.min(100, avgProgress + 8)}%` }} /></div></div>
      </section>
      <section className="soft-panel recognition-card">
        <div className="garden-panel-title"><Medal size={19} /> VINH DANH TIẾN BỘ TUẦN NÀY</div>
        <div className="recognition-students">
          {topStudents.map((student) => <div key={student.id}><div className="student-round-avatar">{student.avatarURL ? <img src={student.avatarURL} alt="" /> : student.fullName.slice(0, 1)}</div><strong>{student.fullName}</strong><small><Star size={11} fill="currentColor" /> {student.totalStars} sao</small></div>)}
          {topStudents.length === 0 && <div className="empty-soft span-all">Chưa có dữ liệu xếp hạng.</div>}
        </div>
      </section>
      <section className="soft-panel schedule-card">
        <div className="garden-panel-title"><CalendarDays size={19} /> LỊCH SẮP TỚI</div>
        <div className="schedule-list">{plans.slice(0, 4).map((plan) => <div key={plan.id}><b>{plan.day}</b><span>{plan.time || 'Cả ngày'}</span><strong>{plan.content}</strong></div>)}{plans.length === 0 && <div className="empty-soft">Chưa có lịch tuần.</div>}</div>
        {can('manageWeeklyPlans') && <Link className="soft-link" to="/weekly-plans">Mở lịch tuần <ArrowRight size={14} /></Link>}
      </section>
    </div>

    <div className="home-shortcuts">
      <Link to="/class-tree"><TreePine /><span><strong>Cây lớp</strong><small>Hành trình trưởng thành</small></span></Link>
      <Link to="/good-deeds"><Heart /><span><strong>Việc tốt mỗi ngày</strong><small>Gieo những chiếc lá yêu thương</small></span></Link>
      <Link to="/achievements"><Star /><span><strong>Thành tích</strong><small>{doneThisWeek} nhiệm vụ đã hoàn thành</small></span></Link>
      {can('manageStudents') && <Link to="/students"><Users /><span><strong>Hồ sơ học sinh</strong><small>Thông tin và tiến bộ</small></span></Link>}
    </div>
  </div>;
}
