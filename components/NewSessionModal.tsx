import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Session, TeacherSpecialty, UserRole, Course, Student, User } from '../types';
import { format } from 'date-fns';
import { Html5Qrcode } from 'html5-qrcode';
import type { CameraDevice } from 'html5-qrcode';

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
  const allCourses = propCourses || context?.courses || [];
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
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | undefined>(undefined);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // --- LOGIC: LỌC KHÓA HỌC (ACTIVE COURSES) ---
  const activeCourses = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    return allCourses.filter(course => {
        // 1. Kiểm tra thời hạn khóa học (Cho phép trễ 7 ngày)
        if (course.endDate) {
            const courseEnd = typeof course.endDate === 'string' ? new Date(course.endDate) : new Date(course.endDate);
            if (courseEnd.getTime() < sevenDaysAgo.getTime()) {
                return false; 
            }
        }

        // 2. Kiểm tra phân quyền theo Role
        if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER) {
            return true;
        }

        if (
            currentUser?.role === UserRole.TEACHER || 
            currentUser?.role === UserRole.TEAM_LEADER ||
            currentUser?.role === UserRole.STUDENT
        ) {
            return currentUser.courseIds?.includes(course.id);
        }

        return false;
    });
  }, [allCourses, currentUser]);

  // --- Derived data ---
  const availableTeachers = useMemo(() => {
    if (!selectedCourseId) return [];
    const requiredSpecialty = sessionType === 'Lý thuyết' ? TeacherSpecialty.THEORY : TeacherSpecialty.PRACTICE;
    
    return teachers.filter(t => 
        (t.courseIds?.includes(selectedCourseId) && t.specialty === requiredSpecialty) || t.id === teacherId
    );
  }, [selectedCourseId, teachers, sessionType, teacherId]);
  
  const courseStudents = useMemo(() => {
      if (!selectedCourseId) return [];
      return students.filter(s => s.courseId === selectedCourseId);
  }, [selectedCourseId, students]);

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
        if (isScanning) {
            stopScanner();
        }
    }
  }, [isOpen, initialData, currentUser]);

  // --- QR SCANNER LOGIC ---
  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
        try {
            await scannerRef.current.stop();
        } catch (err) {
            console.error("Error stopping the scanner.", err);
        }
    }
    scannerRef.current = null;
    setIsScanning(false);
    setCameras([]);
    setActiveCameraId(undefined);
  };

  const startScanner = async () => {
      setIsScanning(true);
      try {
          const availableCameras = await Html5Qrcode.getCameras();
          if (availableCameras && availableCameras.length > 0) {
              setCameras(availableCameras);
              const backCamera = availableCameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('môi trường'));
              setActiveCameraId(backCamera ? backCamera.id : availableCameras[0].id);
          } else {
              setError('Không tìm thấy camera trên thiết bị này.');
              setIsScanning(false);
          }
      } catch (err) {
          setError('Không thể truy cập camera. Vui lòng cấp quyền cho trình duyệt.');
          setIsScanning(false);
          console.error(err);
      }
  };
  
  useEffect(() => {
    let ignore = false;
    const scan = async () => {
        if (isScanning && activeCameraId) {
            if (scannerRef.current && scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }
            if (ignore) return;
            const newScanner = new Html5Qrcode('qr-reader');
            scannerRef.current = newScanner;
            const onScanSuccess = (decodedText: string) => {
                const student = courseStudents.find(s => s.id === decodedText);
                if (student) {
                    setPresentStudentIds(prev => {
                        if (!prev.includes(student.id)) return [...prev, student.id];
                        return prev;
                    });
                }
            };
            try {
                await newScanner.start(
                    activeCameraId,
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    onScanSuccess,
                    (errorMessage) => { /* ignore errors */ }
                );
            } catch (err) {
                if (!ignore) {
                    console.error("Error starting scanner: ", err);
                    setError('Không thể khởi động camera. Hãy thử lại.');
                    stopScanner();
                }
            }
        }
    }
    scan();
    return () => {
        ignore = true;
        if(scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(err => console.error('Cleanup stop failed', err));
        }
    };
}, [isScanning, activeCameraId, courseStudents]);

  const handleSwitchCamera = () => {
      if (cameras.length > 1 && activeCameraId) {
          const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
          const nextIndex = (currentIndex + 1) % cameras.length;
          setActiveCameraId(cameras[nextIndex].id);
      }
  };
  
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

  // --- HELPER: XÁC ĐỊNH CA DẠY (SHIFT) ---
  const getShift = (dateObj: Date) => {
      const h = dateObj.getHours();
      if (h < 12) return 'Sáng';   // Trước 12h trưa
      if (h < 18) return 'Chiều';  // 12h - 18h
      return 'Tối';                // Sau 18h
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isScanning) await stopScanner();
    
    // Validate cơ bản
    if (!selectedCourseId || !teacherId || !content) {
        setError('Vui lòng điền đầy đủ: Khóa học, Giảng viên và Nội dung.');
        return;
    }

    if (presentStudentIds.length === 0 && courseStudents.length > 0) {
        setError('Vui lòng điểm danh ít nhất 1 học viên để ghi nhận buổi học.');
        return;
    }

    setIsLoading(true);
    try {
        const startTimestamp = new Date(`${date}T${startTime}`).getTime();
        const endTimestamp = new Date(`${date}T${endTime}`).getTime();
        
        // Check 1: Thời gian hợp lệ
        if (startTimestamp >= endTimestamp) {
            setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
            setIsLoading(false);
            return;
        }

        // Check 2: Kiểm tra lùi ngày (Max 3 ngày)
        const inputDate = new Date(date);
        const today = new Date();
        inputDate.setHours(0,0,0,0);
        today.setHours(0,0,0,0);
        
        const diffTime = today.getTime() - inputDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        if (diffDays > 3) {
             setError('Quy định: Không được phép ghi nhận lùi quá 3 ngày.');
             setIsLoading(false);
             return;
        }

        // Check 3: Cảnh báo thời lượng dài
        const durationHours = (endTimestamp - startTimestamp) / (1000 * 60 * 60);
        if (durationHours > 5) {
             if (!window.confirm(`Buổi học kéo dài ${durationHours.toFixed(1)} tiếng. Bạn có chắc chắn?`)) {
                 setIsLoading(false);
                 return;
             }
        }

        // --- CHECK 4: KIỂM TRA TRÙNG LẶP CHÍNH XÁC (Dựa trên Shift + CreatorID) ---
        // Mục tiêu: Ngăn chặn 1 người tạo 2 bản ghi cho cùng 1 ca dạy của cùng 1 lớp
        // Nhưng cho phép Giáo viên và Nhóm trưởng tạo song song.
        
        const currentStartObj = new Date(startTimestamp);
        const currentShift = getShift(currentStartObj);
        const currentDateStr = format(currentStartObj, 'yyyy-MM-dd');
        const currentCreatorId = currentUser?.id || 'unknown';

        const duplicateSession = existingSessions.find(s => {
            // Bỏ qua chính bản ghi đang sửa (nếu có)
            if (initialData && s.id === initialData.id) return false;

            const sDate = new Date(s.startTimestamp);
            const sShift = getShift(sDate);
            const sDateStr = format(sDate, 'yyyy-MM-dd');

            // Điều kiện trùng lặp: Cùng Ngày + Cùng Ca + Cùng Giáo viên + Cùng Khóa học + CÙNG NGƯỜI TẠO
            return (
                sDateStr === currentDateStr &&          // Cùng ngày
                sShift === currentShift &&              // Cùng ca (Sáng/Chiều/Tối)
                s.teacherId === teacherId &&            // Cùng giáo viên
                s.courseId === selectedCourseId &&      // Cùng khóa học
                s.creatorId === currentCreatorId        // Cùng một người tạo
            );
        });

        if (duplicateSession) {
            setError(`Bạn đã ghi nhận buổi học này rồi (Ca ${currentShift} ngày ${format(currentStartObj, 'dd/MM/yyyy')}). Không thể tạo bản ghi trùng.`);
            setIsLoading(false);
            return;
        }

        // --- SAVING LOGIC ---
        const createdByRole = currentUser?.role === UserRole.TEACHER ? 'teacher' : 'team_leader';
        const creatorId = currentUser?.id || 'unknown';

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
                 createdBy: createdByRole, 
                 creatorId: creatorId
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
      const course = allCourses.find(c => c.id === courseId);
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

        <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
            <div className="flex-grow p-5 space-y-5 overflow-y-auto pb-20 custom-scrollbar">
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

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Khóa đào tạo</label>
                        <select 
                            value={selectedCourseId} 
                            onChange={(e) => setSelectedCourseId(e.target.value)} 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            disabled={!!initialData} 
                        >
                            <option value="">-- Chọn khóa đào tạo (Đang hoạt động) --</option>
                            {activeCourses.length > 0 ? (
                                activeCourses.map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)
                            ) : (
                                <option disabled>Không có khóa học nào khả dụng</option>
                            )}
                        </select>
                        {activeCourses.length === 0 && <p className="text-xs text-red-500 mt-1">Bạn chưa được phân công khóa học nào hoặc tất cả khóa học đã kết thúc quá 7 ngày.</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Giảng viên</label>
                        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100" disabled={!selectedCourseId}>
                            <option value="">-- Chọn giảng viên --</option>
                            {availableTeachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nội dung bài giảng</label>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" disabled={!selectedCourseId} placeholder="Nhập nội dung..." rows={3}></textarea>
                </div>
                
                {selectedCourseId && courseStudents.length === 0 && (
                    <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm text-center">
                        Khóa học này chưa có học viên nào.
                    </div>
                )}

                {courseStudents.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                         <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-gray-800">Điểm danh</h4>
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{presentStudentIds.length}/{courseStudents.length}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <button 
                                type="button" 
                                onClick={isScanning ? stopScanner : startScanner} 
                                className={`w-full flex-grow flex items-center justify-center p-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${isScanning ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600'}`}
                            >
                                {isScanning ? 'Dừng quét' : 'Quét QR'}
                            </button>
                            {isScanning && cameras.length > 1 && (
                                <button 
                                    type="button" 
                                    onClick={handleSwitchCamera}
                                    className="w-full sm:w-auto px-4 py-3 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-800 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg>
                                    Đổi Camera
                                </button>
                            )}
                        </div>

                        {isScanning && (
                            <div className="mb-4 bg-black rounded-xl overflow-hidden shadow-inner border-4 border-transparent animate-fade-in-fast">
                                <div id="qr-reader" className="w-full aspect-square bg-gray-900"></div>
                                <p className="text-center text-white text-xs py-2 font-medium bg-black bg-opacity-30">Hướng camera về phía mã QR</p>
                            </div>
                        )}
                        
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

            <footer className="flex-shrink-0 p-4 border-t border-gray-100 flex gap-3 bg-gray-50/50">
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