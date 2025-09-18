import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import NewSessionModal from '../components/NewSessionModal';
import { Session, UserRole } from '../types';

// === THAY ĐỔI QUAN TRỌNG NHẤT: Sửa lại hàm toDate() để đọc được định dạng DD/MM/YYYY ===
const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') {
        return value.toDate(); // Xử lý Timestamp của Firestore
    }
    if (typeof value === 'string') {
        // Thử xử lý định dạng 'YYYY-MM-DD' (chuẩn)
        let date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date;
        }
        
        // Thử xử lý định dạng 'DD/MM/YYYY' (phổ biến ở Việt Nam)
        const parts = value.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts.map(Number);
            // new Date(year, month - 1, day) là cách an toàn để tạo ngày
            date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    }
    if (typeof value === 'number') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date;
    }
    return null;
};


const InfoCard: React.FC<{ title: string; value: number | string; color: string }> = ({ title, value, color }) => (
    <div className={`p-4 rounded-lg shadow-md text-center ${color}`}>
        <p className="text-3xl md:text-4xl font-bold">{value}</p>
        <p className="text-sm font-medium mt-1">{title}</p>
    </div>
);

const CourseScreen: React.FC = () => {
    const context = useContext(AppContext);
    const currentYear = new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!context) {
        return <div className="p-6 text-center">Đang tải dữ liệu...</div>;
    }

    const { currentUser, courses, users, students, sessions } = context;

    const activeSessionsInMonth = useMemo(() => {
        if (!sessions) return [];
        return sessions.filter(session => {
            const sessionDate = session.startTimestamp ? new Date(session.startTimestamp) : toDate((session as any).date);
            if (!sessionDate) return false;
            
            return sessionDate.getFullYear() === selectedYear && sessionDate.getMonth() + 1 === selectedMonth;
        }).sort((a, b) => (a.startTimestamp || 0) - (b.startTimestamp || 0));
    }, [sessions, selectedMonth, selectedYear]);

    // Logic này bây giờ sẽ hoạt động chính xác nhờ hàm toDate() đã được sửa
    const activeCoursesInMonth = useMemo(() => {
        if (!courses) return [];
        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
        return courses.filter(course => {
            const courseStart = toDate(course.startDate);
            const courseEnd = toDate(course.endDate);
            if (!courseStart || !courseEnd) return false;
            return courseStart <= endOfMonth && courseEnd >= startOfMonth;
        });
    }, [courses, selectedMonth, selectedYear]);
    
    const monthlyStats = useMemo(() => {
        const activeCourseIds = new Set(activeCoursesInMonth.map(c => c.id));
        const totalStudentsInMonth = (students || []).filter(s => s.courseId && activeCourseIds.has(s.courseId)).length;
        const activeTeacherIds = new Set<string>();
        (users || []).forEach(user => {
            if(user.role === UserRole.TEACHER) {
                const isAssignedToActiveClass = (user.courseIds || []).some(courseId => activeCourseIds.has(courseId));
                if (isAssignedToActiveClass) { activeTeacherIds.add(user.id); }
            }
        });
        return {
            totalCoursesInMonth: activeCoursesInMonth.length,
            totalTeachersInMonth: activeTeacherIds.size,
            totalStudentsInMonth,
            totalSessionsInMonth: activeSessionsInMonth.length
        };
    }, [activeCoursesInMonth, students, users, activeSessionsInMonth]);
    
    const getCourseDisplayString = (courseId: string) => {
        const course = (courses || []).find(c => c?.id === courseId);
        return course ? `${course.name ?? 'Lỗi tên'} - Khóa ${course.courseNumber ?? '?'}` : 'N/A';
    };

    const getTeacherName = (teacherId: string) => {
        const teacher = (users || []).find(u => u.id === teacherId);
        return teacher ? teacher.name : 'N/A';
    };

    const getCreatorInfo = (session: Session) => {
        if (!session.creatorId) return 'N/A';
        const creator = (users || []).find(u => u.id === session.creatorId);
        if (!creator) return 'Người dùng không tồn tại';

        const roleDisplay = session.createdBy === 'team_leader' ? ' (NT)' : ' (GV)';
        return `${creator.name}${roleDisplay}`;
    };
    
    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
    const canViewFullCourseScreen = currentUser && currentUser.role !== UserRole.TEAM_LEADER;

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                 <h1 className="text-2xl font-bold text-gray-800">
                    {canViewFullCourseScreen ? "Thông tin khoá đào tạo" : "Chức năng Nhóm trưởng"}
                </h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
                >
                    + Thêm buổi học
                </button>
            </div>
            
            {canViewFullCourseScreen && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                        <InfoCard title="Tổng số khoá" value={monthlyStats.totalCoursesInMonth} color="bg-purple-100 text-purple-800" />
                        <InfoCard title="Tổng số giáo viên" value={monthlyStats.totalTeachersInMonth} color="bg-blue-100 text-blue-800" />
                        <InfoCard title="Tổng số học viên" value={monthlyStats.totalStudentsInMonth} color="bg-green-100 text-green-800" />
                        <InfoCard title="Số buổi đã học" value={monthlyStats.totalSessionsInMonth} color="bg-orange-100 text-orange-800" />
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg mb-8">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                            <h2 className="text-xl font-bold text-gray-700 flex-shrink-0">
                                Các khoá triển khai
                            </h2>
                            <div className="flex items-center space-x-2 w-full md:w-auto md:space-x-4">
                                <select id="year-select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                                    {yearOptions.map(year => <option key={year} value={year}>Năm {year}</option>)}
                                </select>
                                <select id="month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => <option key={month} value={month}>Tháng {month}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-700 mb-4">
                    Triển khai lịch đào tạo (Thực tế)
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-3 font-semibold text-gray-600 uppercase text-sm">Thứ/Ngày</th>
                                <th className="p-3 font-semibold text-gray-600 uppercase text-sm">Thời gian</th>
                                <th className="p-3 font-semibold text-gray-600 uppercase text-sm">Nội dung</th>
                                <th className="p-3 font-semibold text-gray-600 uppercase text-sm">Khóa học</th>
                                <th className="p-3 font-semibold text-gray-600 uppercase text-sm">Loại</th>
                                <th className="p-3 font-semibold text-gray-600 uppercase text-sm">GV Phụ trách</th>
                                <th className="p-3 font-semibold text-gray-600 uppercase text-sm">Người tạo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeSessionsInMonth.length > 0 ? (
                                activeSessionsInMonth.map((session) => {
                                    const sessionDate = session.startTimestamp ? new Date(session.startTimestamp) : toDate((session as any).date);
                                    const displayDate = sessionDate ? sessionDate.toLocaleDateString('vi-VN') : 'N/A';
                                    
                                    const startTime = session.startTimestamp ? new Date(session.startTimestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : (session as any).startTime || '-';
                                    const endTime = session.endTimestamp ? new Date(session.endTimestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : (session as any).endTime || '-';
                                    const displayTime = session.startTimestamp ? `${startTime} - ${endTime}` : startTime;

                                    return (
                                        <tr key={session.id} className="border-b hover:bg-gray-50 transition-colors">
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
                                <tr>
                                    <td colSpan={7} className="text-center p-8 text-gray-500">
                                        Không có buổi học nào trong tháng {selectedMonth}/{selectedYear}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <NewSessionModal onClose={() => setIsModalOpen(false)} />
            )}
        </div>
    );
};

export default CourseScreen;