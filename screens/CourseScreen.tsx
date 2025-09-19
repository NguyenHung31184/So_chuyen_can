import React, { useState, useContext, useMemo } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';
import NewSessionModal from '../components/NewSessionModal';
import { Session, UserRole, Course, Student, User, SessionType } from '../types';
import { parseISO, format, isValid } from 'date-fns';

// --- Card thống kê (giữ nguyên) ---
const StatCard: React.FC<{ title: string; value: string | number; icon: JSX.Element; color: string }> = ({ title, value, icon, color }) => (
    <div className={`p-5 rounded-xl shadow-lg flex items-center space-x-4 ${color}`}>
        <div className="p-3 rounded-full bg-white/30">{icon}</div>
        <div>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-white/90 text-sm">{title}</p>
        </div>
    </div>
);

// --- FIXED: Khôi phục lại hàm toDate để xử lý dữ liệu cũ ---
const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate(); // Firestore Timestamp
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        if (isValid(date)) return date;
        // Xử lý định dạng DD/MM/YYYY
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


const CourseScreen: React.FC = () => {
    const context = useContext(AppContext);
    const currentYear = new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!context) return <div className="p-6 text-center">Đang tải dữ liệu...</div>;
    const { currentUser, courses, users, students, sessions, addSession } = context as AppContextType;

    // --- LOGIC (giữ nguyên, đã được kiểm tra lại) ---
    const activeSessionsInMonth = useMemo(() => {
        return (sessions || []).filter(session => {
            const sessionDate = session.startTimestamp ? new Date(session.startTimestamp) : toDate((session as any).date);
            return sessionDate && sessionDate.getFullYear() === selectedYear && sessionDate.getMonth() + 1 === selectedMonth;
        }).sort((a, b) => (b.startTimestamp || 0) - (a.startTimestamp || 0));
    }, [sessions, selectedMonth, selectedYear]);

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
        return {
            totalCourses: activeCoursesInMonth.length,
            totalTeachers,
            totalStudents,
            totalSessions: activeSessionsInMonth.length
        };
    }, [activeCoursesInMonth, students, users, activeSessionsInMonth]);
    
    const getCourseDisplayString = (courseId: string) => courses.find(c => c.id === courseId)?.name || 'N/A';
    const getTeacherName = (teacherId: string) => users.find(u => u.id === teacherId)?.name || 'N/A';
    const getCreatorInfo = (session: Session) => {
        const creator = users.find(u => u.id === session.creatorId);
        if (!creator) return 'N/A';
        const role = session.createdBy === 'team_leader' ? '(NT)' : '(GV)';
        return `${creator.name} ${role}`;
    };
    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-gray-100 min-h-screen">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Thông tin Khoá đào tạo</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-lg shadow-md"
                >
                    + Thêm buổi học
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Khóa học trong tháng" value={monthlyStats.totalCourses} color="bg-gradient-to-br from-sky-500 to-sky-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422A12.083 12.083 0 0112 21a12.083 12.083 0 01-6.16-10.422L12 14z" /></svg>} />
                <StatCard title="Giáo viên hoạt động" value={monthlyStats.totalTeachers} color="bg-gradient-to-br from-indigo-500 to-indigo-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                <StatCard title="Học viên trong tháng" value={monthlyStats.totalStudents} color="bg-gradient-to-br from-emerald-500 to-emerald-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>} />
                <StatCard title="Buổi học trong tháng" value={monthlyStats.totalSessions} color="bg-gradient-to-br from-amber-500 to-amber-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg mb-8">
                {/* ... Các khóa triển khai và bộ lọc ... */}
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Triển khai lịch đào tạo (Thực tế)</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                {['Thứ/Ngày', 'Thời gian', 'Nội dung', 'Khóa học', 'Loại', 'GV Phụ trách', 'Người tạo'].map(h=><th key={h} className="p-3 font-semibold text-gray-600 text-sm uppercase">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {activeSessionsInMonth.length > 0 ? (
                                activeSessionsInMonth.map((session) => {
                                    // --- LOGIC GỐC ĐÃ ĐƯỢC KHÔI PHỤC ---
                                    const sessionDate = session.startTimestamp ? new Date(session.startTimestamp) : toDate((session as any).date);
                                    const displayDate = sessionDate ? sessionDate.toLocaleDateString('vi-VN') : 'N/A';
                                    
                                    const startTime = session.startTimestamp ? new Date(session.startTimestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : (session as any).startTime || '-';
                                    const endTime = session.endTimestamp ? new Date(session.endTimestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : (session as any).endTime || '-';
                                    const displayTime = session.startTimestamp ? `${startTime} - ${endTime}` : startTime;

                                    return (
                                        <tr key={session.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 text-sm">{displayDate}</td>
                                            <td className="p-3 text-sm">{displayTime}</td>
                                            <td className="p-3 font-medium text-gray-800 text-sm">{session.content || (session as any).topic}</td>
                                            <td className="p-3 text-sm">{getCourseDisplayString(session.courseId)}</td>
                                            <td className="p-3 text-sm">{session.type}</td>
                                            <td className="p-3 text-sm">{getTeacherName(session.teacherId)}</td>
                                            <td className="p-3 text-sm">{getCreatorInfo(session)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={7} className="text-center p-8 text-gray-500">Không có buổi học nào trong tháng {selectedMonth}/{selectedYear}.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && <NewSessionModal onClose={() => setIsModalOpen(false)} onSave={(s) => { addSession(s); setIsModalOpen(false); }} />}
        </div>
    );
};

export default CourseScreen;
