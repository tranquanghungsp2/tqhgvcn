
export type Role = 'admin' | 'teacher' | 'assistant' | 'viewer' | 'student_officer';

export type PermissionKey =
  | 'manageStudents'
  | 'manageScores'
  | 'submitScoreProposals'
  | 'manageAssessments'
  | 'manageStars'
  | 'manageWeeklyPlans'
  | 'manageClassContent'
  | 'manageNotifications'
  | 'contactParents'
  | 'viewReports'
  | 'manageUsers'
  | 'manageSettings';

export type Permissions = Record<PermissionKey, boolean>;

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  isApproved: boolean;
  isActive: boolean;
  permissions: Permissions;
  classIds: string[];
  linkedStudentId?: string;
  linkedStudentName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invitation {
  email: string;
  displayName: string;
  role: Role;
  permissions: Permissions;
  classIds: string[];
  linkedStudentId?: string;
  linkedStudentName?: string;
  isActive: boolean;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  schoolYear: string;
  grade?: string;
  homeroomTeacher?: string;
  motto?: string;
  slogan?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  studentCode?: string;
  fullName: string;
  birthDate?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác' | '';
  email?: string;
  phone?: string;
  address?: string;
  avatarURL?: string;
  groupName?: string;
  totalScore: number;
  status: string;
  note?: string;
  totalStars: number;
  qualityAvg: number;
  competencyAvg: number;
  qualityScoreSum?: number;
  qualityScoreCount?: number;
  competencyScoreSum?: number;
  competencyScoreCount?: number;
  parentEmail?: string;
  parentPhone?: string;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicStudent {
  id: string;
  studentCode?: string;
  fullName: string;
  avatarURL?: string;
  groupName?: string;
  totalScore: number;
  totalStars: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StudentCreateInput = Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>;

export type ScoreType = 'Điểm cộng' | 'Điểm trừ' | 'Khắc phục' | 'Vi phạm';

export interface ScoreRecord {
  id: string;
  studentId: string;
  studentName: string;
  type: ScoreType;
  value: number;
  delta: number;
  note?: string;
  assessorUid: string;
  assessorName: string;
  source?: 'teacher' | 'officer_proposal';
  proposalId?: string;
  status: 'active' | 'cancelled';
  cancelledByUid?: string;
  cancelledByName?: string;
  cancelledAt?: string;
  createdAt?: string;
}

export interface ScoreProposal {
  id: string;
  studentId: string;
  studentName: string;
  type: ScoreType;
  value: number;
  note?: string;
  proposerUid: string;
  proposerName: string;
  proposerStudentId?: string;
  proposerStudentName?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedByUid?: string;
  reviewedByName?: string;
  reviewNote?: string;
  createdAt?: string;
  reviewedAt?: string;
}

export type AssessmentCategory = 'quality' | 'competency';

export interface AssessmentRecord {
  id: string;
  studentId: string;
  studentName: string;
  category: AssessmentCategory;
  criterion: string;
  score: number;
  comment?: string;
  assessorUid: string;
  assessorName: string;
  status: 'active' | 'cancelled';
  createdAt?: string;
}

export interface AssessmentCurrent extends AssessmentRecord {
  historyId?: string;
  updatedAt?: string;
}

export interface StarAward {
  id: string;
  studentId: string;
  studentName: string;
  starType: string;
  reason: string;
  giverUid: string;
  giverName: string;
  weekNumber: number;
  status: 'active' | 'cancelled';
  cancelledByUid?: string;
  cancelledByName?: string;
  cancelledAt?: string;
  createdAt?: string;
}

export interface WeeklyPlan {
  id: string;
  weekNumber: number;
  day: string;
  content: string;
  time?: string;
  location?: string;
  owner?: string;
  note?: string;
  status: 'active' | 'cancelled';
  creatorUid: string;
  creatorName: string;
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: 'normal' | 'high' | 'urgent';
  sendToParents: boolean;
  status: 'active' | 'cancelled';
  creatorUid: string;
  creatorName: string;
  createdAt?: string;
}

export type TaskStatus = 'doing' | 'upcoming' | 'done' | 'cancelled';
export type TaskCategory = 'Học tập' | 'Hoạt động' | 'Việc tốt' | 'Nề nếp' | 'Dự án' | 'CLB - Đội nhóm' | 'Kỹ năng sống' | 'Thể chất';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  progress: number;
  status: TaskStatus;
  dueDate?: string;
  assigneeIds: string[];
  assigneeNames: string[];
  owner?: string;
  creatorUid: string;
  creatorName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassRule {
  id: string;
  order: number;
  title: string;
  description: string;
  icon?: string;
  isActive: boolean;
  creatorUid: string;
  creatorName: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';
export interface AttendanceRecord {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  note?: string;
  recorderUid: string;
  recorderName: string;
  createdAt?: string;
  updatedAt?: string;
}

export type LearningRecordType = 'Kiểm tra' | 'Bài tập' | 'Phát biểu' | 'Tiến bộ' | 'Cần cố gắng';
export interface LearningRecord {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  type: LearningRecordType;
  score?: number;
  note?: string;
  date: string;
  creatorUid: string;
  creatorName: string;
  status: 'active' | 'cancelled';
  createdAt?: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  category: string;
  date: string;
  description?: string;
  location?: string;
  status: 'upcoming' | 'doing' | 'done' | 'cancelled';
  highlight: boolean;
  creatorUid: string;
  creatorName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoodDeedRecord {
  id: string;
  studentId: string;
  studentName: string;
  content: string;
  date: string;
  leafValue: number;
  creatorUid: string;
  creatorName: string;
  status: 'active' | 'cancelled';
  createdAt?: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  url: string;
  owner?: string;
  status: 'active' | 'cancelled';
  creatorUid: string;
  creatorName: string;
  createdAt?: string;
  updatedAt?: string;
}



export interface ClubItem {
  id: string;
  name: string;
  type: 'CLB' | 'Đội nhóm';
  description?: string;
  leader?: string;
  memberIds: string[];
  memberNames: string[];
  meetingSchedule?: string;
  status: 'active' | 'archived';
  creatorUid: string;
  creatorName: string;
  createdAt?: string;
  updatedAt?: string;
}

export type JournalMood = 'Tự hào' | 'Vui' | 'Đáng nhớ' | 'Cần cố gắng';
export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: JournalMood;
  tags: string[];
  imageUrl?: string;
  authorUid: string;
  authorName: string;
  status: 'active' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface ParentCommunication {
  id: string;
  studentId: string;
  studentName: string;
  channel: 'email' | 'phone' | 'meeting';
  subject: string;
  content: string;
  status: 'draft' | 'logged' | 'sent' | 'failed';
  creatorUid: string;
  creatorName: string;
  createdAt?: string;
}
