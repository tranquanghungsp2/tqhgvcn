import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Mail, Phone, Save, Users } from 'lucide-react';
import { EmptyClass } from '../components/EmptyClass';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useClassRoom } from '../context/ClassContext';
import { listParentCommunications, logParentCommunication } from '../services/parentCommunicationService';
import { listStudents } from '../services/studentService';
import type { ParentCommunication, Student } from '../types';

function personalize(template: string, student: Student) {
  return template
    .replaceAll('[Tên học sinh]', student.fullName)
    .replaceAll('[Điểm tổng]', String(student.totalScore))
    .replaceAll('[Sao]', String(student.totalStars))
    .replaceAll('[5PC]', String(student.qualityAvg || 'Chưa đánh giá'))
    .replaceAll('[10NL]', String(student.competencyAvg || 'Chưa đánh giá'));
}

function channelIcon(channel: ParentCommunication['channel']) {
  if (channel === 'email') return '✉️';
  if (channel === 'phone') return '📞';
  return '👥';
}

function channelLabel(channel: ParentCommunication['channel']) {
  if (channel === 'email') return 'Email';
  if (channel === 'phone') return 'Điện thoại';
  return 'Gặp trực tiếp';
}

export function ParentsPage() {
  const { currentClassId } = useClassRoom();
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [history, setHistory] = useState<ParentCommunication[]>([]);
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('Thông tin học tập và rèn luyện của học sinh');
  const [content, setContent] = useState(
    'Kính gửi phụ huynh [Tên học sinh],\n\nĐiểm thi đua hiện tại: [Điểm tổng].\nSố sao: [Sao].\nTB 5 phẩm chất: [5PC].\nTB 10 năng lực: [10NL].\n\nRất mong gia đình tiếp tục đồng hành cùng con.\n\nTrân trọng.',
  );
  const [message, setMessage] = useState('');

  async function reload() {
    if (!currentClassId) return;
    const [studentItems, communicationItems] = await Promise.all([
      listStudents(currentClassId),
      listParentCommunications(currentClassId),
    ]);
    setStudents(studentItems);
    setHistory(communicationItems);
  }

  useEffect(() => {
    void reload();
  }, [currentClassId]);

  const student = useMemo(() => students.find((item) => item.id === studentId), [students, studentId]);
  const personalized = student ? personalize(content, student) : content;

  if (!currentClassId) return <EmptyClass />;

  function openMail() {
    if (!student?.parentEmail) return;
    window.location.href = `mailto:${encodeURIComponent(student.parentEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(personalized)}`;
  }

  async function log(channel: ParentCommunication['channel']) {
    if (!student || !profile) return;
    await logParentCommunication({
      classId: currentClassId,
      studentId: student.id,
      studentName: student.fullName,
      channel,
      subject,
      content: personalized,
      status: 'logged',
      creatorUid: profile.uid,
      creatorName: profile.displayName,
    });
    setMessage(`Đã lưu nhật ký liên hệ bằng ${channelLabel(channel).toLowerCase()}.`);
    await reload();
  }

  return (
    <>
      <PageHeader
        title="Phụ huynh đồng hành"
        description="Soạn nội dung cá nhân hóa, mở email/điện thoại và lưu nhật ký trao đổi với phụ huynh."
      />

      {message && <div className="alert success-alert"><CheckCircle2 size={16} />{message}</div>}

      <div className="parent-layout">
        <section className="card form-card">
          <label>
            Học sinh
            <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">-- Chọn học sinh --</option>
              {students.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullName}{item.parentPhone ? ` • ${item.parentPhone}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="parent-contact-chips">
            {student?.parentEmail && <span><Mail size={13} />{student.parentEmail}</span>}
            {student?.parentPhone && <span><Phone size={13} />{student.parentPhone}</span>}
            {!student && <span><Users size={13} />Chưa chọn phụ huynh</span>}
          </div>

          <label>
            Tiêu đề
            <input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </label>
          <label>
            Nội dung mẫu
            <textarea className="large" value={content} onChange={(event) => setContent(event.target.value)} />
          </label>

          <div className="parent-actions">
            <button className="btn primary" disabled={!student?.parentEmail} onClick={openMail}>
              <Mail size={16} />Mở email
            </button>
            <a className={`btn ghost ${student?.parentPhone ? '' : 'disabled'}`} href={student?.parentPhone ? `tel:${student.parentPhone}` : undefined}>
              <Phone size={16} />Gọi điện
            </a>
            <button className="btn ghost" disabled={!student} onClick={() => void log('email')}>
              <Save size={16} />Lưu email
            </button>
            <button className="btn ghost" disabled={!student} onClick={() => void log('phone')}>
              <Save size={16} />Lưu cuộc gọi
            </button>
            <button className="btn ghost" disabled={!student} onClick={() => void log('meeting')}>
              <Save size={16} />Lưu gặp trực tiếp
            </button>
          </div>
        </section>

        <section className="card preview-card">
          <div className="card-head">
            <div>
              <h3>Xem trước nội dung</h3>
              <p>{student?.parentEmail || student?.parentPhone || 'Chưa chọn người nhận'}</p>
            </div>
          </div>
          <h4>{subject}</h4>
          <pre>{personalized}</pre>
        </section>
      </div>

      <section className="card parent-history">
        <div className="card-head">
          <div>
            <h3>Nhật ký liên hệ</h3>
            <p>{history.length} lần ghi nhận gần đây.</p>
          </div>
        </div>
        <div className="activity-list">
          {history.map((item) => (
            <div className="activity-row" key={item.id}>
              <div className="communication-icon">{channelIcon(item.channel)}</div>
              <div className="activity-main">
                <strong>{item.studentName}</strong>
                <span>{item.subject}</span>
                <small>{item.creatorName} • {channelLabel(item.channel)}</small>
              </div>
            </div>
          ))}
          {history.length === 0 && <div className="empty-inline">Chưa có nhật ký liên hệ.</div>}
        </div>
      </section>
    </>
  );
}
