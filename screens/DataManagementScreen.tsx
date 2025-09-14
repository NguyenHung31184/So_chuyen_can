
import React, { useState } from 'react';

type AdminSection = 'training-courses' | 'students' | 'teachers' | 'users';

const SectionContent: React.FC<{ title: string }> = ({ title }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{title}</h3>
                <div>
                    <button className="bg-blue-500 text-white px-4 py-2 rounded-lg mr-2">Nhập dữ liệu excel</button>
                    <button className="bg-green-500 text-white px-4 py-2 rounded-lg mr-2">Chỉnh sửa</button>
                    <button className="bg-red-500 text-white px-4 py-2 rounded-lg">Hủy</button>
                </div>
            </div>
            <div>{title} content</div>
        </div>
    );
};


const DataManagementScreen: React.FC = () => {
    const [activeSection, setActiveSection] = useState<AdminSection>('training-courses');

    const renderSection = () => {
        switch (activeSection) {
            case 'training-courses':
                return <SectionContent title="Danh sách khóa đào tạo" />;
            case 'students':
                return <SectionContent title="Danh sách học viên" />;
            case 'teachers':
                return <SectionContent title="Danh sách giáo viên" />;
            case 'users':
                return <SectionContent title="Danh sách đăng nhập" />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-gray-100 min-h-screen flex">
            <aside className="w-1/4 pr-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Quản lý dữ liệu</h2>
                <nav className="space-y-2">
                    <a href="#" onClick={() => setActiveSection('training-courses')} className={`block p-3 rounded-lg font-semibold ${activeSection === 'training-courses' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}>Danh sách khóa đào tạo</a>
                    <a href="#" onClick={() => setActiveSection('students')} className={`block p-3 rounded-lg font-semibold ${activeSection === 'students' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}>Danh sách học viên</a>
                    <a href="#" onClick={() => setActiveSection('teachers')} className={`block p-3 rounded-lg font-semibold ${activeSection === 'teachers' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}>Danh sách giáo viên</a>
                    <a href="#" onClick={() => setActiveSection('users')} className={`block p-3 rounded-lg font-semibold ${activeSection === 'users' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}>Danh sách đăng nhập</a>
                </nav>
            </aside>
            <main className="w-3/4 bg-white p-6 rounded-xl shadow-md">
                {renderSection()}
            </main>
        </div>
    );
};

export default DataManagementScreen;
