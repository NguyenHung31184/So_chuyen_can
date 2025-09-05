
import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';

const CourseScreen: React.FC = () => {
    const context = useContext(AppContext);

    const totalTeachers = context?.teachers.length || 0;
    const totalStudents = context?.students.length || 0;
    const totalGroups = new Set(context?.students.map(s => s.groupId)).size;
    
    const taughtHours = context?.sessions.reduce((acc, session) => {
        const start = new Date(`1970-01-01T${session.startTime}:00`);
        const end = new Date(`1970-01-01T${session.endTime}:00`);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0) || 0;
    
    const totalRequiredHours = context?.courses.reduce((acc, course) => acc + course.totalHours, 0) || 320;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Thông tin Khóa đào tạo</h2>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-primary">{totalTeachers}</p>
                        <p className="text-sm text-gray-500">Tổng số giáo viên</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-primary">{totalStudents}</p>
                        <p className="text-sm text-gray-500">Tổng số học viên</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-primary">{totalGroups}</p>
                        <p className="text-sm text-gray-500">Tổng số nhóm</p>
                    </div>
                     <div className="text-center">
                        <p className="text-3xl font-bold text-primary">{`${taughtHours.toFixed(1)}/${totalRequiredHours}`}</p>
                        <p className="text-sm text-gray-500">Số giờ đã dạy / Tổng giờ</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseScreen;
