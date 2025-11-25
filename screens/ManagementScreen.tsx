import React, { useState } from 'react';
import { Screen } from '../types';
import { TabButton } from '../components/management/ManagementUI';
import { StudentManager } from '../components/management/StudentManager';
import { TeacherManager } from '../components/management/TeacherManager';
import { UserManager } from '../components/management/UserManager';
import { CourseManager } from '../components/management/CourseManager';
import { VehicleManager } from '../components/management/VehicleManager';

const ManagementScreen: React.FC<{ setActiveScreen: (screen: Screen) => void }> = ({ setActiveScreen }) => {
    const [activeTab, setActiveTab] = useState<'teacher' | 'course' | 'student' | 'vehicle' | 'user'>('teacher');

    const renderContent = () => {
        switch (activeTab) {
            case 'teacher': return <TeacherManager />;
            case 'student': return <StudentManager />;
            case 'course': return <CourseManager />;
            case 'vehicle': return <VehicleManager />;
            case 'user': return <UserManager />;
            default: return null;
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            {/* --- HEADER & TABS --- */}
            <div className="bg-white shadow-sm sticky top-0 z-20">
                <div className="p-4 border-b flex justify-between items-center bg-white">
                    <h2 className="text-xl font-bold text-gray-800">Quản trị hệ thống</h2>
                </div>
                <div className="flex overflow-x-auto no-scrollbar scroll-smooth">
                    <TabButton active={activeTab === 'teacher'} onClick={() => setActiveTab('teacher')} label="Giáo viên" />
                    <TabButton active={activeTab === 'student'} onClick={() => setActiveTab('student')} label="Học viên" />
                    <TabButton active={activeTab === 'course'} onClick={() => setActiveTab('course')} label="Khóa học" />
                    <TabButton active={activeTab === 'vehicle'} onClick={() => setActiveTab('vehicle')} label="Xe tập" />
                    <TabButton active={activeTab === 'user'} onClick={() => setActiveTab('user')} label="Admin/QL" />
                </div>
            </div>

            {/* --- BODY CONTENT --- */}
            <div className="p-4 min-h-[calc(100vh-160px)]">
                {renderContent()}
            </div>
        </div>
    );
};

export default ManagementScreen;