import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './context/AuthContext';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { AttendancePage } from './pages/AttendancePage';
import { AchievementsPage } from './pages/AchievementsPage';
import { ClassRulesPage } from './pages/ClassRulesPage';
import { ClassTreePage } from './pages/ClassTreePage';
import { ClubsPage } from './pages/ClubsPage';
import { ClassesPage } from './pages/ClassesPage';
import { DashboardPage } from './pages/DashboardPage';
import { GoodDeedsPage } from './pages/GoodDeedsPage';
import { LearningPage } from './pages/LearningPage';
import { JournalPage } from './pages/JournalPage';
import { LibraryPage } from './pages/LibraryPage';
import { LoginPage } from './pages/LoginPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ParentsPage } from './pages/ParentsPage';
import { PendingPage } from './pages/PendingPage';
import { ReportsPage } from './pages/ReportsPage';
import { ScoresPage } from './pages/ScoresPage';
import { SettingsPage } from './pages/SettingsPage';
import { StarsPage } from './pages/StarsPage';
import { StudentsPage } from './pages/StudentsPage';
import { TasksPage } from './pages/TasksPage';
import { UsersPage } from './pages/UsersPage';
import { WeeklyPlansPage } from './pages/WeeklyPlansPage';

function LoadingScreen() {
  return <div className="loading-screen"><div className="spinner" /><p>Đang tải hệ thống...</p></div>;
}

export default function App() {
  const { authUser, profile, loading, can } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!authUser) return <LoginPage />;
  if (!profile || !profile.isApproved || !profile.isActive) return <PendingPage />;

  const admin = profile.role === 'admin';
  const isOfficer = profile.role === 'student_officer';
  const classContentAccess = admin || profile.role === 'teacher' || profile.role === 'assistant' || can('manageClassContent');
  const canUseScores = can('manageScores') || can('submitScoreProposals');
  const canManageStudents = admin || can('manageStudents');

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="class-tree" element={<ClassTreePage />} />
        <Route path="class-rules" element={<ClassRulesPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="attendance" element={classContentAccess ? <AttendancePage /> : <Navigate to="/" replace />} />
        <Route path="learning" element={classContentAccess ? <LearningPage /> : <Navigate to="/" replace />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="good-deeds" element={<GoodDeedsPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="clubs" element={<ClubsPage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="reports" element={can('viewReports') ? <ReportsPage /> : <Navigate to="/" replace />} />

        <Route path="classes" element={admin ? <ClassesPage /> : <Navigate to="/" replace />} />
        <Route path="students" element={!isOfficer && canManageStudents ? <StudentsPage /> : <Navigate to="/class-tree" replace />} />
        <Route path="scores" element={canUseScores ? <ScoresPage /> : <Navigate to="/" replace />} />
        <Route path="assessments" element={can('manageAssessments') ? <AssessmentsPage /> : <Navigate to="/" replace />} />
        <Route path="stars" element={can('manageStars') ? <StarsPage /> : <Navigate to="/" replace />} />
        <Route path="weekly-plans" element={can('manageWeeklyPlans') ? <WeeklyPlansPage /> : <Navigate to="/tasks" replace />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="parents" element={can('contactParents') ? <ParentsPage /> : <Navigate to="/" replace />} />
        <Route path="users" element={admin ? <UsersPage /> : <Navigate to="/" replace />} />
        <Route path="settings" element={admin ? <SettingsPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
