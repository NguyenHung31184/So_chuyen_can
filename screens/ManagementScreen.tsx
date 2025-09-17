import React, { useState, useContext, useMemo, useRef } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';
import { Course, Student, User, TeacherSpecialty, TeacherContractType, UserRole } from '../types';
import * as XLSX from 'xlsx';

// --- COMPONENT: Modal xác nhận --- //
const ConfirmationModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void; }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm mx-auto">
            <p className="mb-4 text-gray-800">{message}</p>
            <div className="flex justify-end space-x-4">
                <button onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 rounded-lg transition-colors">Không</button>
                <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors">Có, Xóa</button>
            </div>
        </div>
    </div>
);

// --- COMPONENT: Màn hình quản lý --- //
const ManagementScreen: React.FC = () => {
    // --- TOÀN BỘ LOGIC CỦA BẠN ĐƯỢC GIỮ NGUYÊN ---
    const context = useContext(AppContext);
    const studentFileInputRef = useRef<HTMLInputElement>(null);
    const teacherFileInputRef = useRef<HTMLInputElement>(null);

    const initialCourseForm: Omit<Course, 'id'> = { name: '', courseNumber: 0, startDate: '', endDate: '' };
    const initialStudentForm: Omit<Student, 'id'> = { name: '', birthDate: '', phone: '', group: '', courseId: '' };
    const initialTeacherForm: Partial<User> & { password?: string } = { name: '', phone: '', role: UserRole.TEACHER, contractType: TeacherContractType.CONTRACT, specialty: TeacherSpecialty.THEORY, courseIds: [], password: '' };
    const initialUserForm: Omit<User, 'id'> & { password?: string } = { name: '', phone: '', role: UserRole.MANAGER, password: '' };

    const [courseForm, setCourseForm] = useState(initialCourseForm);
    const [studentForm, setStudentForm] = useState(initialStudentForm);
    const [teacherForm, setTeacherForm] = useState(initialTeacherForm);
    const [userForm, setUserForm] = useState(initialUserForm);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null); 
    const [studentCourseFilter, setStudentCourseFilter] = useState<string>('all');
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'course' | 'student' | 'user'; id: string; } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!context) {
        return <div className="p-8 text-center text-red-500">Lỗi nghiêm trọng: Không thể tải được dữ liệu ứng dụng.</div>;
    }
    const { courses, students, users, addCourse, updateCourse, deleteCourse, addStudent, updateStudent, deleteStudent, addUser, updateUser, deleteUser } = context as AppContextType;
    
    const teachers = useMemo(() => (users || []).filter(u => u?.role === UserRole.TEACHER), [users]);
    const managementUsers = useMemo(() => (users || []).filter(u => u && (u.role === UserRole.ADMIN || u.role === UserRole.MANAGER || u.role === UserRole.GROUP_LEADER)), [users]);
    const filteredStudents = useMemo(() => {
        if (!Array.isArray(students)) return [];
        if (studentCourseFilter === 'all') return students;
        return students.filter(s => s?.courseId === studentCourseFilter);
    }, [students, studentCourseFilter]);

    const handleEdit = (type: 'course' | 'student' | 'user', item: any) => {
        if (!item) return;
        window.scrollTo(0, document.body.scrollHeight); // Tự động cuộn xuống form khi bấm sửa
        if (type === 'course') { setEditingCourse(item); setCourseForm(item); }
        if (type === 'student') { setEditingStudent(item); setStudentForm(item); }
        if (type === 'user') {
            setEditingUser(item);
            const { password, ...formData } = item;
            if(item.role === UserRole.TEACHER) {
                setTeacherForm(formData)
            } else {
                setUserForm(formData)
            }
        }
    };

    const handleCancelEdit = (type: string) => {
        if (type === 'course') { setEditingCourse(null); setCourseForm(initialCourseForm); }
        if (type === 'student') { setEditingStudent(null); setStudentForm(initialStudentForm); }
        if (type === 'user') { 
            setEditingUser(null); 
            setUserForm(initialUserForm);
            setTeacherForm(initialTeacherForm);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent, type: 'course' | 'student' | 'user', subType?: 'teacher' | 'manager') => {
        e.preventDefault();
        setIsSubmitting(true);
        const isPhoneInUse = (phone: string, currentId?: string) => (users || []).some(user => user?.phone === phone && user.id !== currentId);

        try {
            if (type === 'user') {
                const form = subType === 'teacher' ? teacherForm : userForm;
                if (isPhoneInUse(form.phone!, editingUser?.id)) {
                    throw new Error('Số điện thoại này đã được một tài khoản khác sử dụng.');
                }
                if (editingUser) {
                    await updateUser({ ...editingUser, ...form });
                } else {
                    if (!form.password || form.password.length < 6) throw new Error('Mật khẩu là bắt buộc và phải có ít nhất 6 ký tự.');
                    await addUser(form as Omit<User, 'id'> & { password?: string });
                }
            } else if (type === 'student') {
                if (!studentForm.courseId) throw new Error('Vui lòng chọn một khóa đào tạo.');
                if (editingStudent) await updateStudent({ ...editingStudent, ...studentForm });
                else await addStudent(studentForm);
            } else if (type === 'course') {
                if (editingCourse) await updateCourse({ ...editingCourse, ...courseForm });
                else await addCourse(courseForm);
            }
            alert('Thao tác thành công!');
            handleCancelEdit(type);
        } catch (error: any) {
            alert(`LỖI: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteRequest = (type: 'course' | 'student' | 'user', id: string) => setConfirmDelete({ type, id });

    const confirmDeletion = async () => {
        if (!confirmDelete) return;
        const { type, id } = confirmDelete;
        try {
            if (type === 'course') await deleteCourse(id);
            else if (type === 'student') await deleteStudent(id);
            else if (type === 'user') await deleteUser(id);
        } catch (error: any) {
            alert(`Lỗi khi xóa: ${error.message}`);
        }
        setConfirmDelete(null);
    };

    const getCourseDisplayString = (courseId: string) => {
        const course = (courses || []).find(c => c?.id === courseId);
        return course ? `${course.name} - Khóa ${course.courseNumber}` : 'N/A';
    };

    const handleTeacherCourseChange = (courseId: string, isChecked: boolean) => {
        const currentCourseIds = teacherForm.courseIds ?? [];
        const newCourseIds = isChecked ? [...currentCourseIds, courseId] : currentCourseIds.filter(id => id !== courseId);
        setTeacherForm({ ...teacherForm, courseIds: newCourseIds });
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>, type: 'student' | 'teacher') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                
                if (json.length < 2) throw new Error("File Excel trống hoặc không có dữ liệu.");

                const headerRow = (json[0] as any[]).map(h => String(h).trim());
                const rows = json.slice(1);
                let errors: string[] = [];
                let validData: any[] = [];

                if (type === 'student') {
                    const requiredHeaders = ["Ho va ten", "Ngay sinh", "So dien thoai", "Nhom", "Ten khoa hoc"];
                    const missingHeaders = requiredHeaders.filter(h => !headerRow.includes(h));
                    if (missingHeaders.length > 0) throw new Error(`File Excel thiếu các cột bắt buộc: ${missingHeaders.join(', ')}`);

                    const colMap = { name: headerRow.indexOf("Ho va ten"), birthDate: headerRow.indexOf("Ngay sinh"), phone: headerRow.indexOf("So dien thoai"), group: headerRow.indexOf("Nhom"), courseName: headerRow.indexOf("Ten khoa hoc"), };
                    rows.forEach((row: any, index) => {
                        const name = String(row[colMap.name]).trim();
                        if (!name) return;
                        const student = { name, birthDate: String(row[colMap.birthDate]).trim(), phone: String(row[colMap.phone]).trim(), group: String(row[colMap.group]).trim(), courseName: String(row[colMap.courseName]).trim(), };
                        if (!student.name || !student.birthDate || !student.phone || !student.group || !student.courseName) { errors.push(`Dòng ${index + 2}: Thiếu dữ liệu bắt buộc.`); return; }
                        const course = courses.find(c => `${c.name} - Khóa ${c.courseNumber}`.trim() === student.courseName);
                        if (!course) { errors.push(`Dòng ${index + 2}: Tên khóa học "${student.courseName}" không tồn tại.`); return; }
                        validData.push({ ...student, courseId: course.id });
                    });

                } else {
                    const requiredHeaders = ["Ho va ten", "So dien thoai", "Mat khau", "Hinh thuc", "Chuyen mon"];
                    const missingHeaders = requiredHeaders.filter(h => !headerRow.includes(h));
                    if (missingHeaders.length > 0) throw new Error(`File Excel thiếu các cột bắt buộc: ${missingHeaders.join(', ')}`);
                    
                    const colMap = { name: headerRow.indexOf("Ho va ten"), phone: headerRow.indexOf("So dien thoai"), password: headerRow.indexOf("Mat khau"), contractType: headerRow.indexOf("Hinh thuc"), specialty: headerRow.indexOf("Chuyen mon"), };
                    const phonesInFile = new Set();
                    rows.forEach((row: any, index) => {
                        const name = String(row[colMap.name]).trim();
                        if(!name) return;
                        const teacher = { name, phone: String(row[colMap.phone]).trim(), password: String(row[colMap.password]).trim(), contractType: String(row[colMap.contractType]).trim(), specialty: String(row[colMap.specialty]).trim(), role: UserRole.TEACHER };
                        if (!teacher.name || !teacher.phone || !teacher.password || !teacher.contractType || !teacher.specialty) { errors.push(`Dòng ${index + 2}: Thiếu dữ liệu bắt buộc.`); return; }
                        if (!Object.values(TeacherContractType).map(v=>v.trim()).includes(teacher.contractType)) { errors.push(`Dòng ${index + 2}: Hình thức "${teacher.contractType}" không hợp lệ.`); }
                        if (!Object.values(TeacherSpecialty).map(v=>v.trim()).includes(teacher.specialty)) { errors.push(`Dòng ${index + 2}: Chuyên môn "${teacher.specialty}" không hợp lệ.`); }
                        if(phonesInFile.has(teacher.phone)) { errors.push(`Dòng ${index + 2}: Số điện thoại "${teacher.phone}" bị trùng lặp trong file.`); } else { phonesInFile.add(teacher.phone); }
                        if (errors.length === 0) validData.push(teacher);
                    });
                }

                if (errors.length > 0) { throw new Error(`Phát hiện ${errors.length} lỗi trong file Excel:\n\n- ${errors.join('\n- ')}`); } 
                if (validData.length > 0) {
                    const confirmation = window.confirm(`Bạn có chắc chắn muốn nhập ${validData.length} ${type === 'student' ? 'học viên' : 'giáo viên'} từ file Excel không?`);
                    if (confirmation) {
                        setIsSubmitting(true);
                        for (const item of validData) { if (type === 'student') await addStudent(item); else await addUser(item); }
                        alert('Nhập dữ liệu từ Excel thành công!');
                    }
                } else { alert("Không tìm thấy dữ liệu hợp lệ trong file Excel."); }
            } catch (err: any) { alert(`Lỗi xử lý file: ${err.message}`); } 
            finally { setIsSubmitting(false); }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };

    // --- PHẦN GIAO DIỆN (JSX) ĐÃ ĐƯỢC TỐI ƯU HÓA ---
    return (
        <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
            {confirmDelete && <ConfirmationModal message="Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa?" onConfirm={confirmDeletion} onCancel={() => setConfirmDelete(null)} />}
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Quản lý dữ liệu</h1>

            {/* === Courses Section === >> Tối ưu hóa lại danh sách */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg mb-8">
                <h2 className="text-xl font-bold mb-4 text-gray-700">Danh sách khóa đào tạo</h2>
                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2">
                    {(courses ?? []).map(item => item && (
                        <div key={item.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                            {/* Phần hiển thị tên khóa học */}
                            <span className="font-semibold text-gray-800 flex-grow">
                                {item.name} - Khóa {item.courseNumber}
                            </span>
                            
                            {/* Phần nút bấm, không co lại khi tên khóa học dài */}
                            <div className="flex-shrink-0 space-x-2">
                                <button onClick={() => handleEdit('course', item)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors" disabled={isSubmitting}>Sửa</button>
                                <button onClick={() => handleDeleteRequest('course', item.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors" disabled={isSubmitting}>Xóa</button>
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={(e) => handleSubmit(e, 'course')} className="space-y-4 pt-4 border-t border-gray-200">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input type="text" value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} placeholder="Tên khóa học" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required/>
                         <input type="number" value={courseForm.courseNumber} onChange={e => setCourseForm({...courseForm, courseNumber: parseInt(e.target.value) || 0})} placeholder="Số khóa" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required/>
                         <input type="text" onFocus={(e) => e.target.type='date'} onBlur={(e) => e.target.type='text'} value={courseForm.startDate} onChange={e => setCourseForm({...courseForm, startDate: e.target.value})} placeholder="Ngày bắt đầu" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required/>
                         <input type="text" onFocus={(e) => e.target.type='date'} onBlur={(e) => e.target.type='text'} value={courseForm.endDate} onChange={e => setCourseForm({...courseForm, endDate: e.target.value})} placeholder="Ngày kết thúc" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required/>
                    </div>
                    <div className="flex justify-end space-x-3">
                        {editingCourse && <button type="button" onClick={() => handleCancelEdit('course')} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors" disabled={isSubmitting}>Hủy</button>}
                        <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition-colors" disabled={isSubmitting}>{editingCourse ? 'Cập nhật khóa học' : 'Thêm khóa học'}</button>
                    </div>
                </form>
            </div>

            {/* === Students Section === */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg mb-8">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-gray-700">Danh sách học viên</h2>
                    <input type="file" ref={studentFileInputRef} onChange={(e) => handleFileImport(e, 'student')} className="hidden" accept=".xlsx, .xls, .csv" />
                    <button onClick={() => studentFileInputRef.current?.click()} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors" disabled={isSubmitting}>Nhập từ Excel</button>
                </div>
                <div className="mb-4">
                    <select value={studentCourseFilter} onChange={e => setStudentCourseFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary">
                        <option value="all">Lọc theo khóa đào tạo: Tất cả</option>
                        {(courses ?? []).map(course => course && <option key={course.id} value={course.id}>{getCourseDisplayString(course.id)}</option>)}
                    </select>
                </div>
                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2">
                    {(filteredStudents ?? []).map(student => student && (
                        <div key={student.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                           <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg text-gray-800">{student.name}</p>
                                    <p className="text-sm text-gray-600">Nhóm: {student.group}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <button onClick={() => handleEdit('student', student)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg mr-2 text-sm font-semibold transition-colors" disabled={isSubmitting}>Sửa</button>
                                    <button onClick={() => handleDeleteRequest('student', student.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors" disabled={isSubmitting}>Xóa</button>
                                </div>
                           </div>
                           <div className="mt-3 border-t pt-2 text-sm text-gray-700 space-y-1">
                                <p><span className="font-semibold">Ngày sinh:</span> {student.birthDate}</p>
                                <p><span className="font-semibold">SĐT:</span> {student.phone}</p>
                                <p><span className="font-semibold">Khóa:</span> {getCourseDisplayString(student.courseId)}</p>
                           </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={(e) => handleSubmit(e, 'student')} className="space-y-4 pt-4 border-t border-gray-200">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} placeholder="Tên học viên" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required />
                        <input type="text" onFocus={(e) => e.target.type='date'} onBlur={(e) => e.target.type='text'} value={studentForm.birthDate} onChange={e => setStudentForm({...studentForm, birthDate: e.target.value})} placeholder="Ngày sinh" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required />
                        <input type="tel" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value})} placeholder="Số điện thoại" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required />
                        <input type="text" value={studentForm.group} onChange={e => setStudentForm({...studentForm, group: e.target.value})} placeholder="Nhóm" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required />
                        <select value={studentForm.courseId} onChange={e => setStudentForm({...studentForm, courseId: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md md:col-span-2 focus:ring-2 focus:ring-primary" required>
                            <option value="">-- Chọn khóa đào tạo --</option>
                            {(courses ?? []).map(course => course && <option key={course.id} value={course.id}>{getCourseDisplayString(course.id)}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3">
                        {editingStudent && <button type="button" onClick={() => handleCancelEdit('student')} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors" disabled={isSubmitting}>Hủy</button>}
                        <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition-colors" disabled={isSubmitting}>{editingStudent ? 'Cập nhật học viên' : 'Thêm học viên'}</button>
                    </div>
                </form>
            </div>

            {/* === Teachers Section === */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg mb-8">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-gray-700">Danh sách giáo viên</h2>
                    <input type="file" ref={teacherFileInputRef} onChange={(e) => handleFileImport(e, 'teacher')} className="hidden" accept=".xlsx, .xls, .csv" />
                    <button onClick={() => teacherFileInputRef.current?.click()} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors" disabled={isSubmitting}>Nhập từ Excel</button>
                </div>
                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2">
                    {teachers.map(teacher => (
                        <div key={teacher.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                           <div className="flex justify-between items-start">
                               <div>
                                   <p className="font-bold text-lg text-gray-800">{teacher.name}</p>
                                   <p className="text-sm text-gray-600">SĐT: {teacher.phone}</p>
                               </div>
                               <div className="flex-shrink-0">
                                   <button onClick={() => handleEdit('user', teacher)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg mr-2 text-sm font-semibold transition-colors" disabled={isSubmitting}>Sửa</button>
                                   <button onClick={() => handleDeleteRequest('user', teacher.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors" disabled={isSubmitting}>Xóa</button>
                               </div>
                           </div>
                           <div className="mt-3 text-sm text-gray-700 space-y-1">
                                <p><span className="font-semibold">Hình thức:</span> {teacher.contractType}</p>
                                <p><span className="font-semibold">Chuyên môn:</span> {teacher.specialty}</p>
                           </div>
                           <div className="mt-3 border-t pt-2">
                                <p className="font-semibold text-sm text-gray-800 mb-2">Các khóa phụ trách:</p>
                                <div className="flex flex-wrap gap-2">
                                    {(teacher.courseIds ?? []).length > 0 ? teacher.courseIds!.map(id => (
                                        <span key={id} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">{getCourseDisplayString(id)}</span>
                                    )) : <span className="text-sm text-gray-500">Chưa được phân công khóa học.</span>}
                                </div>
                           </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={(e) => handleSubmit(e, 'user', 'teacher')} className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" value={teacherForm.name || ''} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} placeholder="Tên giáo viên" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required/>
                        <input type="tel" value={teacherForm.phone || ''} onChange={e => setTeacherForm({...teacherForm, phone: e.target.value})} placeholder="Số điện thoại (dùng để đăng nhập)" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required/>
                        {!editingUser && (
                             <input type="password" value={teacherForm.password || ''} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} placeholder="Mật khẩu (ít nhất 6 ký tự)" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required={!editingUser} />
                        )}
                        <select value={teacherForm.contractType} onChange={e => setTeacherForm({...teacherForm, contractType: e.target.value as TeacherContractType})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary">
                            {Object.values(TeacherContractType).map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <select value={teacherForm.specialty} onChange={e => setTeacherForm({...teacherForm, specialty: e.target.value as TeacherSpecialty})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary">
                            {Object.values(TeacherSpecialty).map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phân công các khóa phụ trách</label>
                        <div className="space-y-2 p-3 border rounded-md max-h-40 overflow-y-auto bg-gray-50">
                            {(courses ?? []).length > 0 ? (courses ?? []).map(course => course && (
                                <div key={`chk-${course.id}`} className="flex items-center">
                                    <input id={`course-checkbox-${course.id}`} type="checkbox" checked={(teacherForm.courseIds ?? []).includes(course.id)} onChange={(e) => handleTeacherCourseChange(course.id, e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded" />
                                    <label htmlFor={`course-checkbox-${course.id}`} className="ml-3 block text-sm text-gray-900">{getCourseDisplayString(course.id)}</label>
                                </div>
                            )) : <p className="text-sm text-gray-500">Chưa có khóa học nào để phân công.</p>}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        {editingUser && teacherForm.role === UserRole.TEACHER && <button type="button" onClick={() => handleCancelEdit('user')} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors" disabled={isSubmitting}>Hủy</button>}
                        <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition-colors" disabled={isSubmitting}>{editingUser && teacherForm.role === UserRole.TEACHER ? 'Cập nhật giáo viên' : 'Thêm giáo viên'}</button>
                    </div>
                </form>
            </div>

            {/* === Users Section (Managers/Admins) === */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-gray-700">Danh sách Quản lý / Admin / Nhóm Trưởng</h2>
                <div className="space-y-3 mb-6 max-h-72 overflow-y-auto pr-2">
                    {managementUsers.map(item => (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="mb-2 sm:mb-0">
                                <p className="font-semibold text-gray-800">{item.name}</p>
                                <p className="text-sm text-gray-500">{item.role} (SĐT: {item.phone})</p>
                            </div>
                            <div className="flex-shrink-0 self-end sm:self-center">
                                <button onClick={() => handleEdit('user', item)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg mr-2 text-sm font-semibold transition-colors" disabled={isSubmitting}>Sửa</button>
                                <button onClick={() => handleDeleteRequest('user', item.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors" disabled={isSubmitting}>Xóa</button>
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={(e) => handleSubmit(e, 'user', 'manager')} className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Tên người dùng" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required/>
                        <input type="tel" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} placeholder="Số điện thoại (dùng để đăng nhập)" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required/>
                        {!editingUser && (
                             <input type="password" value={userForm.password || ''} onChange={e => setUserForm({...userForm, password: e.target.value})} placeholder="Mật khẩu (ít nhất 6 ký tự)" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" required={!editingUser} />
                        )}
                        <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full p-2 border border-gray-300 rounded-md md:col-span-2 focus:ring-2 focus:ring-primary">
                           <option value={UserRole.MANAGER}>Quản lý</option>
                           <option value={UserRole.ADMIN}>Admin</option>
                           <option value={UserRole.GROUP_LEADER}>Nhóm trưởng</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3">
                        {editingUser && userForm.role !== UserRole.TEACHER && <button type="button" onClick={() => handleCancelEdit('user')} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors" disabled={isSubmitting}>Hủy</button>}
                        <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition-colors" disabled={isSubmitting}>{editingUser && userForm.role !== UserRole.TEACHER ? 'Cập nhật' : 'Thêm người dùng'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManagementScreen;