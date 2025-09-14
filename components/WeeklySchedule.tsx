
import React, { useContext, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Session, SessionType } from '../types';

// A simplified function to get day of week (0=Sun, 1=Mon...)
// Note: This is a basic implementation. A library like date-fns would be more robust.
const getDayOfWeek = (dateString: string): number => {
    const date = new Date(dateString);
    return (date.getDay() + 6) % 7; // Convert to Monday=0, Sunday=6
}

const WeeklySchedule: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) {
        return <div className="text-center p-4">Đang tải dữ liệu...</div>;
    }
    const { sessions, teachers } = context;

    const daysOfWeek = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

    const getSessionsForDay = (dayIndex: number): Session[] => {
        return sessions
            .filter(session => getDayOfWeek(session.date) === dayIndex)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    const getTeacherName = (teacherId: string): string => {
        return teachers.find(t => t.id === teacherId)?.name || 'Không rõ';
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg mt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Lịch dạy trong tuần</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {daysOfWeek.map((day, index) => (
                    <div key={day} className="bg-gray-50 p-3 rounded-lg min-h-[150px]">
                        <h4 className="font-bold text-center text-gray-700 border-b pb-2 mb-2">{day}</h4>
                        <div className="space-y-2">
                            {getSessionsForDay(index).map(session => (
                                <div 
                                    key={session.id} 
                                    className={`p-2 rounded-md text-xs shadow-sm cursor-pointer hover:shadow-md transition-shadow ${session.type === SessionType.PRACTICE ? 'bg-blue-100 border-l-4 border-blue-400' : 'bg-green-100 border-l-4 border-green-400'}`}>
                                    <p className="font-semibold text-gray-900">{session.startTime} - {session.endTime}</p>
                                    <p className="text-gray-700">GV: {getTeacherName(session.teacherId)}</p>
                                </div>
                            ))}
                             <button className="w-full text-center text-sm text-primary hover:bg-gray-200 p-1 rounded mt-2 font-medium">
                                 + Thêm buổi học
                             </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeeklySchedule;
