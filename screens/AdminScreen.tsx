
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Course, Teacher, Student, TeacherType } from '../types';
import { PROFESSIONS } from '../data';

const ADMIN_PASSWORD = '536184891417';

const AdminScreen: React.FC = () => {
    const context = useContext(AppContext);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    
    // Form States
    const [courseName, setCourseName] = useState(PROFESSIONS[0]);
    const [courseNumber, setCourseNumber] = useState('');
    const [teacherName, setTeacherName] = useState('');
    const [teacherPhone, setTeacherPhone] = useState('');
    const [teacherType, setTeacherType] = useState<TeacherType>(TeacherType.THEORY);
    const [studentName, setStudentName] = useState('');
    const [studentBirthYear, setStudentBirthYear] = useState('');
    const [studentPhone, setStudentPhone] = useState('');
    

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
        } else {
            alert('Sai mật khẩu!');
        }
    };
    
    const handleAddCourse = (e: React.FormEvent) => {
        e.preventDefault();
        const newCourse: Course = {
            id: `c${Date.now()}`,
            name: courseName,
            courseNumber: Number(courseNumber),
            totalHours: 100 // Default total hours
        };
        context?.addCourse(newCourse);
        setCourseNumber('');
        alert('Thêm khóa học thành công!');
    };

    const handleAddTeacher = (e: React.FormEvent) => {
        e.preventDefault();
        const newTeacher: Teacher = {
            id: `t${Date.now()}`,
            name: teacherName,
            phone: teacherPhone,
            type: teacherType
        };
        context?.addTeacher(newTeacher);
        setTeacherName('');
        setTeacherPhone('');
        alert('Thêm giáo viên thành công!');
    };

    const handleAddStudent = (e: React.FormEvent) => {
        e.preventDefault();
        const newStudent: Student = {
            id: `s${Date.now()}`,
            name: studentName,
            birthYear: Number(studentBirthYear),
            phone: studentPhone,
            groupId: 'g' + (Math.floor(context?.students.length / 2) + 1) // Auto assign group
        };
        context?.addStudent(newStudent);
        setStudentName('');
        setStudentBirthYear('');
        setStudentPhone('');
        alert('Thêm học viên thành công!');
    };


    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-center">Xác thực quyền Admin</h2>
                    <form onSubmit={handlePasswordSubmit}>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <button type="submit" className="w-full mt-4 bg-primary text-white py-2 rounded-md hover:bg-accent">
                            Xác nhận
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Quản lý hệ thống</h2>
            
            {/* Create Course */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                 <h3 className="text-xl font-bold text-gray-800 mb-4">Tạo khóa đào tạo</h3>
                 <form onSubmit={handleAddCourse} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Nghề đào tạo</label>
                            <select value={courseName} onChange={e => setCourseName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-primary focus:ring-primary">
                                {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Số khóa</label>
                             <input type="number" value={courseNumber} onChange={e => setCourseNumber(e.target.value)} required placeholder="VD: 102" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                         </div>
                     </div>
                     <button type="submit" className="w-full bg-primary text-white py-2 rounded-md hover:bg-accent">Thêm Khóa Học</button>
                 </form>
            </div>
            
            {/* Create Teacher */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                 <h3 className="text-xl font-bold text-gray-800 mb-4">Tạo danh sách giáo viên</h3>
                 <form onSubmit={handleAddTeacher} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input type="text" value={teacherName} onChange={e => setTeacherName(e.target.value)} required placeholder="Tên giáo viên" className="block w-full rounded-md border-gray-300 shadow-sm p-2" />
                         <input type="tel" value={teacherPhone} onChange={e => setTeacherPhone(e.target.value)} required placeholder="Số điện thoại" className="block w-full rounded-md border-gray-300 shadow-sm p-2" />
                     </div>
                      <div>
                        <div className="mt-1 flex gap-4">
                            <label className="flex items-center">
                                <input type="radio" name="teacherType" value={TeacherType.THEORY} checked={teacherType === TeacherType.THEORY} onChange={() => setTeacherType(TeacherType.THEORY)} className="focus:ring-primary h-4 w-4 text-primary border-gray-300" />
                                <span className="ml-2">Lý thuyết</span>
                            </label>
                            <label className="flex items-center">
                                <input type="radio" name="teacherType" value={TeacherType.PRACTICE} checked={teacherType === TeacherType.PRACTICE} onChange={() => setTeacherType(TeacherType.PRACTICE)} className="focus:ring-primary h-4 w-4 text-primary border-gray-300" />
                                <span className="ml-2">Thực hành</span>
                            </label>
                        </div>
                    </div>
                     <button type="submit" className="w-full bg-primary text-white py-2 rounded-md hover:bg-accent">Thêm Giáo Viên</button>
                 </form>
                 <ul className="mt-4 space-y-1 max-h-40 overflow-y-auto">
                     {context?.teachers.map(t => <li key={t.id} className="text-sm p-1 bg-gray-50 rounded">{t.name} - {t.phone} ({t.type})</li>)}
                 </ul>
            </div>
            
             {/* Create Student */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                 <h3 className="text-xl font-bold text-gray-800 mb-4">Tạo danh sách học viên</h3>
                 <form onSubmit={handleAddStudent} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} required placeholder="Họ và tên" className="block w-full rounded-md border-gray-300 shadow-sm p-2" />
                         <input type="number" value={studentBirthYear} onChange={e => setStudentBirthYear(e.target.value)} required placeholder="Năm sinh" className="block w-full rounded-md border-gray-300 shadow-sm p-2" />
                         <input type="tel" value={studentPhone} onChange={e => setStudentPhone(e.target.value)} required placeholder="Số điện thoại" className="block w-full rounded-md border-gray-300 shadow-sm p-2" />
                     </div>
                     <button type="submit" className="w-full bg-primary text-white py-2 rounded-md hover:bg-accent">Thêm Học Viên</button>
                 </form>
                 <ul className="mt-4 space-y-1 max-h-40 overflow-y-auto">
                     {context?.students.map(s => <li key={s.id} className="text-sm p-1 bg-gray-50 rounded">{s.name} - {s.birthYear} - {s.phone}</li>)}
                 </ul>
            </div>

        </div>
    );
};

export default AdminScreen;
