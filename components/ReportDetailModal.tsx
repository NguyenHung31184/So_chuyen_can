
import React from 'react';
import { Session, Teacher, Student, Course, SessionType, Class } from '../types';
import { formatDate } from '../utils/date';

interface ReportDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Teacher | Student | null;
    sessions: Session[];
    courses: Course[];
    teachers: Teacher[];
    classes: Class[];
    reportType: 'teacher' | 'student';
}

const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diff = end.getTime() - start.getTime();
    return diff / (1000 * 60 * 60); // Convert milliseconds to hours
};

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ isOpen, onClose, item, sessions, courses, teachers, classes, reportType }) => {
    if (!isOpen || !item) return null;

    const getCourseName = (courseId: string) => courses.find(c => c.id === courseId)?.name || 'N/A';
    const getTeacherName = (teacherId: string) => teachers.find(t => t.id === teacherId)?.name || 'N/A';
    const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';

    const relevantSessions = reportType === 'teacher'
        ? sessions.filter(s => s.teacherId === item.id)
        : sessions.filter(s => s.studentIds.includes(item.id));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-4 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Báo cáo chi tiết: {item.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            {reportType === 'teacher' ? (
                                <tr className="text-center">
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày dạy</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Khóa học</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung buổi học</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Số giờ</th>
                                </tr>
                            ) : (
                                <tr className="text-center">
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày học</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Khóa học</th>
                                     <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung buổi học</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên giảng dạy</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Số giờ học</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {relevantSessions.map((session, index) => (
                                <tr key={session.id} className="text-center">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(session.date)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getCourseName(session.courseId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getClassName(session.classId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.topic}</td>
                                    {reportType === 'teacher' ? (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.type === SessionType.THEORY ? 'Lý thuyết' : 'Thực hành'}</td>
                                    ) : (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getTeacherName(session.teacherId)}</td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${session.startTime} - ${session.endTime}`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{calculateDuration(session.startTime, session.endTime).toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="flex justify-end mt-6">
                    <button 
                        onClick={onClose} 
                        className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportDetailModal;
