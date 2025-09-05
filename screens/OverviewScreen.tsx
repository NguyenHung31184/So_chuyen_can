import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Session } from '../types';

interface StatCardProps {
    // Fix: Explicitly use React.JSX.Element to resolve "Cannot find namespace 'JSX'" error.
    icon: React.JSX.Element;
    title: string;
    value: string | number;
    details: string[];
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, details, color }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col">
            <div className="flex items-center">
                <div className={`p-3 rounded-full ${color}`}>
                    {icon}
                </div>
                <div className="ml-4">
                    <p className="text-gray-500">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
            {details.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 font-semibold mb-1">Chi tiết:</p>
                <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
                  {details.map((detail, index) => <li key={index}>{detail}</li>)}
                </ul>
              </div>
            )}
        </div>
    );
};


const OverviewScreen: React.FC = () => {
    const context = useContext(AppContext);
    
    // Use all sessions to represent "today's" activity
    const todaySessions = context?.sessions || [];
    const courseMap = new Map(context?.courses.map(c => [c.id, c.name]));

    // Group sessions by classId to process data per class
    const sessionsByClass = todaySessions.reduce((acc, session) => {
        const classId = session.classId;
        if (!acc[classId]) {
            acc[classId] = [];
        }
        acc[classId].push(session);
        return acc;
    }, {} as Record<string, Session[]>);

    // --- Card 1: Active Classes ---
    const totalActiveClasses = Object.keys(sessionsByClass).length;
    const activeClassDetails = Object.keys(sessionsByClass).map(classId => {
        const sessionsInClass = sessionsByClass[classId];
        const className = courseMap.get(classId) || `Lớp ID: ${classId}`;
        const sessionTypes = [...new Set(sessionsInClass.map(s => s.type))].join(', ');
        return `${sessionTypes} - ${className}`;
    });

    // --- Card 2: Active Students ---
    const totalActiveStudents = new Set(todaySessions.flatMap(s => s.studentIds)).size;
    const studentDetails = Object.keys(sessionsByClass).map(classId => {
        const sessionsInClass = sessionsByClass[classId];
        const className = courseMap.get(classId) || `Lớp ID: ${classId}`;
        const sessionTypes = [...new Set(sessionsInClass.map(s => s.type))].join(', ');
        const studentCount = new Set(sessionsInClass.flatMap(s => s.studentIds)).size;
        return `${sessionTypes} - ${className}: ${studentCount} học viên`;
    });

    // --- Card 3: Active Teachers ---
    const totalActiveTeachers = new Set(todaySessions.map(s => s.teacherId)).size;
    const teacherDetails = Object.keys(sessionsByClass).map(classId => {
        const sessionsInClass = sessionsByClass[classId];
        const className = courseMap.get(classId) || `Lớp ID: ${classId}`;
        const sessionTypes = [...new Set(sessionsInClass.map(s => s.type))].join(', ');
        const teacherCount = new Set(sessionsInClass.map(s => s.teacherId)).size;
        return `${sessionTypes} - ${className}: ${teacherCount} giáo viên`;
    });

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Tổng quan hôm nay</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <StatCard 
                    icon={<BookOpenIcon />}
                    title="Số lớp đang học"
                    value={totalActiveClasses}
                    details={activeClassDetails}
                    color="bg-blue-100 text-blue-600"
                />
                <StatCard 
                    icon={<UsersIcon />}
                    title="Tổng số học viên đang học"
                    value={totalActiveStudents}
                    details={studentDetails}
                    color="bg-green-100 text-green-600"
                />
                <StatCard 
                    icon={<UserCircleIcon />}
                    title="Số giáo viên đang giảng dạy"
                    value={totalActiveTeachers}
                    details={teacherDetails}
                    color="bg-indigo-100 text-indigo-600"
                />
            </div>
        </div>
    );
};


const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const UserCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default OverviewScreen;