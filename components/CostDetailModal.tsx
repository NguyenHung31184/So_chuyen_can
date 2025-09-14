
import React from 'react';
import { Session, Course, Teacher, SessionType, CostReportType, Class } from '../types';

interface CostDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    costType: CostReportType | null;
    sessions: Session[];
    courses: Course[];
    teachers: Teacher[];
    classes: Class[];
}

const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diff = end.getTime() - start.getTime();
    return diff / (1000 * 60 * 60); // Convert milliseconds to hours
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const CostDetailModal: React.FC<CostDetailModalProps> = ({ isOpen, onClose, costType, sessions, courses, teachers, classes }) => {
    if (!isOpen || !costType) return null;

    const getCourseName = (courseId: string) => courses.find(c => c.id === courseId)?.name || 'N/A';
    const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';

    const TEACHER_THEORY_RATE_PER_HOUR = 200000;
    const TEACHER_PRACTICE_RATE_PER_HOUR = 300000;

    let title = '';
    let tableData: any[] = [];
    let tableHeaders: string[] = [];

    switch (costType) {
        case CostReportType.TEACHER_THEORY:
            title = 'Báo cáo chi tiết thuê giáo viên lý thuyết';
            tableHeaders = ['STT', 'Tên giáo viên', 'Khóa học', 'Lớp', 'Đơn vị', 'Định lượng', 'Chi phí'];
            const theorySessions = sessions.filter(s => s.type === SessionType.THEORY);
            const theoryTeacherData = teachers.map(teacher => {
                const teacherSessions = theorySessions.filter(ts => ts.teacherId === teacher.id);
                const courseAndClassHours: { [key: string]: { hours: number, courseId: string, classId: string } } = {};

                teacherSessions.forEach(session => {
                    const duration = calculateDuration(session.startTime, session.endTime);
                    const key = `${session.courseId}-${session.classId}`;
                    if (!courseAndClassHours[key]) {
                        courseAndClassHours[key] = { hours: 0, courseId: session.courseId, classId: session.classId };
                    }
                    courseAndClassHours[key].hours += duration;
                });

                return Object.values(courseAndClassHours).map(data => ({
                    teacherName: teacher.name,
                    courseName: getCourseName(data.courseId),
                    className: getClassName(data.classId),
                    unit: 'giờ',
                    quantity: data.hours.toFixed(1),
                    cost: data.hours * TEACHER_THEORY_RATE_PER_HOUR,
                }));
            }).flat();
            tableData = theoryTeacherData;
            break;
        case CostReportType.TEACHER_PRACTICE:
            title = 'Báo cáo chi tiết thuê giáo viên thực hành';
            tableHeaders = ['STT', 'Tên giáo viên', 'Khóa học', 'Lớp', 'Đơn vị', 'Định lượng', 'Chi phí'];
            const practiceSessions = sessions.filter(s => s.type === SessionType.PRACTICE);
            const practiceTeacherData = teachers.map(teacher => {
                 const teacherSessions = practiceSessions.filter(ps => ps.teacherId === teacher.id);
                const courseAndClassHours: { [key: string]: { hours: number, courseId: string, classId: string } } = {};

                teacherSessions.forEach(session => {
                    const duration = calculateDuration(session.startTime, session.endTime);
                    const key = `${session.courseId}-${session.classId}`;
                    if (!courseAndClassHours[key]) {
                        courseAndClassHours[key] = { hours: 0, courseId: session.courseId, classId: session.classId };
                    }
                    courseAndClassHours[key].hours += duration;
                });

                return Object.values(courseAndClassHours).map(data => ({
                    teacherName: teacher.name,
                    courseName: getCourseName(data.courseId),
                    className: getClassName(data.classId),
                    unit: 'giờ',
                    quantity: data.hours.toFixed(1),
                    cost: data.hours * TEACHER_PRACTICE_RATE_PER_HOUR,
                }));
            }).flat();
            tableData = practiceTeacherData;
            break;
        case CostReportType.FUEL:
             title = 'Báo cáo chi tiết Nhiên liệu diesel';
             tableHeaders = ['STT', 'Tên phương tiện', 'Khóa học', 'Đơn vị', 'Định lượng', 'Chi phí'];
             tableData = []; 
             break;
        case CostReportType.ELECTRICITY:
            title = 'Báo cáo chi tiết Điện năng';
            tableHeaders = ['STT', 'Tên phương tiện', 'Khóa học', 'Đơn vị', 'Định lượng', 'Chi phí'];
            tableData = [];
            break;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-4 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr className="text-center">
                                {tableHeaders.map(header => <th key={header} className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>)}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tableData.length > 0 ? tableData.map((item, index) => (
                                <tr key={index} className="text-center">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                                    {costType === CostReportType.TEACHER_THEORY || costType === CostReportType.TEACHER_PRACTICE ? (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.teacherName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.courseName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.className}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(item.cost)}</td>
                                        </>
                                    ) : (
                                        <td colSpan={tableHeaders.length - 1} className="text-center py-4 text-gray-500">Chưa có dữ liệu cho loại chi phí này</td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={tableHeaders.length} className="text-center py-10 text-gray-500">Không có dữ liệu chi tiết.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end mt-6">
                    <button 
                        onClick={onClose} 
                        className="bg-primary hover:bg-accent text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CostDetailModal;
