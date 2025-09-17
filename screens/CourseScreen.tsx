import React, { useState, useContext, useMemo } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';
import NewSessionModal from '../components/NewSessionModal';
import { Session, UserRole } from '../types';

// --- LOGIC CỦA BẠN ĐƯỢC GIỮ NGUYÊN ---
const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') {
        return value.toDate();
    }
    if (typeof value === 'string') {
        let date: Date | null = null;
        const partsSlash = value.split('/');
        if (partsSlash.length === 3) {
            const [day, month, year] = partsSlash.map(Number);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                date = new Date(year, month - 1, day);
            }
        }
        if (!date || isNaN(date.getTime())) {
            date = new Date(value);
        }
        if (date && !isNaN(date.getTime())) {
            return date;
        }
    }
    if (typeof value === 'number') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date;
        }
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

    const { currentUser, courses, users, students, sessions, addSession } = context as AppContextType;

    const handleAddSession = (session: Omit<Session, 'id'>) => {
        addSession(session);
        setIsModalOpen(false);
    };
    
    const teachers = useMemo(() => (users || []).filter(u => u.role === UserRole.TEACHER), [users]);

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
        const activeSessionsInMonth = (sessions || []).filter(session => {
            const sessionDate = toDate(session.date);
            if (!sessionDate) return false;
            return sessionDate.getFullYear() === selectedYear &&
                   sessionDate.getMonth() + 1 === selectedMonth &&
                   activeCourseIds.has(session.courseId);
        });
        const totalStudentsInMonth = (students || []).filter(s => s.courseId && activeCourseIds.has(s.courseId)).length;
        const activeTeacherIds = new Set<string>();
        (teachers || []).forEach(teacher => {
            const isAssignedToActiveClass = (teacher.courseIds || []).some(courseId => activeCourseIds.has(courseId));
            if (isAssignedToActiveClass) { activeTeacherIds.add(teacher.id); }
        });
        return {
            totalCoursesInMonth: activeCoursesInMonth.length,
            totalTeachersInMonth: activeTeacherIds.size,
            totalStudentsInMonth,
            totalSessionsInMonth: activeSessionsInMonth.length
        };
    }, [activeCoursesInMonth, students, teachers, sessions, selectedMonth, selectedYear]);

    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
    const canViewFullCourseScreen = currentUser && currentUser.role !== UserRole.GROUP_LEADER;

    // --- PHẦN GIAO DIỆN (JSX) ĐÃ ĐƯỢC TỐI ƯU HÓA ---
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
                    {/* === CÁC THẺ THỐNG KÊ (ĐÃ RESPONSIVE SẴN) === */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                        <InfoCard title="Tổng số khoá" value={monthlyStats.totalCoursesInMonth} color="bg-purple-100 text-purple-800" />
                        <InfoCard title="Tổng số giáo viên" value={monthlyStats.totalTeachersInMonth} color="bg-blue-100 text-blue-800" />
                        <InfoCard title="Tổng số học viên" value={monthlyStats.totalStudentsInMonth} color="bg-green-100 text-green-800" />
                        <InfoCard title="Số buổi đã học" value={monthlyStats.totalSessionsInMonth} color="bg-orange-100 text-orange-800" />
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
                        {/* === BỘ LỌC (TỐI ƯU HÓA CHO DI ĐỘNG) === */}
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                            <h2 className="text-xl font-bold text-gray-700 flex-shrink-0">
                                Các khoá triển khai
                            </h2>
                            <div className="flex items-center space-x-2 w-full md:w-auto md:space-x-4">
                                <div className="flex-1">
                                    <label htmlFor="year-select" className="sr-only">Năm:</label>
                                    <select
                                        id="year-select"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {yearOptions.map(year => (
                                            <option key={year} value={year}>Năm {year}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="month-select" className="sr-only">Tháng:</label>
                                    <select
                                        id="month-select"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                            <option key={month} value={month}>Tháng {month}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* === DANH SÁCH KHÓA HỌC (GIAO DIỆN DI ĐỘNG - DẠNG THẺ) === */}
                        <div className="md:hidden space-y-4">
                            {activeCoursesInMonth.length > 0 ? (
                                activeCoursesInMonth.map((course) => {
                                    const courseStudentsCount = (students || []).filter(s => s.courseId === course.id).length;
                                    const mainTeacher = (teachers || []).find(t => t.courseIds?.includes(course.id));
                                    const startDate = toDate(course.startDate);
                                    const endDate = toDate(course.endDate);
                                    
                                    return (
                                        <div key={course.id} className="p-4 border rounded-lg bg-gray-50/50">
                                            <h3 className="font-bold text-base text-primary-dark leading-tight">{course.name} - Khóa {course.courseNumber}</h3>
                                            <div className="mt-3 pt-3 border-t text-sm space-y-1 text-gray-700">
                                                <p><span className="font-semibold w-20 inline-block">Bắt đầu:</span> {startDate ? startDate.toLocaleDateString('vi-VN') : 'N/A'}</p>
                                                <p><span className="font-semibold w-20 inline-block">Kết thúc:</span> {endDate ? endDate.toLocaleDateString('vi-VN') : 'N/A'}</p>
                                                <p><span className="font-semibold w-20 inline-block">Học viên:</span> {courseStudentsCount}</p>
                                                <p><span className="font-semibold w-20 inline-block">GVCN:</span> {mainTeacher ? mainTeacher.name : 'Chưa có'}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Không có khóa học nào trong tháng {selectedMonth}/{selectedYear}.
                                </div>
                            )}
                        </div>

                        {/* === BẢNG KHÓA HỌC (GIAO DIỆN DESKTOP - DẠNG BẢNG) === */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-100 border-b">
                                        <th className="p-3 font-semibold text-gray-600 uppercase text-sm">STT</th>
                                        <th className="p-3 font-semibold text-gray-600 uppercase text-sm">Tên khóa học</th>
                                        <th className="p-3 font-semibold text-gray-600 uppercase text-sm">Bắt đầu</th>
                                        <th className="p-3 font-semibold text-gray-600 uppercase text-sm">Kết thúc</th>
                                        <th className="p-3 font-semibold text-gray-600 uppercase text-sm text-center">Số HV</th>
                                        <th className="p-3 font-semibold text-gray-600 uppercase text-sm">GVCN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeCoursesInMonth.length > 0 ? (
                                        activeCoursesInMonth.map((course, index) => {
                                            const courseStudentsCount = (students || []).filter(s => s.courseId === course.id).length;
                                            const mainTeacher = (teachers || []).find(t => t.courseIds?.includes(course.id));
                                            const startDate = toDate(course.startDate);
                                            const endDate = toDate(course.endDate);

                                            return (
                                                <tr key={course.id} className="border-b hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 text-sm">{index + 1}</td>
                                                    <td className="p-3 font-medium text-gray-800 text-sm">{course.name} - Khóa {course.courseNumber}</td>
                                                    <td className="p-3 text-sm">{startDate ? startDate.toLocaleDateString('vi-VN') : 'N/A'}</td>
                                                    <td className="p-3 text-sm">{endDate ? endDate.toLocaleDateString('vi-VN') : 'N/A'}</td>
                                                    <td className="p-3 text-center text-sm">{courseStudentsCount}</td>
                                                    <td className="p-3 text-sm">{mainTeacher ? mainTeacher.name : 'Chưa có'}</td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="text-center p-8 text-gray-500">
                                                Không có khóa học nào đang hoạt động trong tháng {selectedMonth}/{selectedYear}.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {isModalOpen && (
                <NewSessionModal 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleAddSession} 
                />
            )}
        </div>
    );
};

export default CourseScreen;