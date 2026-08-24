import type { Permissions } from '../types';

export const EMPTY_PERMISSIONS: Permissions = {
  manageStudents: false,
  manageScores: false,
  submitScoreProposals: false,
  manageAssessments: false,
  manageStars: false,
  manageWeeklyPlans: false,
  manageClassContent: false,
  manageNotifications: false,
  contactParents: false,
  viewReports: true,
  manageUsers: false,
  manageSettings: false
};

export const TEACHER_PERMISSIONS: Permissions = {
  manageStudents: true,
  manageScores: true,
  submitScoreProposals: false,
  manageAssessments: true,
  manageStars: true,
  manageWeeklyPlans: true,
  manageClassContent: true,
  manageNotifications: true,
  contactParents: true,
  viewReports: true,
  manageUsers: false,
  manageSettings: false
};

export const OFFICER_PERMISSIONS: Permissions = {
  ...EMPTY_PERMISSIONS,
  submitScoreProposals: true,
  viewReports: true
};

export const ADMIN_PERMISSIONS: Permissions = Object.fromEntries(
  Object.keys(EMPTY_PERMISSIONS).map((key) => [key, true])
) as Permissions;

export const QUALITY_CRITERIA = ['Yêu nước', 'Nhân ái', 'Chăm chỉ', 'Trung thực', 'Trách nhiệm'];

export const COMPETENCY_CRITERIA = [
  'Tự chủ và tự học',
  'Giao tiếp và hợp tác',
  'Giải quyết vấn đề và sáng tạo',
  'Ngôn ngữ',
  'Tính toán',
  'Khoa học',
  'Công nghệ',
  'Tin học',
  'Thẩm mỹ',
  'Thể chất'
];

export const STAR_TYPES = [
  { type: 'Học tập', description: 'Xuất sắc trong học tập' },
  { type: 'Kỷ luật', description: 'Chấp hành nội quy tốt' },
  { type: 'Thể thao', description: 'Tích cực tập luyện' },
  { type: 'Văn nghệ', description: 'Năng khiếu nghệ thuật' },
  { type: 'Hoạt động', description: 'Tích cực hoạt động tập thể' },
  { type: 'Lãnh đạo', description: 'Tinh thần đội nhóm' }
];

export const DEFAULT_CLASS_RULES = [
  { title: 'Đi học đúng giờ', description: 'Có mặt trước giờ học, không đi muộn, về sớm.', icon: '🕐' },
  { title: 'Trang phục gọn gàng', description: 'Mặc đồng phục đúng quy định, gọn gàng, sạch sẽ.', icon: '👔' },
  { title: 'Chuẩn bị bài đầy đủ', description: 'Chuẩn bị sách vở, dụng cụ học tập trước khi đến lớp.', icon: '📚' },
  { title: 'Chú ý lắng nghe', description: 'Lắng nghe khi thầy cô và bạn bè đang nói, không làm việc riêng.', icon: '👂' },
  { title: 'Giữ gìn vệ sinh', description: 'Giữ lớp học sạch sẽ, ngăn nắp, bỏ rác đúng nơi.', icon: '🧹' },
  { title: 'Nói lời hay, làm việc tốt', description: 'Thân thiện, hòa nhã và biết giúp đỡ mọi người.', icon: '❤️' },
  { title: 'Tôn trọng mọi người', description: 'Tôn trọng thầy cô, bạn bè và mọi người xung quanh.', icon: '🤝' },
  { title: 'Giữ gìn tài sản chung', description: 'Bảo quản bàn ghế, đồ dùng lớp và không viết vẽ lên tài sản.', icon: '🎒' },
  { title: 'Tuân thủ quy định', description: 'Chấp hành nội quy lớp, trường và quy định chung.', icon: '🛡️' },
  { title: 'Học tập tích cực', description: 'Chủ động học tập, hoàn thành bài và không ngừng tiến bộ.', icon: '💡' }
];

export const SUBJECTS = ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Khoa học tự nhiên', 'Lịch sử', 'Địa lí', 'Tin học', 'Công nghệ', 'GDCD', 'Thể chất', 'Nghệ thuật', 'Khác'];
