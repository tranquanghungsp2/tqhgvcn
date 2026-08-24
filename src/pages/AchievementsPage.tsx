import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Award, Heart, Leaf, Medal, Star, TrendingUp, Trophy } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useClassRoom } from '../context/ClassContext';
import { countGoodDeedsByStudent, listGoodDeeds } from '../services/goodDeedService';
import { listStudentDirectory } from '../services/studentService';
import type { PublicStudent } from '../types';

export function AchievementsPage() {
  const { currentClassId } = useClassRoom();
  const [students, setStudents] = useState<PublicStudent[]>([]); const [deeds, setDeeds] = useState<Record<string, number>>({});
  useEffect(() => { if (!currentClassId) return; Promise.all([listStudentDirectory(currentClassId), listGoodDeeds(currentClassId, 500)]).then(([s, d]) => { setStudents(s); setDeeds(countGoodDeedsByStudent(d)); }); }, [currentClassId]);
  const byStars = useMemo(() => [...students].sort((a,b) => b.totalStars - a.totalStars).slice(0,10), [students]);
  const byScore = useMemo(() => [...students].sort((a,b) => b.totalScore - a.totalScore).slice(0,10), [students]);
  const byDeeds = useMemo(() => [...students].sort((a,b) => (deeds[b.id] || 0) - (deeds[a.id] || 0)).slice(0,10), [students, deeds]);
  if (!currentClassId) return <EmptyClass />;
  const podium = byStars.slice(0,3);
  return <><PageHeader title="Thành tích - Tiến bộ" description="Tôn vinh nỗ lực, sự tiến bộ và những đóng góp tích cực của từng thành viên." />
    <section className="achievement-hero"><div className="achievement-copy"><span>🏆 VINH DANH TIẾN BỘ</span><h2>Mỗi bạn đều có một hành trình đáng tự hào</h2><p>Không chỉ nhìn vào vị trí dẫn đầu, hệ thống ghi nhận cả điểm thi đua, sao và những việc tốt mỗi ngày.</p></div><div className="podium">{podium.map((student, index) => <div className={`podium-place place-${index + 1}`} key={student.id}><div className="podium-avatar">{student.fullName.slice(0,1)}</div><Medal /><strong>{student.fullName}</strong><span>{student.totalStars} sao</span></div>)}</div></section>
    <div className="achievement-columns"><Ranking title="Sao nổi bật" icon={<Star size={18} />} items={byStars} value={(s) => `${s.totalStars} sao`} /><Ranking title="Điểm thi đua" icon={<TrendingUp size={18} />} items={byScore} value={(s) => `${s.totalScore} điểm`} /><Ranking title="Gieo việc tốt" icon={<Heart size={18} />} items={byDeeds} value={(s) => `${deeds[s.id] || 0} lá`} /></div>
    <div className="achievement-note"><Trophy /><div><strong>Cùng nhau tiến bộ</strong><p>Bảng vinh danh dùng để khích lệ, không phải tạo áp lực so sánh. Giáo viên có thể kết hợp nhận xét định tính để nhìn đầy đủ hơn hành trình của mỗi em.</p></div><Leaf /></div>
  </>;
}

function Ranking({ title, icon, items, value }: { title: string; icon: ReactNode; items: PublicStudent[]; value: (student: PublicStudent) => string }) {
  return <section className="soft-panel ranking-panel"><div className="garden-panel-title">{icon}{title.toUpperCase()}</div><div className="ranking-list">{items.map((student, index) => <div key={student.id}><span className={`rank-badge rank-${index + 1}`}>{index + 1}</span><div className="mini-avatar">{student.fullName.slice(0,1)}</div><strong>{student.fullName}</strong><em>{value(student)}</em></div>)}{items.length === 0 && <div className="empty-soft">Chưa có dữ liệu.</div>}</div></section>;
}
