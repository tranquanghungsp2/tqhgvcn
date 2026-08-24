import { useEffect, useMemo, useState } from 'react';
import { Download, Heart, Star, TrendingUp, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { listAttendanceRange } from '../services/attendanceService';
import { countGoodDeedsByStudent, listGoodDeeds } from '../services/goodDeedService';
import { listStudentDirectory, listStudents } from '../services/studentService';
import type { AttendanceRecord, PublicStudent, Student } from '../types';

function firstDayOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; }
function today() { return new Date().toISOString().slice(0,10); }

export function ReportsPage() {
  const { currentClassId, currentClass } = useClassRoom(); const { profile, can } = useAuth();
  const [students, setStudents] = useState<Array<Student | PublicStudent>>([]); const [attendance, setAttendance] = useState<AttendanceRecord[]>([]); const [deeds, setDeeds] = useState<Record<string, number>>({});
  const publicOnly = profile?.role === 'student_officer' || !(profile?.role === 'admin' || ['manageStudents', 'manageScores', 'manageAssessments', 'manageStars', 'contactParents'].some((permission) => can(permission as Parameters<typeof can>[0])));
  const canReadAttendance = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'assistant' || can('manageClassContent');
  useEffect(() => { if (!currentClassId) return; const studentPromise = publicOnly ? listStudentDirectory(currentClassId) : listStudents(currentClassId); Promise.all([studentPromise, listGoodDeeds(currentClassId, 1000), canReadAttendance ? listAttendanceRange(currentClassId, firstDayOfMonth(), today()) : Promise.resolve([] as AttendanceRecord[])]).then(([s,d,a]) => { setStudents(s); setDeeds(countGoodDeedsByStudent(d)); setAttendance(a); }); }, [currentClassId, publicOnly, canReadAttendance]);
  const avgScore = students.length ? Math.round(students.reduce((sum,s) => sum + Number(s.totalScore || 0),0)/students.length*10)/10 : 0; const totalStars = students.reduce((sum,s) => sum + Number(s.totalStars || 0),0); const totalDeeds = Object.values(deeds).reduce((a,b)=>a+b,0);
  const attendanceByStudent = useMemo(() => attendance.reduce<Record<string,{late:number;absent:number;excused:number}>>((acc,item) => { const current = acc[item.studentId] || {late:0,absent:0,excused:0}; if(item.status==='late') current.late += 1; if(item.status==='absent') current.absent += 1; if(item.status==='excused') current.excused += 1; acc[item.studentId]=current; return acc; },{}), [attendance]);
  const ranking = useMemo(() => [...students].sort((a,b)=> (b.totalStars-a.totalStars) || (b.totalScore-a.totalScore)), [students]);
  function exportExcel() { const rows = ranking.map((s,index) => ({ 'STT': index+1, 'Mã HS': s.studentCode || '', 'Họ và tên': s.fullName, 'Điểm thi đua': s.totalScore, 'Sao': s.totalStars, 'Lá việc tốt': deeds[s.id] || 0, 'Đi muộn tháng': attendanceByStudent[s.id]?.late || 0, 'Vắng tháng': attendanceByStudent[s.id]?.absent || 0, 'Vắng có phép': attendanceByStudent[s.id]?.excused || 0 })); const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Bao cao lop'); XLSX.writeFile(wb, `bao-cao-${(currentClass?.name || 'lop').replaceAll(' ','-')}.xlsx`); }
  if (!currentClassId) return <EmptyClass />;
  return <><PageHeader title="Báo cáo - Thống kê" description="Tổng hợp các chỉ số chính của lớp. Dữ liệu chuyên cần chỉ hiển thị cho giáo viên/nhóm quản lý." actions={!publicOnly ? <button className="btn primary" onClick={exportExcel}><Download size={16} />Xuất Excel</button> : undefined} />
  <div className="report-metrics"><div><Users /><strong>{students.length}</strong><span>Học sinh</span></div><div><TrendingUp /><strong>{avgScore}</strong><span>Điểm TB thi đua</span></div><div><Star /><strong>{totalStars}</strong><span>Tổng sao</span></div><div><Heart /><strong>{totalDeeds}</strong><span>Lá việc tốt</span></div></div>
  <div className="report-layout"><section className="card"><div className="card-head"><div><h3>Bảng tổng hợp</h3><p>Xếp theo sao, sau đó theo điểm thi đua.</p></div></div><div className="table-wrap"><table><thead><tr><th>#</th><th>Học sinh</th><th>Điểm</th><th>Sao</th><th>Việc tốt</th>{canReadAttendance && <><th>Đi muộn</th><th>Vắng</th></>}</tr></thead><tbody>{ranking.map((s,index)=><tr key={s.id}><td>{index+1}</td><td><strong>{s.fullName}</strong><div className="subtle">{s.studentCode || s.groupName || ''}</div></td><td>{s.totalScore}</td><td>{s.totalStars}</td><td>{deeds[s.id] || 0}</td>{canReadAttendance && <><td>{attendanceByStudent[s.id]?.late || 0}</td><td>{attendanceByStudent[s.id]?.absent || 0}</td></>}</tr>)}</tbody></table></div></section><aside className="soft-panel"><div className="garden-panel-title">🌿 GỢI Ý ĐỌC BÁO CÁO</div><p className="report-note">Nên kết hợp dữ liệu định lượng với nhận xét của giáo viên, hoàn cảnh và sự tiến bộ theo thời gian. Không dùng một chỉ số đơn lẻ để kết luận về học sinh.</p><div className="report-bars">{ranking.slice(0,5).map((s)=><div key={s.id}><span>{s.fullName}</span><div><i style={{width:`${Math.min(100, Math.max(0, s.totalScore))}%`}} /></div><strong>{s.totalScore}</strong></div>)}</div></aside></div></>;
}
