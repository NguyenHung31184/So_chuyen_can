import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Session, TeacherSpecialty, UserRole, Course, Student, User } from '../types';
import { format } from 'date-fns';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: any) => void;
  onDelete?: () => void;
  initialData?: Session | null;
  courses?: Course[];
  students?: Student[];
  currentUser?: User | null;
}

const NewSessionModal: React.FC<NewSessionModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    onDelete, 
    initialData,
    courses: propCourses,
    students: propStudents,
    currentUser: propCurrentUser
}) => {
  const context = useContext(AppContext);
  const courses = propCourses || context?.courses || [];
  const students = propStudents || context?.students || [];
  const currentUser = propCurrentUser || context?.currentUser;
  const users = context?.users || [];
  const existingSessions = context?.sessions || [];
  
  const teachers = useMemo(() => users.filter(u => u.role === UserRole.TEACHER), [users]);

  // State
  const [sessionType, setSessionType] = useState<'Lý thuyết' | 'Thực hành'>('Lý thuyết');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('12:00');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [content, setContent] = useState('');
  const [presentStudentIds, setPresentStudentIds] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // QR Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Initialize form
  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setSessionType(initialData.type === 'Thực hành' ? 'Thực hành' : 'Lý thuyết');
            const start = new Date(initialData.startTimestamp);
            const end = new Date(initialData.endTimestamp);
            setDate(format(start, 'yyyy-MM-dd'));
            setStartTime(format(start, 'HH:mm'));
            setEndTime(format(end, 'HH:mm'));
            setSelectedCourseId(initialData.courseId);
            setTeacherId(initialData.teacherId);
            setContent(initialData.content);
            setPresentStudentIds(initialData.studentIds || initialData.attendees || []);
            setVehicleId(initialData.vehicleId || '');
        } else {
            setSessionType('Lý thuyết');
            setDate(new Date().toISOString().split('T')[0]);
            setStartTime('06:00');
            setEndTime('12:00');
            setSelectedCourseId('');
            setTeacherId(currentUser?.role === UserRole.TEACHER ? currentUser.id : '');
            setContent('');
            setPresentStudentIds([]);
            setVehicleId('');
        }
        setError(null);
        setIsScanning(false); // Reset scanner state
    }
  }, [isOpen, initialData, currentUser]);

  // Clean up scanner on unmount or close
  useEffect(() => {
      return () => {
          if (scannerRef.current) {
              scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
          }
      };
  }, []);

  const availableTeachers = useMemo(() => {
    if (!selectedCourseId) return [];
    const requiredSpecialty = sessionType === 'Lý thuyết' ? TeacherSpecialty.THEORY : TeacherSpecialty.PRACTICE;
    return teachers.filter(t => (t.courseIds?.includes(selectedCourseId) && t.specialty === requiredSpecialty) || t.id === teacherId);
  }, [selectedCourseId, teachers, sessionType, teacherId]);
  
  const courseStudents = useMemo(() => {
      if (!selectedCourseId) return [];
      return students.filter(s => s.courseId === selectedCourseId);
  }, [selectedCourseId, students]);

  const handleAttendanceToggle = (studentId: string) => {
      setPresentStudentIds(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  };

  const handleSelectAll = () => {
      if (presentStudentIds.length === courseStudents.length) {
          setPresentStudentIds([]); 
      } else {
          setPresentStudentIds(courseStudents.map(s => s.id));
      }
  };

  // --- QR SCANNER LOGIC ---
  const startScanner = () => {
      setIsScanning(true);
      setTimeout(() => {
          const scanner = new Html5QrcodeScanner(
              "qr-reader",
              { fps: 10, qrbox: { width: 250, height: 250 } },
              false
          );
          scannerRef.current = scanner;

          scanner.render((decodedText) => {
              // Xử lý khi quét thành công
              const student = courseStudents.find(s => s.id === decodedText);
              if (student) {
                  setPresentStudentIds(prev => {
                      if (!prev.includes(student.id)) {
                          // Play beep sound (optional logic)
                          return [...prev, student.id];
                      }
                      return prev;
                  });
                  alert(`Đã điểm danh: ${student.name}`);
              } else {
                  console.warn("Mã QR không hợp lệ hoặc học viên không thuộc khóa này.");
              }
          }, (errorMessage) => {
              // Bỏ qua lỗi quét liên tục
          });
      }, 100);
  };

  const stopScanner = () => {
      if (scannerRef.current) {
          scannerRef.current.clear().then(() => {
              setIsScanning(false);
          }).catch((err) => {
              console.error("Failed to clear scanner", err);
              setIsScanning(false);
          });
      } else {
          setIsScanning(false);
      }
  };

  const checkOverlap = (start: number, end: number, teacherIdToCheck: string) => {
      const otherSessions = initialData 
        ? existingSessions.filter(s => s.id !== initialData.id) 
        : existingSessions;

      return otherSessions.find(s => {
          if (s.teacherId !== teacherIdToCheck) return false;
          return (start < s.endTimestamp) && (end > s.startTimestamp);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isScanning) stopScanner(); // Dừng scanner nếu đang chạy
    
    if (!selectedCourseId || !teacherId || !content) {
        setError('Vui lòng điền đầy đủ: Khóa học, Giảng viên và Nội dung.');
        return;
    }

    // Validation: Bắt buộc điểm danh ít nhất 1 học viên
    if (presentStudentIds.length === 0 && courseStudents.length > 0) {
        setError('Vui lòng điểm danh ít nhất 1 học viên để ghi nhận buổi học.');
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

        const durationHours = (endTimestamp - startTimestamp) / (1000 * 60 * 60);
        if (durationHours > 5) {
             if (!window.confirm(`Buổi học này kéo dài ${durationHours.toFixed(1)} tiếng. Bạn có chắc chắn thời gian này là chính xác?`)) {
                 setIsLoading(false);
                 return;
             }
        }

        const conflict = checkOverlap(startTimestamp, endTimestamp, teacherId);
        if (conflict) {
            const conflictDate = format(new Date(conflict.startTimestamp), 'dd/MM/yyyy HH:mm');
            setError(`Lỗi: Giáo viên này đã có lịch dạy khác bị trùng vào lúc ${conflictDate}.`);
            setIsLoading(false);
            return;
        }

        const sessionData = {
            courseId: selectedCourseId,
            startTimestamp,
            endTimestamp,
            type: sessionType,
            teacherId,
            content,
            studentIds: presentStudentIds, 
            vehicleId: vehicleId || null,
        };

        if (onSave) {
            await onSave(sessionData);
        } else if (context?.addSession) {
             await context.addSession({
                 ...sessionData,
                 createdBy: currentUser?.role === UserRole.TEACHER ? 'teacher' : 'team_leader', 
                 creatorId: currentUser?.id || ''
             } as any);
             onClose();
        }
    } catch (err: any) {
        setError(err.message || 'Đã có lỗi xảy ra.');
    } finally {
        setIsLoading(false);
    }
  };

  const getCourseDisplayString = (courseId: string) => {
      const course = courses.find(c => c.id === courseId);
      return course ? `${course.name} - K${course.courseNumber}` : 'N/A';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[95vh] animate-fade-in-up">
        <header className="flex-shrink-0 p-5 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">{initialData ? 'Sửa buổi học' : 'Ghi nhận buổi học mới'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-grow contents">
            <div className="flex-grow p-5 space-y-5 overflow-y-auto">
                {/* Type & Date */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Loại hình</label>
                      <select value={sessionType} onChange={(e) => setSessionType(e.target.value as any)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                        <option value="Lý thuyết">Lý thuyết</option>
                        <option value="Thực hành">Thực hành</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày</label>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                </div>
                
                {/* Time */}
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bắt đầu</label>
                      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kết thúc</label>
                      <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>

                {/* Course & Teacher */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Khóa đào tạo</label>
                        <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">-- Chọn khóa đào tạo --</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Giảng viên</label>
                        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100" disabled={!selectedCourseId}>
                            <option value="">-- Chọn giảng viên --</option>
                            {availableTeachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Content */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nội dung bài giảng</label>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" disabled={!selectedCourseId} placeholder="Nhập nội dung..." rows={3}></textarea>
                </div>
                
                {/* Attendance */}
                {courseStudents.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-gray-800">Điểm danh</h4>
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{presentStudentIds.length}/{courseStudents.length}</span>
                        </div>

                        {/* Nút Quét QR Nổi bật */}
                        <div className="mb-4">
                            <button 
                                type="button" 
                                onClick={isScanning ? stopScanner : startScanner} 
                                className={`w-full flex items-center justify-center p-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${isScanning ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'}`}
                            >
                                {isScanning ? (
                                    <>
                                        <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        Dừng quét
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 17h.01M16 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        QUÉT THẺ HỌC VIÊN
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Scanner Area */}
                        {isScanning && (
                            <div className="mb-4 bg-black rounded-xl overflow-hidden shadow-inner border-4 border-indigo-500">
                                <div id="qr-reader" className="w-full"></div>
                                <p className="text-center text-white text-xs py-2 font-medium animate-pulse">Đang tìm mã QR...</p>
                            </div>
                        )}
                        
                        {/* Manual Selection */}
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-gray-500">Hoặc chọn thủ công:</span>
                             <button type="button" onClick={handleSelectAll} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                {presentStudentIds.length === courseStudents.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {courseStudents.map(student => (
                                <label key={student.id} className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-all border ${presentStudentIds.includes(student.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${presentStudentIds.includes(student.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                        {presentStudentIds.includes(student.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={presentStudentIds.includes(student.id)} onChange={() => handleAttendanceToggle(student.id)}/>
                                    <span className={`text-sm ${presentStudentIds.includes(student.id) ? 'text-blue-800 font-medium' : 'text-gray-600'}`}>{student.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center animate-shake">{error}</div>}
            </div>

            <footer className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50/50">
                {onDelete && initialData && (
                    <button type="button" onClick={onDelete} className="px-4 py-3 text-red-600 bg-red-50 rounded-xl font-bold hover:bg-red-100 transition-colors">
                        Xóa
                    </button>
                )}
                <div className="flex-1 flex gap-3 justify-end">
                    <button type="button" onClick={onClose} disabled={isLoading} className="flex-1 sm:flex-none px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                      Hủy
                    </button>
                    <button type="submit" disabled={isLoading} className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50">
                      {isLoading ? 'Đang lưu...' : 'Lưu lại'}
                    </button>
                </div>
            </footer>
        </form>
      </div>
    </div>
  );
};

export default NewSessionModal;
