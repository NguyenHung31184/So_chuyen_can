
import React, { useState, useContext, useRef, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Course, Teacher, Student, User, TeacherSpecialty, TeacherContractType, UserRole } from '../types';

// --- COMPONENT: Modal xác nhận --- //
const ConfirmationModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void; }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto">
            <p className="mb-4 text-gray-800">{message}</p>
            <div className="flex justify-end space-x-4">
                <button onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors">Không</button>
                <button onClick={onConfirm} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors">Có, Xóa</button>
            </div>
        </div>
    </div>
);

// --- COMPONENT: Màn hình quản lý (PHIÊN BẢN SỬA LỖI LOGIC BẤT ĐỒNG BỘ) --- //
const ManagementScreen: React.FC = () => {
    const context = useContext(AppContext);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- STATE: Biểu mẫu --- //
    const [courseForm, setCourseForm] = useState<Omit<Course, 'id'>>({ name: '', courseNumber: 0, startDate: '', endDate: '' });
    const [studentForm, setStudentForm] = useState<Omit<Student, 'id'>>({ name: '', birthDate: '', phone: '', group: '', courseId: '' });
    const [teacherForm, setTeacherForm] = useState<Omit<Teacher, 'id'>>({ name: '', phone: '', contractType: TeacherContractType.CONTRACT, specialty: TeacherSpecialty.THEORY, courseIds: [] });
    const [userForm, setUserForm] = useState<Omit<User, 'id'>>({ name: '', phone: '', role: UserRole.MANAGER });

    // --- STATE: Chỉnh sửa --- //
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // --- STATE: Khác --- //
    const [studentCourseFilter, setStudentCourseFilter] = useState<string>('all');
    const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; phone?: string; } | null>(null);

    if (!context) {
        return <div className="p-8 text-center text-red-500">Lỗi nghiêm trọng: Không thể tải được dữ liệu ứng dụng.</div>;
    }
    const { courses, students, teachers, users, addCourse, updateCourse, deleteCourse, addTeacher, updateTeacher, deleteTeacher, addStudent, updateStudent, deleteStudent, addUser, updateUser, deleteUser } = context;

    const filteredStudents = useMemo(() => {
        if (!Array.isArray(students)) return [];
        if (studentCourseFilter === 'all') return students;
        return students.filter(s => s?.courseId === studentCourseFilter);
    }, [students, studentCourseFilter]);

    const handleEdit = (type: string, item: any) => {
        if (!item) return;
        if (type === 'course') { setEditingCourse(item); setCourseForm(item); }
        if (type === 'teacher') {
            setEditingTeacher(item);
            setTeacherForm({ ...item, courseIds: item.courseIds ?? [] });
        }
        if (type === 'student') { setEditingStudent(item); setStudentForm(item); }
        if (type === 'user') { setEditingUser(item); setUserForm(item); }
    };

    const handleCancelEdit = (type: string) => {
        if (type === 'course') { setEditingCourse(null); setCourseForm({ name: '', courseNumber: 0, startDate: '', endDate: '' }); }
        if (type === 'teacher') { setEditingTeacher(null); setTeacherForm({ name: '', phone: '', contractType: TeacherContractType.CONTRACT, specialty: TeacherSpecialty.THEORY, courseIds: [] }); }
        if (type === 'student') { setEditingStudent(null); setStudentForm({ name: '', birthDate: '', phone: '', group: '', courseId: '' }); }
        if (type === 'user') { setEditingUser(null); setUserForm({ name: '', phone: '', role: UserRole.MANAGER }); }
    };

    // --- LOGIC GỬI BIỂU MẪU (ĐÃ SỬA LỖI BẤT ĐỒNG BỘ) --- //
    const handleSubmit = async (e: React.FormEvent, type: string) => {
        e.preventDefault();

        const isPhoneInUse = (phone: string, currentIdToExclude?: string) =>
            (users || []).some(user => user && user.phone === phone && user.id !== currentIdToExclude);

        try {
            if (type === 'teacher') {
                let userIdToExclude: string | undefined = undefined;

                if (editingTeacher) {
                    const linkedUser = (users || []).find(u => u && u.phone === editingTeacher.phone);
                    if (linkedUser) {
                        userIdToExclude = linkedUser.id;
                    }
                }

                if (isPhoneInUse(teacherForm.phone, userIdToExclude)) {
                    alert('LỖI: Số điện thoại này đã được một tài khoản khác sử dụng.');
                    return;
                }

                if (editingTeacher) {
                    await updateTeacher({ ...editingTeacher, ...teacherForm });
                    const linkedUser = (users || []).find(u => u && u.phone === editingTeacher.phone);
                    if (linkedUser && (teacherForm.name !== linkedUser.name || teacherForm.phone !== linkedUser.phone)) {
                        await updateUser({ ...linkedUser, name: teacherForm.name, phone: teacherForm.phone });
                    }
                } else {
                    await addTeacher(teacherForm);
                    await addUser({ name: teacherForm.name, phone: teacherForm.phone, role: UserRole.TEACHER });
                }
            } else if (type === 'user') {
                if (isPhoneInUse(userForm.phone, editingUser?.id)) {
                    alert('LỖI: Số điện thoại này đã tồn tại.');
                    return;
                }
                if (editingUser) {
                    await updateUser({ ...editingUser, ...userForm });
                } else {
                    await addUser(userForm);
                }
            } else if (type === 'student') {
                if (!studentForm.courseId) {
                    alert('Vui lòng chọn một khóa đào tạo.');
                    return;
                }
                if (editingStudent) {
                    await updateStudent({ ...editingStudent, ...studentForm });
                } else {
                    await addStudent(studentForm);
                }
            } else if (type === 'course') {
                if (editingCourse) {
                    await updateCourse({ ...editingCourse, ...courseForm });
                } else {
                    await addCourse(courseForm);
                }
            }
            handleCancelEdit(type);
        } catch (error) {
            console.error(`Lỗi khi đang ${editingCourse || editingStudent || editingTeacher || editingUser ? 'cập nhật' : 'thêm'}:`, error);
            alert(`Đã xảy ra lỗi khi lưu dữ liệu. Vui lòng thử lại.`);
        }
    };

    const handleDelete = (type: string, item: any) => {
        if (!item || !item.id) return;
        setConfirmDelete({ type, id: item.id, phone: item.phone });
    };

    // --- LOGIC XÓA (ĐÃ SỬA LỖI BẤT ĐỒNG BỘ) --- //
    const confirmDeletion = async () => {
        if (!confirmDelete) return;
        const { type, id, phone } = confirmDelete;
        try {
            if (type === 'course') {
                await deleteCourse(id);
            } else if (type === 'student') {
                await deleteStudent(id);
            } else if (type === 'teacher') {
                await deleteTeacher(id);
                if (phone) {
                    const linkedUser = (users || []).find(u => u?.phone === phone);
                    if (linkedUser) await deleteUser(linkedUser.id);
                }
            } else if (type === 'user') {
                const userToDelete = (users || []).find(u => u?.id === id);
                if (userToDelete?.role === UserRole.TEACHER && userToDelete.phone) {
                    const linkedTeacher = (teachers || []).find(t => t?.phone === userToDelete.phone);
                    if (linkedTeacher) await deleteTeacher(linkedTeacher.id);
                }
                await deleteUser(id);
            }
        } catch (error) {
            console.error("Lỗi khi đang xóa:", error);
            alert("Đã xảy ra lỗi khi xóa. Vui lòng thử lại.");
        }
        setConfirmDelete(null);
    };

    const getCourseDisplayString = (courseId: string) => {
        const course = (courses || []).find(c => c?.id === courseId);
        return course ? `${course.name ?? 'Lỗi tên'} - Khóa ${course.courseNumber ?? '?'}` : 'N/A';
    };

    const handleTeacherCourseChange = (courseId: string, isChecked: boolean) => {
        const currentCourseIds = teacherForm.courseIds ?? [];
        const newCourseIds = isChecked
            ? [...currentCourseIds, courseId]
            : currentCourseIds.filter(id => id !== courseId);
        setTeacherForm({ ...teacherForm, courseIds: newCourseIds });
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-gray-100 min-h-screen">
            {confirmDelete && <ConfirmationModal message="Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa?" onConfirm={confirmDeletion} onCancel={() => setConfirmDelete(null)} />}
            <input type="file" ref={fileInputRef} onChange={() => {}} accept=".xlsx, .xls" style={{ display: 'none' }} />
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Quản lý dữ liệu</h2>

            {/* --- Courses Section --- */}
            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <h3 className="text-xl font-bold mb-4">Danh sách khóa đào tạo</h3>
                <div className="space-y-2 mb-4 max-h-96 overflow-y-auto pr-2">
                    {(courses ?? []).map(item => item && (
                        <div key={item.id} className="flex justify-between items-center p-2 border rounded-lg">
                            <span>{item.name} - Khóa {item.courseNumber}</span>
                            <div>
                                <button onClick={() => handleEdit('course', item)} className="bg-green-500 text-white px-3 py-1 rounded-lg mr-2">Sửa</button>
                                <button onClick={() => handleDelete('course', item)} className="bg-red-500 text-white px-3 py-1 rounded-lg">Xóa</button>
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={(e) => handleSubmit(e, 'course')} className="space-y-4 pt-4 border-t">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input type="text" value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} placeholder="Tên khóa học" className="w-full p-2 border rounded" required/>
                         <input type="number" value={courseForm.courseNumber} onChange={e => setCourseForm({...courseForm, courseNumber: parseInt(e.target.value) || 0})} placeholder="Số khóa" className="w-full p-2 border rounded" required/>
                         <input type="text" onFocus={(e) => e.target.type='date'} onBlur={(e) => e.target.type='text'} value={courseForm.startDate} onChange={e => setCourseForm({...courseForm, startDate: e.target.value})} placeholder="Ngày bắt đầu" className="w-full p-2 border rounded" required/>
                         <input type="text" onFocus={(e) => e.target.type='date'} onBlur={(e) => e.target.type='text'} value={courseForm.endDate} onChange={e => setCourseForm({...courseForm, endDate: e.target.value})} placeholder="Ngày kết thúc" className="w-full p-2 border rounded" required/>
                    </div>
                    <div className="text-right space-x-2">
                        {editingCourse && <button type="button" onClick={() => handleCancelEdit('course')} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Hủy Sửa</button>}
                        <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg">{editingCourse ? 'Cập nhật' : 'Thêm'}</button>
                    </div>
                </form>
            </div>

            {/* --- Students Section --- */}
            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <h3 className="text-xl font-bold mb-4">Danh sách học viên</h3>
                <div className="mb-4">
                    <select value={studentCourseFilter} onChange={e => setStudentCourseFilter(e.target.value)} className="w-full md:w-1/2 p-2 border rounded-md">
                        <option value="all">Lọc theo khóa đào tạo: Tất cả</option>
                        {(courses ?? []).map(course => course && (
                            <option key={course.id} value={course.id}>{getCourseDisplayString(course.id)}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2 mb-4 max-h-96 overflow-y-auto pr-2">
                    {(filteredStudents ?? []).map(student => student && (
                        <div key={student.id} className="p-3 border rounded-lg">
                           <p><b>{student.name}</b> - Nhóm: {student.group}</p>
                           <p>Ngày sinh: {student.birthDate} - SĐT: {student.phone}</p>
                           <p>Khóa: {getCourseDisplayString(student.courseId)}</p>
                           <div className="text-right mt-2">
                               <button onClick={() => handleEdit('student', student)} className="bg-green-500 text-white px-3 py-1 rounded-lg mr-2">Sửa</button>
                               <button onClick={() => handleDelete('student', student)} className="bg-red-500 text-white px-3 py-1 rounded-lg">Xóa</button>
                           </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={(e) => handleSubmit(e, 'student')} className="space-y-4 pt-4 border-t">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <input type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} placeholder="Tên học viên" className="w-full p-2 border rounded" required />
                        <input type="text" onFocus={(e) => e.target.type='date'} onBlur={(e) => e.target.type='text'} value={studentForm.birthDate} onChange={e => setStudentForm({...studentForm, birthDate: e.target.value})} placeholder="Ngày sinh" className="w-full p-2 border rounded" required />
                        <input type="tel" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value})} placeholder="Số điện thoại" className="w-full p-2 border rounded" required />
                        <input type="text" value={studentForm.group} onChange={e => setStudentForm({...studentForm, group: e.target.value})} placeholder="Nhóm" className="w-full p-2 border rounded" required />
                        <select value={studentForm.courseId} onChange={e => setStudentForm({...studentForm, courseId: e.target.value})} className="w-full p-2 border rounded col-span-1 md:col-span-2 lg:col-span-3" required>
                            <option value="">-- Chọn khóa đào tạo --</option>
                            {(courses ?? []).map(course => course && (
                                <option key={course.id} value={course.id}>{getCourseDisplayString(course.id)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="text-right space-x-2">
                        {editingStudent && <button type="button" onClick={() => handleCancelEdit('student')} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Hủy Sửa</button>}
                        <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg">{editingStudent ? 'Cập nhật' : 'Thêm'}</button>
                    </div>
                </form>
            </div>

            {/* --- Teachers Section --- */}
             <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <h3 className="text-xl font-bold mb-4">Danh sách giáo viên</h3>
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-2">
                    {(teachers ?? []).map(teacher => teacher && (
                        <div key={teacher.id} className="p-3 border rounded-lg bg-gray-50">
                           <p><b>{teacher.name}</b> - SĐT: {teacher.phone}</p>
                           <p>Hình thức: {teacher.contractType} - Chuyên môn: {teacher.specialty}</p>
                            <p className="font-medium mt-1">Các khóa phụ trách:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {(teacher.courseIds ?? []).length > 0 ? (teacher.courseIds ?? []).map(id => (
                                    <span key={id} className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">{getCourseDisplayString(id)}</span>
                                )) : <span className="text-sm text-gray-500">Chưa phân công</span>}
                            </div>
                             <div className="text-right mt-2">
                                <button onClick={() => handleEdit('teacher', teacher)} className="bg-green-500 text-white px-3 py-1 rounded-lg mr-2">Sửa</button>
                                <button onClick={() => handleDelete('teacher', teacher)} className="bg-red-500 text-white px-3 py-1 rounded-lg">Xóa</button>
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={(e) => handleSubmit(e, 'teacher')} className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} placeholder="Tên giáo viên" className="w-full p-2 border rounded" required/>
                        <input type="tel" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: e.target.value})} placeholder="Số điện thoại" className="w-full p-2 border rounded" required/>
                        <select value={teacherForm.contractType} onChange={e => setTeacherForm({...teacherForm, contractType: e.target.value as TeacherContractType})} className="w-full p-2 border rounded">
                            <option value={TeacherContractType.CONTRACT}>Hợp đồng</option>
                            <option value={TeacherContractType.PERMANENT}>Cơ hữu</option>
                        </select>
                        <select value={teacherForm.specialty} onChange={e => setTeacherForm({...teacherForm, specialty: e.target.value as TeacherSpecialty})} className="w-full p-2 border rounded">
                            <option value={TeacherSpecialty.THEORY}>Lý thuyết</option>
                            <option value={TeacherSpecialty.PRACTICE}>Thực hành</option>
                            <option value={TeacherSpecialty.MANAGEMENT}>Quản lý</option>
                        </select>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Các khóa phụ trách</label>
                        <div className="space-y-2 p-3 border rounded-md max-h-40 overflow-y-auto bg-gray-50">
                            {(courses ?? []).length > 0 ? (courses ?? []).map(course => course && (
                                <div key={`chk-${course.id}`} className="flex items-center">
                                    <input
                                        id={`course-checkbox-${course.id}`}
                                        type="checkbox"
                                        checked={(teacherForm.courseIds ?? []).includes(course.id)}
                                        onChange={(e) => handleTeacherCourseChange(course.id, e.target.checked)}
                                        className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"
                                    />
                                    <label htmlFor={`course-checkbox-${course.id}`} className="ml-2 block text-sm text-gray-900">
                                        {getCourseDisplayString(course.id)}
                                    </label>
                                </div>
                            )) : <p className="text-sm text-gray-500">Chưa có khóa học nào để phân công.</p>}
                        </div>
                    </div>

                    <div className="text-right space-x-2 pt-2">
                        {editingTeacher && <button type="button" onClick={() => handleCancelEdit('teacher')} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Hủy Sửa</button>}
                        <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg">{editingTeacher ? 'Cập nhật' : 'Thêm'}</button>
                    </div>
                </form>
            </div>

            {/* --- Users Section --- */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold mb-4">Danh sách đăng nhập (Quản lý, Admin)</h3>
                 <div className="space-y-2 mb-4 max-h-72 overflow-y-auto pr-2">
                    {(users ?? []).filter(u => u && u.role !== UserRole.TEACHER && u.role !== UserRole.STUDENT).map(item => (
                        <div key={item.id} className="flex justify-between items-center p-2 border rounded-lg">
                            <span>{item.name} - {item.role} (SĐT: {item.phone})</span>
                            <div>
                                <button onClick={() => handleEdit('user', item)} className="bg-green-500 text-white px-3 py-1 rounded-lg mr-2">Sửa</button>
                                <button onClick={() => handleDelete('user', item)} className="bg-red-500 text-white px-3 py-1 rounded-lg">Xóa</button>
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={(e) => handleSubmit(e, 'user')} className="space-y-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">Chỉ thêm/sửa tài khoản Quản lý hoặc Admin. Tài khoản giáo viên được tạo tự động ở mục trên.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Tên người dùng" className="w-full p-2 border rounded" required/>
                        <input type="tel" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} placeholder="Số điện thoại (dùng để đăng nhập)" className="w-full p-2 border rounded" required/>
                        <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full p-2 border rounded">
                           <option value={UserRole.MANAGER}>Quản lý</option>
                           <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                    </div>
                    <div className="text-right space-x-2">
                        {editingUser && <button type="button" onClick={() => handleCancelEdit('user')} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Hủy Sửa</button>}
                        <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg">{editingUser ? 'Cập nhật' : 'Thêm'}</button>
                    </div>
                </form>
            </div>

        </div>
    );
};

export default ManagementScreen;
