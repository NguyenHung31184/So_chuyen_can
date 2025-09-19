import React, { useState, useContext, useMemo } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';
import NewSessionModal from '../components/NewSessionModal';
import { Session, UserRole, Course, Student, User } from '../types';
import {
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    add,
    sub,
    format,
    isSameDay,
    isToday,
    parseISO,
    isValid
} from 'date-fns';
import { vi } from 'date-fns/locale';

// --- Hàm toDate (Giữ nguyên) ---
const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        if (isValid(date)) return date;
        if (typeof value === 'string' && value.includes('/')) {
            const parts = value.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts.map(Number);
                const d = new Date(year, month - 1, day);
                if (isValid(d)) return d;
            }
        }
    }
    return null;
};

// --- Card thống kê (Giữ nguyên) ---
const StatCard: React.FC<{ title: string; value: string | number; icon: JSX.Element; color: string }> = ({ title, value, icon, color }) => (
    <div className={`p-5 rounded-xl shadow-lg flex items-center space-x-4 ${color}`}>
        <div className="p-3 rounded-full bg-white/30">{icon}</div>
        <div>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-white/90 text-sm">{title}</p>
        </div>
    </div>
);

// --- UPDATED: SessionCard được cập nhật để hiển thị Người tạo ---
const SessionCard: React.FC<{ session: Session; course?: Course; teacher?: User; creator?: User }> = ({ session, course, teacher, creator }) => {
    const creatorRole = session.createdBy === 'team_leader' ? 'NT' : 'GV';

    return (
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
            {/* Phần thông tin chính */}
            <div className="flex-grow">
                <p className="font-bold text-sm text-gray-800">{session.content}</p>
                <p className="text-xs text-gray-600 mt-1">{course?.name || 'N/A'}</p>
                <p className="text-xs text-gray-500 mt-1">GV: {teacher?.name || 'N/A'}</p>
            </div>

            {/* Phần thông tin cuối card (footer) */}
            <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-sm text-indigo-600 font-semibold text-center mb-1">
                    {`${format(new Date(session.startTimestamp), 'HH:mm')} - ${format(new Date(session.endTimestamp), 'HH:mm')}`}
                </p>
                {creator && (
                    <p className="text-xs text-gray-400 text-center truncate" title={`Tạo bởi: ${creator.name} (${creatorRole})`}>
                        Tạo bởi: {creator.name} ({creatorRole})
                    </p>
                )}
            </div>
        </div>
    );
};


const CourseScreen: React.FC = () => {
    const context = useContext(AppContext);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!context) return <div className="p-6 text-center">Đang tải dữ liệu...</div>;
    const { currentUser, courses, users, students, sessions, addSession } = context as AppContextType;

    // --- Logic (giữ nguyên) ---
    const activeCoursesInMonth = useMemo(() => {
        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
        return courses.filter(course => {
            const courseStart = toDate(course.startDate);
            const courseEnd = toDate(course.endDate);
            return courseStart && courseEnd && courseStart <= endOfMonth && courseEnd >= startOfMonth;
        });
    }, [courses, selectedMonth, selectedYear]);

    const monthlyStats = useMemo(() => {
        const activeCourseIds = new Set(activeCoursesInMonth.map(c => c.id));
        const totalStudents = students.filter(s => s.courseId && activeCourseIds.has(s.courseId)).length;
        const totalTeachers = users.filter(u => u.role === UserRole.TEACHER && u.courseIds?.some(id => activeCourseIds.has(id))).length;
        const totalSessionsInMonth = sessions.filter(s => {
            const sessionDate = s.startTimestamp ? new Date(s.startTimestamp) : toDate((s as any).date);
            return sessionDate && sessionDate.getFullYear() === selectedYear && sessionDate.getMonth() + 1 === selectedMonth;
        }).length;
        return { totalCourses: activeCoursesInMonth.length, totalTeachers, totalStudents, totalSessions: totalSessionsInMonth };
    }, [activeCoursesInMonth, students, users, sessions, selectedMonth, selectedYear]);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const sessionsInWeek = useMemo(() => {
        return (sessions || []).filter(session => {
            if (!session.startTimestamp) return false;
            const sessionDate = new Date(session.startTimestamp);
            return sessionDate >= weekStart && sessionDate <= weekEnd;
        }).sort((a, b) => a.startTimestamp - b.startTimestamp);
    }, [sessions, weekStart, weekEnd]);

    const yearOptions = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-gray-100 min-h-screen">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Thông tin Khoá đào tạo</h1>
                <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-lg shadow-md">+ Thêm buổi học</button>
            </header>

            {/* Thống kê & Các khóa triển khai (giữ nguyên) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Khóa học trong tháng" value={monthlyStats.totalCourses} color="bg-gradient-to-br from-sky-500 to-sky-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422A12.083 12.083 0 0112 21a12.083 12.083 0 01-6.16-10.422L12 14z" /></svg>} />
                <StatCard title="Giáo viên hoạt động" value={monthlyStats.totalTeachers} color="bg-gradient-to-br from-indigo-500 to-indigo-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                <StatCard title="Học viên trong tháng" value={monthlyStats.totalStudents} color="bg-gradient-to-br from-emerald-500 to-emerald-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>} />
                <StatCard title="Buổi học trong tháng" value={monthlyStats.totalSessions} color="bg-gradient-to-br from-amber-500 to-amber-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg mb-8">
                 <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-gray-700">Các khoá triển khai</h2>
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                        <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md">
                            {yearOptions.map(year => <option key={year} value={year}>Năm {year}</option>)}
                        </select>
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => <option key={month} value={month}>Tháng {month}</option>)}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead><tr className="bg-gray-50"><th className="p-3 font-semibold text-gray-600 text-sm">Tên khóa học</th><th className="p-3 font-semibold text-gray-600 text-sm">Bắt đầu</th><th className="p-3 font-semibold text-gray-600 text-sm">Kết thúc</th></tr></thead>
                        <tbody>
                            {activeCoursesInMonth.length > 0 ? ( activeCoursesInMonth.map(course => (
                                <tr key={course.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-800">{course.name} - Khóa {course.courseNumber}</td>
                                    <td className="p-3 text-sm">{format(toDate(course.startDate)!, 'dd/MM/yyyy')}</td>
                                    <td className="p-3 text-sm">{format(toDate(course.endDate)!, 'dd/MM/yyyy')}</td>
                                </tr>
                            ))) : ( <tr><td colSpan={3} className="text-center p-8 text-gray-500">Không có khóa học nào trong tháng.</td></tr> )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Lịch tuần (đã được cập nhật) */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-700">Lịch đào tạo theo tuần (Thực tế)</h2>
                        <p className="text-gray-500 font-medium">{format(weekStart, 'dd/MM/yyyy')} - {format(weekEnd, 'dd/MM/yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentDate(sub(currentDate, { weeks: 1 }))} className="px-3 py-2 border rounded-md hover:bg-gray-100">{"<"}</button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 border rounded-md hover:bg-gray-100">Hôm nay</button>
                        <button onClick={() => setCurrentDate(add(currentDate, { weeks: 1 }))} className="px-3 py-2 border rounded-md hover:bg-gray-100">{">"}</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
                    {daysInWeek.map(day => {
                        const sessionsForDay = sessionsInWeek.filter(session => isSameDay(new Date(session.startTimestamp), day));
                        const isCurrentDay = isToday(day);
                        return (
                            <div key={day.toISOString()} className={`rounded-lg p-3 ${isCurrentDay ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                                <div className={`text-center mb-3 pb-2 border-b-2 ${isCurrentDay ? 'border-indigo-400' : 'border-gray-200'}`}>
                                    <p className={`font-semibold text-sm ${isCurrentDay ? 'text-indigo-700' : 'text-gray-700'}`}>{format(day, 'eee', { locale: vi })}</p>
                                    <p className={`font-bold text-lg ${isCurrentDay ? 'text-indigo-700' : 'text-gray-800'}`}>{format(day, 'dd')}</p>
                                </div>
                                <div className="space-y-3">
                                    {sessionsForDay.length > 0 ? sessionsForDay.map(session => (
                                        <SessionCard 
                                            key={session.id} 
                                            session={session}
                                            course={courses.find(c => c.id === session.courseId)}
                                            teacher={users.find(u => u.id === session.teacherId)}
                                            creator={users.find(u => u.id === session.creatorId)} // Truyền thông tin người tạo vào
                                        />
                                    )) : <div className="text-center text-xs text-gray-400 pt-4">Không có lịch</div>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {isModalOpen && <NewSessionModal onClose={() => setIsModalOpen(false)} onSave={(s) => { addSession(s); setIsModalOpen(false); }} />}
        </div>
    );
};

export default CourseScreen;
