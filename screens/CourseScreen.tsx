import React, { useState, useContext, useMemo } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';
import NewSessionModal from '../components/NewSessionModal';
import { Session, UserRole } from '../types';

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
    <div className={`p-4 rounded-lg shadow-sm text-center ${color}`}>
        <p className="text-4xl font-bold">{value}</p>
        <p className="text-sm text-gray-600 mt-1">{title}</p>
    </div>
);

const CourseScreen: React.FC = () => {
    const context = useContext(AppContext);
    const currentYear = new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!context) {
        return <div className="p-6">Loading...</div>;
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
        const endOfMonth = new Date(selectedYear, selectedMonth, 0);
        
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
            if (isAssignedToActiveClass) {
                activeTeacherIds.add(teacher.id);
            }
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

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-2xl font-bold text-gray-800">
                    {canViewFullCourseScreen ? "Thông tin khoá đào tạo trong tháng" : "Chức năng Nhóm trưởng"}
                </h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg shadow-md"
                >
                    + Thêm buổi học
                </button>
            </div>

            {canViewFullCourseScreen && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                        <InfoCard title="Tổng số khoá đào tạo" value={monthlyStats.totalCoursesInMonth} color="bg-purple-100 text-purple-800" />
                        <InfoCard title="Tổng số giáo viên" value={monthlyStats.totalTeachersInMonth} color="bg-blue-100 text-blue-800" />
                        <InfoCard title="Tổng số học viên" value={monthlyStats.totalStudentsInMonth} color="bg-green-100 text-green-800" />
                        <InfoCard title="Số buổi đã học" value={monthlyStats.totalSessionsInMonth} color="bg-indigo-100 text-indigo-800" />
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-700">Các khoá đào tạo triển khai trong tháng</h2>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                    <label htmlFor="year-select" className="mr-2 text-sm font-medium text-gray-600">Năm:</label>
                                    <select
                                        id="year-select"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                        className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {yearOptions.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <label htmlFor="month-select" className="mr-2 text-sm font-medium text-gray-600">Tháng:</label>
                                    <select
                                        id="month-select"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                        className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                            <option key={month} value={month}>{month}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-100 border-b">
                                        <th className="p-3 font-semibold text-gray-600 uppercase">STT</th>
                                        <th className="p-3 font-semibold text-gray-600 uppercase">Tên khóa học</th>
                                        <th className="p-3 font-semibold text-gray-600 uppercase">Bắt đầu</th>
                                        <th className="p-3 font-semibold text-gray-600 uppercase">Kết thúc</th>
                                        <th className="p-3 font-semibold text-gray-600 uppercase">Số học viên</th>
                                        <th className="p-3 font-semibold text-gray-600 uppercase">GVCN</th>
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
                                                <tr key={course.id} className="border-b hover:bg-gray-50">
                                                    <td className="p-3">{index + 1}</td>
                                                    <td className="p-3 font-medium text-gray-800">{course.name} - Khóa {course.courseNumber}</td>
                                                    <td className="p-3">{startDate ? startDate.toLocaleDateString('vi-VN') : 'N/A'}</td>
                                                    <td className="p-3">{endDate ? endDate.toLocaleDateString('vi-VN') : 'N/A'}</td>
                                                    <td className="p-3 text-center">{courseStudentsCount}</td>
                                                    <td className="p-3">{mainTeacher ? mainTeacher.name : 'Chưa có'}</td>
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
