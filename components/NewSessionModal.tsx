import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Session, TeacherSpecialty, UserRole } from '../types';

interface NewSessionModalProps {
  onClose: () => void;
}

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const NewSessionModal: React.FC<NewSessionModalProps> = ({ onClose }) => {
  const context = useContext(AppContext);

  // === CÁC STATE CỦA FORM (ĐÃ CẬP NHẬT) ===
  const [sessionType, setSessionType] = useState<'Lý thuyết' | 'Thực hành'>('Lý thuyết');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('12:00');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [content, setContent] = useState(''); // Đổi 'topic' thành 'content'
  const [presentStudentIds, setPresentStudentIds] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  if (!context) return null;

  // === LẤY ĐÚNG HÀM VÀ DỮ LIỆU TỪ CONTEXT ===
  const { courses, users, students, addSession, currentUser } = context;
  const teachers = useMemo(() => (users || []).filter(u => u.role === UserRole.TEACHER), [users]);

  useEffect(() => {
    setPresentStudentIds([]);
    setTeacherId('');
  }, [selectedCourseId, sessionType]);

  const availableTeachers = useMemo(() => {
    if (!selectedCourseId) return [];
    const requiredSpecialty = sessionType === 'Lý thuyết' ? TeacherSpecialty.THEORY : TeacherSpecialty.PRACTICE;
    return (teachers || []).filter(t => 
        t.courseIds?.includes(selectedCourseId) && t.specialty === requiredSpecialty
    );
  }, [selectedCourseId, teachers, sessionType]);
  
  const courseStudents = useMemo(() => {
      if (!selectedCourseId) return [];
      return (students || []).filter(s => s.courseId === selectedCourseId);
  }, [selectedCourseId, students]);

  const handleAttendanceToggle = (studentId: string) => {
      setPresentStudentIds(prev => 
          prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
      );
  };

  // === LOGIC `handleSubmit` ĐÃ ĐƯỢC VIẾT LẠI HOÀN TOÀN ĐỂ LƯU ĐÚNG CHUẨN DỮ LIỆU ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCourseId || !teacherId || !content) {
        setError('Vui lòng điền đầy đủ: Khóa học, Giảng viên và Nội dung.');
        return;
    }
    if (!currentUser) {
        setError('Không thể xác định người dùng hiện tại. Vui lòng thử lại.');
        return;
    }

    setIsLoading(true);

    try {
        const startTimestamp = new Date(`${date}T${startTime}`).getTime();
        const endTimestamp = new Date(`${date}T${endTime}`).getTime();

        if (startTimestamp >= endTimestamp) {
            setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
            setIsLoading(false);
            return;
        }

        const newSession: Omit<Session, 'id'> = {
            courseId: selectedCourseId,
            startTimestamp,
            endTimestamp,
            type: sessionType,
            teacherId,
            content,
            attendees: presentStudentIds,
            createdBy: currentUser.role === UserRole.TEACHER ? 'teacher' : 'team_leader',
            creatorId: currentUser.id,
        };

        await addSession(newSession);
        alert('Lưu buổi học thành công!');
        onClose();

    } catch (err: any) {
        console.error("Lỗi khi lưu buổi học:", err);
        setError(err.message || 'Đã có lỗi xảy ra.');
    } finally {
        setIsLoading(false);
    }
  };

  const getCourseDisplayString = (courseId: string) => {
      const course = (courses || []).find(c => c.id === courseId);
      if (!course) return 'N/A';
      return `${course.name} - Khóa ${course.courseNumber}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <header className="flex-shrink-0 p-5 flex justify-between items-center border-b">
          <h2 className="text-xl font-bold text-gray-800">Ghi nhận buổi học mới</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Đóng">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-grow contents">
            <div className="flex-grow p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="session-type" className="block text-sm font-medium text-gray-700 mb-1">Loại buổi học</label>
                      <select id="session-type" value={sessionType} onChange={(e) => setSessionType(e.target.value as 'Lý thuyết' | 'Thực hành')} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                        <option value="Lý thuyết">Lý thuyết</option>
                        <option value="Thực hành">Thực hành</option>
                      </select>
                    </div>
                    <div className="relative">
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                      <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary pr-10" />
                      <div className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center pointer-events-none"><CalendarIcon /></div>
                    </div>
                </div>
                <div>
                    <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">Khóa đào tạo</label>
                    <select id="course" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                        <option value="">Chọn khóa đào tạo</option>
                        {(courses || []).map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="teacher" className="block text-sm font-medium text-gray-700 mb-1">Giảng viên phụ trách</label>
                    <select id="teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" disabled={!selectedCourseId}>
                        <option value="">{availableTeachers.length > 0 ? 'Chọn giảng viên' : (selectedCourseId ? 'Không có GV phù hợp' : 'Vui lòng chọn khóa học')}</option>
                        {availableTeachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Nội dung giảng dạy</label>
                    <input id="content" type="text" value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" disabled={!selectedCourseId} placeholder="Nhập chủ đề buổi học..." />
                </div>
                {courseStudents.length > 0 && (
                    <div className="border-t pt-4">
                        <h4 className="text-md font-medium text-gray-800 mb-3">Điểm danh học viên ({presentStudentIds.length}/{courseStudents.length})</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {courseStudents.map(student => (
                                <label key={student.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" checked={presentStudentIds.includes(student.id)} onChange={() => handleAttendanceToggle(student.id)}/>
                                    <span className="text-sm">{student.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-1">Giờ bắt đầu</label>
                      <input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                      <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-1">Giờ kết thúc</label>
                      <input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
                    </div>
                </div>
                {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            </div>
            <footer className="flex-shrink-0 p-4 bg-gray-50 flex justify-end gap-3 border-t">
                <button type="button" onClick={onClose} disabled={isLoading} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 font-semibold transition-colors disabled:opacity-50">
                  Hủy
                </button>
                <button type="submit" disabled={isLoading} className="px-6 py-2 rounded-md font-semibold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {isLoading ? 'Đang lưu...' : 'Lưu lại'}
                </button>
            </footer>
        </form>
      </div>
    </div>
  );
};

export default NewSessionModal;