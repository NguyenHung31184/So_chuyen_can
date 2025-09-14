import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import NewSessionModal from '../components/NewSessionModal';
import { Session } from '../types';

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

    const { courses, teachers, students, sessions, addSession } = context;

    const handleAddSession = (session: Omit<Session, 'id'>) => {
        addSession(session);
        setIsModalOpen(false);
    };

    const monthlyCourses = useMemo(() => {
        if (!courses) return [];
        return courses.filter(course => {
            const startDate = new Date(course.startDate);
            const endDate = new Date(course.endDate);
            // A course is "active" if its time range intersects with the selected month/year.
            const courseStart = new Date(startDate.getFullYear(), startDate.getMonth());
            const courseEnd = new Date(endDate.getFullYear(), endDate.getMonth());
            const selectedDate = new Date(selectedYear, selectedMonth - 1);
            return courseStart <= selectedDate && selectedDate <= courseEnd;
        });
    }, [courses, selectedMonth, selectedYear]);

    const monthlyStats = useMemo(() => {
        if (!monthlyCourses.length) {
             const totalSessionsInMonth = sessions.filter(session => {
                const sessionDate = new Date(session.date);
                return sessionDate.getMonth() + 1 === selectedMonth && sessionDate.getFullYear() === selectedYear;
            }).length;
            return {
                totalCoursesInMonth: 0,
                totalTeachersInMonth: 0,
                totalStudentsInMonth: 0,
                totalSessionsInMonth
            };
        }
        const activeCourseIds = monthlyCourses.map(c => c.id);

        const activeStudents = students.filter(s => s.courseId && activeCourseIds.includes(s.courseId));
        const totalStudentsInMonth = new Set(activeStudents.map(s => s.id)).size;

        const activeTeacherIds = new Set<string>();
        sessions.forEach(session => {
            if(activeCourseIds.includes(session.courseId)) {
                const teacher = teachers.find(t => t.id === session.teacherId);
                if (teacher) activeTeacherIds.add(teacher.id);
            }
        });
        const totalTeachersInMonth = activeTeacherIds.size;

        const totalSessionsInMonth = sessions.filter(session => {
            const sessionDate = new Date(session.date);
            return sessionDate.getMonth() + 1 === selectedMonth && sessionDate.getFullYear() === selectedYear;
        }).length;

        return {
            totalCoursesInMonth: monthlyCourses.length,
            totalTeachersInMonth,
            totalStudentsInMonth,
            totalSessionsInMonth
        };
    }, [monthlyCourses, students, teachers, sessions, selectedMonth, selectedYear]);

    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Thông tin khoá đào tạo trong tháng</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg shadow-md"
                >
                    + Thêm buổi học
                </button>
            </div>

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
                            {monthlyCourses.length > 0 ? (
                                monthlyCourses.map((course, index) => {
                                    const courseStudentsCount = students.filter(s => s.courseId === course.id).length;
                                    const mainTeacher = teachers.find(t => t.courseIds?.includes(course.id));

                                    return (
                                        <tr key={course.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3">{index + 1}</td>
                                            <td className="p-3 font-medium text-gray-800">{course.name}</td>
                                            <td className="p-3">{new Date(course.startDate).toLocaleDateString('vi-VN')}</td>
                                            <td className="p-3">{new Date(course.endDate).toLocaleDateString('vi-VN')}</td>
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
