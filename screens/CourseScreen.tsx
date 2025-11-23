import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import NewSessionModal from '../components/NewSessionModal';
import { Session, UserRole, Course, Student, User } from '../types';
import {
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addWeeks,
    subWeeks,
    format,
    isSameDay,
    isToday,
    parseISO,
    isValid,
    differenceInDays,
    isPast,
    isFuture,
    parse
} from 'date-fns';
import { vi } from 'date-fns/locale';

// --- HELPERS ---
const safeParseDate = (dateString: string | undefined | null): Date | null => {
    if (!dateString) return null;

    // 1. Thử parse ISO chuẩn (YYYY-MM-DD)
    let date = parseISO(dateString);
    if (isValid(date)) return date;
    
    // 2. Thử parse định dạng Việt Nam (dd/MM/yyyy)
    // date-fns parse(dateString, formatString, referenceDate)
    date = parse(dateString, 'dd/MM/yyyy', new Date());
    if (isValid(date)) return date;

    // 3. Thử parse định dạng Việt Nam khác (d/M/yyyy)
    date = parse(dateString, 'd/M/yyyy', new Date());
    if (isValid(date)) return date;

    // 4. Fallback: new Date()
    date = new Date(dateString);
    if (isValid(date)) return date;

    return null;
};

const parseTimestamp = (ts: number | string | any): Date => {
    if (typeof ts === 'number') return new Date(ts);
    if (ts && typeof ts.toDate === 'function') return ts.toDate();
    return new Date();
};

// --- COMPONENTS: COURSE TAB ---

const CourseCard: React.FC<{ 
    course: Course; 
    studentCount: number; 
    onClick: (c: Course) => void; 
}> = ({ course, studentCount, onClick }) => {
    const startDate = safeParseDate(course.startDate);
    const endDate = safeParseDate(course.endDate);
    const today = new Date();
    
    let progress = 0;
    let statusText = 'Chưa xác định';
    let statusColor = 'bg-gray-100 text-gray-600';
    let dateRangeText = 'Thời gian: Chưa cập nhật';

    if (startDate && endDate) {
        dateRangeText = `${format(startDate, 'dd/MM/yy')} - ${format(endDate, 'dd/MM/yy')}`;
        
        const totalDays = differenceInDays(endDate, startDate);
        const daysPassed = differenceInDays(today, startDate);
        
        if (isFuture(startDate)) {
            progress = 0;
            statusText = 'Sắp mở';
            statusColor = 'bg-yellow-100 text-yellow-700';
        } else if (isPast(endDate) || isSameDay(today, endDate)) {
            progress = 100;
            statusText = 'Đã hoàn thành';
            statusColor = 'bg-gray-800 text-white';
        } else {
            progress = totalDays > 0 ? Math.min(100, Math.max(0, (daysPassed / totalDays) * 100)) : 0;
            statusText = 'Đang chạy';
            statusColor = 'bg-green-100 text-green-700';
        }
    } else {
         statusText = 'Chưa có lịch';
    }

    return (
        <div onClick={() => onClick(course)} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative overflow-hidden group cursor-pointer active:scale-98 transition-transform">
            <div className={`absolute top-0 left-0 bottom-0 w-1 ${progress === 100 ? 'bg-gray-600' : 'bg-blue-500'}`}></div>
            <div className="pl-3">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-gray-800">{course.name}</h3>
                        <span className="text-xs text-gray-500">K{course.courseNumber}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor}`}>{statusText}</span>
                </div>
                
                {/* Progress Bar */}
                {startDate && endDate && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                        <div className={`h-full rounded-full ${progress === 100 ? 'bg-gray-600' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                )}

                <div className="flex justify-between text-xs text-gray-500">
                    <span>{dateRangeText}</span>
                    <span className="font-semibold text-gray-700">{studentCount} học viên</span>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: COURSE DETAIL MODAL (XEM CHI TIẾT) ---
const CourseDetailModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    course: Course | null; 
    students: Student[]; 
    users: User[]; 
}> = ({ isOpen, onClose, course, students, users }) => {
    if (!isOpen || !course) return null;

    const teachers = users.filter(u => u.role === UserRole.TEACHER && u.courseIds?.includes(course.id));
    const teamLeaders = users.filter(u => u.role === UserRole.TEAM_LEADER && u.courseIds?.includes(course.id));

    const courseStudents = students.filter(s => s.courseId === course.id);
    const groupedStudents = courseStudents.reduce((acc, student) => {
        const groupName = student.group || 'Chưa phân nhóm';
        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push(student);
        return acc;
    }, {} as Record<string, Student[]>);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">{course.name}</h3>
                        <p className="text-xs text-gray-500">K{course.courseNumber} • {courseStudents.length} học viên</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500">✕</button>
                </div>
                
                <div className="p-5 overflow-y-auto space-y-6 custom-scrollbar">
                    
                    {/* Danh sách Giáo viên */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wide flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                            Giáo viên phụ trách
                        </h4>
                        {teachers.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {teachers.map(t => (
                                    <div key={t.id} className="flex items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                                        <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold mr-3 text-xs">GV</div>
                                        <div>
                                            <p className="font-semibold text-sm text-gray-800">{t.name}</p>
                                            <p className="text-xs text-gray-500">{t.phone}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-xs text-gray-400 italic pl-2">Chưa cập nhật giáo viên</p>}
                    </div>

                    {/* Danh sách Nhóm trưởng */}
                    <div className="space-y-2">
                         <h4 className="text-sm font-bold text-purple-800 uppercase tracking-wide flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            Nhóm trưởng
                        </h4>
                        {teamLeaders.length > 0 ? (
                             <div className="flex flex-wrap gap-2">
                                {teamLeaders.map(l => (
                                    <div key={l.id} className="flex items-center space-x-2 px-3 py-1.5 bg-purple-50 text-purple-800 rounded-lg border border-purple-100">
                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                        <span className="font-medium text-sm">{l.name}</span>
                                    </div>
                                ))}
                             </div>
                        ) : <p className="text-xs text-gray-400 italic pl-2">Chưa có nhóm trưởng</p>}
                    </div>

                    {/* Danh sách Học viên */}
                    <div className="space-y-4 pt-2 border-t">
                         <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            Danh sách Học viên
                        </h4>
                        {Object.keys(groupedStudents).length > 0 ? Object.entries(groupedStudents).map(([groupName, groupStudents]) => (
                            <div key={groupName} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <h5 className="font-bold text-sm text-gray-700 mb-2 flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                                    Nhóm: {groupName}
                                    <span className="ml-auto text-xs font-normal bg-white px-2 py-0.5 rounded-full border text-gray-500">{groupStudents.length} HV</span>
                                </h5>
                                <div className="space-y-1 pl-4 border-l-2 border-gray-200">
                                    {groupStudents.map(s => (
                                        <div key={s.id} className="text-sm text-gray-600 py-1 border-b border-gray-100 last:border-0">
                                            {s.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-400 text-sm py-4 bg-gray-50 rounded-lg">Chưa có học viên nào</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN SCREEN ---

const CourseScreen: React.FC = () => {
    const { 
        sessions, courses, students, users, currentUser, 
        addSession, updateSession, deleteSession,
        addCourse, updateCourse, deleteCourse
    } = useContext(AppContext)!;

    const [activeTab, setActiveTab] = useState<'schedule' | 'courses'>('schedule');
    
    // States for Schedule
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [scheduleFilter, setScheduleFilter] = useState<'all' | 'mine' | 'created_teacher' | 'created_leader'>('all');

    // States for Courses
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [courseSearch, setCourseSearch] = useState('');

    const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
    const canEditSession = (s: Session) => isAdmin || s.teacherId === currentUser?.id || s.creatorId === currentUser?.id;

    // --- LOGIC: SCHEDULE ---
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weeklySessions = useMemo(() => {
        let filtered = sessions.filter(session => {
            const date = parseTimestamp(session.startTimestamp);
            return date >= weekStart && date <= weekEnd;
        });
        
        if (scheduleFilter === 'mine') {
            filtered = filtered.filter(s => s.teacherId === currentUser?.id || s.creatorId === currentUser?.id);
        } else if (scheduleFilter === 'created_teacher') {
            filtered = filtered.filter(s => s.createdBy === 'teacher');
        } else if (scheduleFilter === 'created_leader') {
            filtered = filtered.filter(s => s.createdBy === 'team_leader');
        }
        
        return filtered.sort((a, b) => a.startTimestamp - b.startTimestamp);
    }, [sessions, weekStart, weekEnd, scheduleFilter, currentUser]);

    // --- LOGIC: COURSES ---
    const filteredCourses = useMemo(() => {
        let result = [...courses];
        if (courseSearch) {
            result = result.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()));
        }
        return result.sort((a, b) => {
            const dateA = safeParseDate(a.startDate)?.getTime() || 0;
            const dateB = safeParseDate(b.startDate)?.getTime() || 0;
            return dateB - dateA;
        });
    }, [courses, courseSearch]);

    const getUserName = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user ? user.name : 'Không rõ';
    };

    // --- HANDLERS ---
    const handleSaveSession = async (data: any) => {
        try {
            if (editingSession) await updateSession({ ...editingSession, ...data });
            else await addSession({ 
                ...data, 
                createdBy: currentUser?.role === UserRole.TEACHER ? 'teacher' : 'team_leader', 
                creatorId: currentUser?.id 
            });
            setIsSessionModalOpen(false);
        } catch (e) { alert('Lỗi lưu buổi học'); }
    };

    return (
        <div className="pb-24 bg-gray-50 min-h-screen font-sans">
            {/* --- HEADER & TABS --- */}
            <div className="bg-white shadow-sm sticky top-0 z-20">
                <div className="flex border-b">
                    <button 
                        onClick={() => setActiveTab('schedule')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                    >
                        Lịch dạy & Điểm danh
                    </button>
                    <button 
                        onClick={() => setActiveTab('courses')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'courses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                    >
                        Danh sách Khóa học
                    </button>
                </div>

                {/* --- SUB HEADER: SCHEDULE --- */}
                {activeTab === 'schedule' && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 bg-gray-50 border-b gap-2">
                        <div className="flex items-center justify-between w-full sm:w-auto">
                            <button onClick={() => setSelectedDate(subWeeks(selectedDate, 1))} className="p-1 rounded-full hover:bg-white"><svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                            <div className="text-center px-4 cursor-pointer" onClick={() => setSelectedDate(new Date())}>
                                <p className="text-xs font-bold text-gray-800">Tuần {format(weekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM')}</p>
                                {!isSameDay(selectedDate, new Date()) && <p className="text-[10px] text-blue-600">Về hôm nay</p>}
                            </div>
                            <button onClick={() => setSelectedDate(addWeeks(selectedDate, 1))} className="p-1 rounded-full hover:bg-white"><svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                        </div>
                        
                        <div className="flex gap-1 overflow-x-auto no-scrollbar justify-center w-full sm:w-auto pb-1 sm:pb-0">
                            {isAdmin && (
                                <>
                                    <button onClick={() => setScheduleFilter('all')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${scheduleFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                        Tất cả
                                    </button>
                                    <button onClick={() => setScheduleFilter('created_leader')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${scheduleFilter === 'created_leader' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50'}`}>
                                        Nhóm trưởng
                                    </button>
                                    <button onClick={() => setScheduleFilter('created_teacher')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${scheduleFilter === 'created_teacher' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50'}`}>
                                        Giáo viên
                                    </button>
                                </>
                            )}

                            {!isAdmin && (
                                <button onClick={() => setScheduleFilter(prev => prev === 'mine' ? 'all' : 'mine')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${scheduleFilter === 'mine' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200'}`}>
                                    {scheduleFilter === 'mine' ? 'Của tôi' : 'Tất cả'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* --- SUB HEADER: COURSES --- */}
                {activeTab === 'courses' && (
                    <div className="p-3 bg-gray-50 border-b">
                        <input type="text" placeholder="Tìm kiếm khóa học..." value={courseSearch} onChange={e => setCourseSearch(e.target.value)} className="w-full p-2 text-sm border rounded-lg bg-white" />
                    </div>
                )}
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="p-4">
                {activeTab === 'schedule' ? (
                    // VIEW: TIMELINE
                    <div className="space-y-6">
                        {daysInWeek.map((day, idx) => {
                            const dailySessions = weeklySessions.filter(s => isSameDay(parseTimestamp(s.startTimestamp), day));
                            return (
                                <div key={idx} className="flex gap-3">
                                    <div className="flex flex-col items-center w-12 pt-1">
                                        <span className={`text-[10px] font-bold uppercase ${isToday(day) ? 'text-blue-600' : 'text-gray-400'}`}>{format(day, 'EEE', {locale: vi})}</span>
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${isToday(day) ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>{format(day, 'dd')}</div>
                                        {idx < 6 && <div className="w-0.5 h-full bg-gray-200 mt-2"></div>}
                                    </div>
                                    <div className="flex-1 space-y-2 pb-2">
                                        {dailySessions.length > 0 ? dailySessions.map(session => {
                                            const isTeamLeaderCreated = session.createdBy === 'team_leader';
                                            const cardBorderColor = isTeamLeaderCreated ? 'border-purple-300 bg-purple-50' : 'border-gray-100 bg-white';
                                            const leftBarColor = isTeamLeaderCreated 
                                                ? 'bg-purple-500' 
                                                : (session.type === 'Thực hành' ? 'bg-orange-400' : 'bg-indigo-500');
                                            const creatorName = getUserName(session.creatorId);
                                            
                                            return (
                                                <div key={session.id} onClick={() => canEditSession(session) && [setEditingSession(session), setIsSessionModalOpen(true)]} className={`p-3 rounded-lg shadow-sm border relative overflow-hidden ${cardBorderColor}`}>
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${leftBarColor}`}></div>
                                                    <div className="pl-2">
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="font-bold text-gray-500">{format(parseTimestamp(session.startTimestamp), 'HH:mm')} - {format(parseTimestamp(session.endTimestamp), 'HH:mm')}</span>
                                                            <div className="flex space-x-1">
                                                                <span className={`px-1.5 rounded text-[10px] ${session.type === 'Thực hành' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>{session.type}</span>
                                                                {isTeamLeaderCreated && <span className="px-1.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold">Nhóm trưởng</span>}
                                                            </div>
                                                        </div>
                                                        <h4 className="font-bold text-sm text-gray-800">{courses.find(c => c.id === session.courseId)?.name}</h4>
                                                        <p className="text-xs text-gray-600 line-clamp-1">{session.content}</p>
                                                        <div className="flex justify-between items-end mt-2 border-t border-dashed border-gray-200 pt-2">
                                                            <div className="text-[10px] text-gray-400 flex items-center">
                                                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                                {session.studentIds?.length || 0} học viên
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 italic">
                                                                Tạo bởi: <span className="font-semibold">{creatorName}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }) : <div className="h-10 border-2 border-dashed border-gray-100 rounded flex items-center justify-center text-xs text-gray-300">Trống</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // VIEW: COURSE LIST
                    <div className="space-y-3">
                        {filteredCourses.map(course => (
                            <CourseCard 
                                key={course.id} 
                                course={course} 
                                studentCount={students.filter(s => s.courseId === course.id).length}
                                onClick={(c) => setSelectedCourse(c)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* --- FAB --- */}
            {activeTab === 'schedule' && (
                <button 
                    onClick={() => { setEditingSession(null); setIsSessionModalOpen(true); }}
                    className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-500/40 active:scale-90 transition-transform z-30"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
            )}

            {/* --- MODALS --- */}
            <NewSessionModal 
                isOpen={isSessionModalOpen} 
                onClose={() => setIsSessionModalOpen(false)} 
                onSave={handleSaveSession}
                onDelete={editingSession ? () => [deleteSession(editingSession.id), setIsSessionModalOpen(false)] : undefined}
                initialData={editingSession}
                courses={courses}
                students={students}
                currentUser={currentUser}
            />
            
            {/* Modal Xem Chi Tiết Khóa Học */}
            <CourseDetailModal 
                isOpen={!!selectedCourse} 
                onClose={() => setSelectedCourse(null)} 
                course={selectedCourse} 
                students={students} 
                users={users} 
            />
        </div>
    );
};

export default CourseScreen;
