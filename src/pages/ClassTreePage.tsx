import { useEffect, useMemo, useState } from 'react';
import { Leaf, Search, Star, Trophy, Users } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useClassRoom } from '../context/ClassContext';
import { countGoodDeedsByStudent, listGoodDeeds } from '../services/goodDeedService';
import { listStudentDirectory } from '../services/studentService';
import type { PublicStudent } from '../types';

function treeMood(student: PublicStudent, goodDeeds: number) {
  const strength = Number(student.totalStars || 0) + goodDeeds + Math.max(0, Number(student.totalScore || 100) - 100) / 5;
  if (strength >= 12) return { emoji: '🌳', label: 'Nổi bật', className: 'tree-outstanding' };
  if (strength >= 6) return { emoji: '🌲', label: 'Tiến bộ', className: 'tree-progress' };
  if (strength >= 2) return { emoji: '🌿', label: 'Tốt', className: 'tree-good' };
  return { emoji: '🌱', label: 'Đang lớn', className: 'tree-growing' };
}

export function ClassTreePage() {
  const { currentClassId, currentClass } = useClassRoom();
  const [students, setStudents] = useState<PublicStudent[]>([]);
  const [deedCounts, setDeedCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [selected, setSelected] = useState<PublicStudent | null>(null);

  useEffect(() => {
    if (!currentClassId) return;
    Promise.all([listStudentDirectory(currentClassId), listGoodDeeds(currentClassId, 500)])
      .then(([studentData, deeds]) => {
        setStudents(studentData);
        setDeedCounts(countGoodDeedsByStudent(deeds));
      });
  }, [currentClassId]);

  const groups = useMemo(() => Array.from(new Set(students.map((s) => s.groupName).filter(Boolean) as string[])).sort(), [students]);
  const filtered = useMemo(() => students.filter((student) => {
    const matchSearch = student.fullName.toLowerCase().includes(search.trim().toLowerCase()) || (student.studentCode || '').toLowerCase().includes(search.trim().toLowerCase());
    const matchGroup = !group || student.groupName === group;
    return matchSearch && matchGroup;
  }), [students, search, group]);

  const overview = useMemo(() => {
    const values = students.map((student) => treeMood(student, deedCounts[student.id] || 0).label);
    return {
      good: values.filter((v) => v === 'Tốt').length,
      progress: values.filter((v) => v === 'Tiến bộ').length,
      outstanding: values.filter((v) => v === 'Nổi bật').length,
      growing: values.filter((v) => v === 'Đang lớn').length
    };
  }, [students, deedCounts]);

  if (!currentClassId) return <EmptyClass />;

  return <>
    <PageHeader title={`Cây ${currentClass?.name || 'lớp'}`} description={`${students.length} cây – ${students.length} cá tính – một tập thể cùng lớn lên mỗi ngày.`} />
    <div className="tree-page-layout">
      <section className="card tree-garden-card">
        <div className="tree-toolbar">
          <div className="tree-legend"><span>🌿 Tốt</span><span>🌼 Tiến bộ</span><span>🍎 Nổi bật</span><span>💧 Đang lớn</span></div>
          <div className="tree-filters"><div className="search-with-icon"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm học sinh..." /></div><select value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Tất cả nhóm</option>{groups.map((item) => <option key={item}>{item}</option>)}</select></div>
        </div>
        <div className="student-tree-grid">
          {filtered.map((student, index) => {
            const deeds = deedCounts[student.id] || 0;
            const mood = treeMood(student, deeds);
            return <button type="button" key={student.id} className={`student-tree-card ${mood.className}`} onClick={() => setSelected(student)}>
              <span className="tree-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="tree-emoji">{mood.emoji}</span>
              <strong>{student.fullName}</strong>
              <small>{student.groupName || 'Thành viên lớp'} • {mood.label}</small>
              <div className="tree-badges"><span><Star size={11} fill="currentColor" />{student.totalStars}</span><span><Leaf size={11} />{deeds}</span></div>
            </button>;
          })}
          {filtered.length === 0 && <div className="empty-inline span-all">Không có học sinh phù hợp.</div>}
        </div>
        <div className="garden-footnote">💡 Nhấp vào mỗi cây để xem hành trình trưởng thành của từng bạn 🌿</div>
      </section>

      <aside className="tree-side-column">
        <section className="soft-panel tree-overview">
          <div className="garden-panel-title"><Users size={18} /> TỔNG QUAN HÔM NAY</div>
          <div className="tree-overview-grid"><div><span>🌿</span><strong>{overview.good}</strong><small>Việc tốt</small></div><div><span>🌼</span><strong>{overview.progress}</strong><small>Bạn tiến bộ</small></div><div><span>🍎</span><strong>{overview.outstanding}</strong><small>Bạn nổi bật</small></div><div><span>💧</span><strong>{overview.growing}</strong><small>Đang lớn</small></div></div>
        </section>
        <section className="soft-panel selected-tree-panel">
          <div className="garden-panel-title"><Trophy size={18} /> HÀNH TRÌNH CỦA BẠN</div>
          {selected ? <div className="selected-tree-content">
            <div className="selected-big-tree">{treeMood(selected, deedCounts[selected.id] || 0).emoji}</div>
            <h3>{selected.fullName}</h3>
            <p>{selected.groupName || 'Thành viên lớp'} • {treeMood(selected, deedCounts[selected.id] || 0).label}</p>
            <div className="selected-tree-stats"><div><strong>{selected.totalScore}</strong><span>Điểm thi đua</span></div><div><strong>{selected.totalStars}</strong><span>Sao</span></div><div><strong>{deedCounts[selected.id] || 0}</strong><span>Lá việc tốt</span></div></div>
          </div> : <div className="empty-soft">Chọn một cây trong khu vườn để xem chi tiết.</div>}
        </section>
        <section className="garden-message-card">🌱<p>Một tập thể mạnh không phải vì ai đó giỏi nhất, mà vì tất cả đều cố gắng mỗi ngày.</p>❤️</section>
      </aside>
    </div>
  </>;
}
