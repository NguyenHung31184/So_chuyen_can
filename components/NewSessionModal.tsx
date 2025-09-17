import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Session, SessionType, TeacherSpecialty, Student, UserRole } from '../types';

interface NewSessionModalProps {
  onClose: () => void;
  onSave: (session: Omit<Session, 'id'>) => void;
}

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const NewSessionModal: React.FC<NewSessionModalProps> = ({ onClose, onSave }) => {
  const context = useContext(AppContext);

  // --- State (giữ nguyên) ---
  const [sessionType, setSessionType] = useState<SessionType>(SessionType.THEORY);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('12:00');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [topic, setTopic] = useState('');
  const [presentStudentIds, setPresentStudentIds] = useState<string[]>([]);

  if (!context) return null;

  const { courses, users, students } = context;
  const teachers = useMemo(() => users.filter(u => u.role === UserRole.TEACHER), [users]);

  // Effect để reset giáo viên và điểm danh khi khóa học hoặc loại buổi học thay đổi
  useEffect(() => {
    setPresentStudentIds([]);
    setTeacherId(''); // Tự động reset giáo viên đã chọn
  }, [selectedCourseId, sessionType]);

  // === LOGIC LỌC GIÁO VIÊN THEO CHUYÊN MÔN ===
  const availableTeachers = useMemo(() => {
    if (!selectedCourseId) return [];
    
    // Xác định chuyên môn cần tìm dựa trên loại buổi học
    const requiredSpecialty = sessionType === SessionType.THEORY 
        ? TeacherSpecialty.THEORY 
        : TeacherSpecialty.PRACTICE;

    // Lọc các giáo viên vừa được phân công cho khóa học VÀ có chuyên môn phù hợp
    return teachers.filter(t => 
        t.courseIds?.includes(selectedCourseId) && t.specialty === requiredSpecialty
    );
  }, [selectedCourseId, teachers, sessionType]); // Thêm sessionType vào dependency
  
  const courseStudents = useMemo(() => {
      if (!selectedCourseId) return [];
      return students.filter(s => s.courseId === selectedCourseId);
  }, [selectedCourseId, students]);

  const handleAttendanceToggle = (studentId: string) => {
      setPresentStudentIds(prev => 
          prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
      );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !teacherId || !topic) {
        alert('Vui lòng điền đầy đủ thông tin: Khóa học, Giảng viên và Nội dung giảng dạy.');
        return;
    }
    const newSession: Omit<Session, 'id'> = {
        type: sessionType, date, startTime, endTime, teacherId,
        courseId: selectedCourseId, topic, studentIds: presentStudentIds,
    };
    onSave(newSession);
  };

  const getCourseDisplayString = (courseId: string) => {
      const course = courses.find(c => c.id === courseId);
      if (!course) return 'N/A';
      return `${course.name} - Khóa ${course.courseNumber}`;
  };

  // === GIAO DIỆN ĐÃ FIX LỖI CUỘN VÀ TỐI ƯU HÓA ===
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      {/* Cấu trúc flex để tách header, content và footer */}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header cố định */}
        <header className="flex-shrink-0 p-5 flex justify-between items-center border-b">
          <h2 className="text-xl font-bold text-gray-800">Ghi nhận buổi học mới</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Đóng">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        {/* Form chiếm toàn bộ không gian còn lại */}
        <form onSubmit={handleSubmit} className="flex-grow contents">
            {/* Content (chỉ phần này được cuộn) */}
            <div className="flex-grow p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="session-type" className="block text-sm font-medium text-gray-700 mb-1">Loại buổi học</label>
                      <select id="session-type" value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                        <option value={SessionType.THEORY}>Lý thuyết</option>
                        <option value={SessionType.PRACTICE}>Thực hành</option>
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
                        {courses.map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)}
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
                    <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">Nội dung giảng dạy</label>
                    <input id="topic" type="text" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" disabled={!selectedCourseId} placeholder="Nhập chủ đề buổi học..." />
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
            </div>
          
            {/* Footer cố định */}
            <footer className="flex-shrink-0 p-4 bg-gray-50 flex justify-end gap-3 border-t">
                <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 font-semibold transition-colors">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2 rounded-md font-semibold text-white bg-primary hover:bg-primary-dark transition-colors">
                  Lưu lại
                </button>
            </footer>
        </form>
      </div>
    </div>
  );
};

export default NewSessionModal;
