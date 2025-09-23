import React, { useState, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Course, Student, User, Vehicle, TeacherSpecialty, TeacherContractType, UserRole, Screen, PaymentType, RateUnit, FuelType } from '../types';
import * as XLSX from 'xlsx';

// --- HELPER & UI COMPONENTS ---

// A reusable card for the top dashboard stats
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
        <div className={`rounded-full p-3 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);


// Reusable card component for each management section
const ManagementSectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-md mb-8">
        <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-6">{title}</h3>
        {children}
    </div>
);

// Consistent styling for form inputs
const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input 
        {...props} 
        className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:cursor-not-allowed" 
    />
);

// Consistent styling for select inputs
const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select 
        {...props} 
        className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
    >
        {props.children}
    </select>
);

// Consistent styling for buttons
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success' }> = ({ children, className, variant = 'primary', ...props }) => {
    const baseClasses = "inline-flex justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    };

    return (
        <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};


const ConfirmationModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void; }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Xác nhận hành động</h4>
            <p className="mb-6 text-gray-600">{message}</p>
            <div className="flex justify-end space-x-3">
                <Button variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button variant="danger" onClick={onConfirm}>Có, Xóa</Button>
            </div>
        </div>
    </div>
);


// --- MAIN SCREEN COMPONENT (REFACTORED) ---
const ManagementScreen: React.FC<ManagementScreenProps> = ({ setActiveScreen }) => {
    const context = useContext(AppContext);

    // --- STATE & FORMS (LOGIC UNCHANGED) ---
    const initialCourseForm: Omit<Course, 'id'> = { name: '', courseNumber: 0, startDate: '', endDate: '' };
    const initialStudentForm: Omit<Student, 'id'> = { name: '', birthDate: '', phone: '', group: '', courseId: '' };
    const initialTeacherForm: Partial<User> & { password?: string } = { name: '', phone: '', role: UserRole.TEACHER, contractType: TeacherContractType.CONTRACT, specialty: '' as any, courseIds: [], password: '', theoryPayment: { type: PaymentType.RATE, amount: 0, rateUnit: RateUnit.SESSION }, practicePayment: { type: PaymentType.RATE, amount: 0, rateUnit: RateUnit.SESSION } };
    const initialUserForm: Omit<User, 'id'> & { password?: string } = { name: '', phone: '', role: '' as any, password: '' };
    const initialVehicleForm: Omit<Vehicle, 'id'> = { name: '', licensePlate: '', fuelType: FuelType.DIESEL, consumptionRate: 0, consumptionUnit: 'lít/100km' };

    const [courseForm, setCourseForm] = useState(initialCourseForm);
    const [studentForm, setStudentForm] = useState(initialStudentForm);
    const [teacherForm, setTeacherForm] = useState(initialTeacherForm);
    const [userForm, setUserForm] = useState(initialUserForm);
    const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);

    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    const [studentCourseFilter, setStudentCourseFilter] = useState<string>('all');
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'course' | 'student' | 'user' | 'vehicle'; id: string; } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const studentFileInputRef = useRef<HTMLInputElement>(null);
    
    // --- CONTEXT & DATA DERIVATION (LOGIC UNCHANGED) ---
    if (!context) {
        return <div className="p-8 text-center text-red-500">Lỗi: Không thể tải được dữ liệu ứng dụng.</div>;
    }
    const { courses, students, users, vehicles, addCourse, updateCourse, deleteCourse, addStudent, updateStudent, deleteStudent, addUser, updateUser, deleteUser, addVehicle, updateVehicle, deleteVehicle } = context;

    const teachers = useMemo(() => (users || []).filter(u => u?.role === UserRole.TEACHER), [users]);
    const otherUsers = useMemo(() => (users || []).filter(u => u && (u.role === UserRole.ADMIN || u.role === UserRole.MANAGER || u.role === UserRole.TEAM_LEADER)), [users]);
    const filteredStudents = useMemo(() => {
        if (!Array.isArray(students)) return [];
        if (studentCourseFilter === 'all') return students;
        return students.filter(s => s?.courseId === studentCourseFilter);
    }, [students, studentCourseFilter]);
    
    // --- HANDLERS (LOGIC UNCHANGED) ---
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'student' | 'teacher') => { /* Logic không đổi */ };
    const handleEdit = (type: 'course' | 'student' | 'user' | 'vehicle', item: any) => {
        // ... (logic is identical to original)
        if (type === 'course') { setEditingCourse(item); setCourseForm(item); }
        else if (type === 'student') { setEditingStudent(item); setStudentForm(item); }
        else if (type === 'user') {
            setEditingUser(item);
            const itemWithoutPassword = { ...item, password: '' };
            if (item.role === UserRole.TEACHER) {
                setTeacherForm({ ...initialTeacherForm, ...itemWithoutPassword });
            } else {
                setUserForm(itemWithoutPassword);
            }
        }
        else if (type === 'vehicle') { setEditingVehicle(item); setVehicleForm(item); }
    };
    const handleCancelEdit = (type: string) => {
        // ... (logic is identical to original)
         if (type === 'course') { setEditingCourse(null); setCourseForm(initialCourseForm); }
        else if (type === 'student') { setEditingStudent(null); setStudentForm(initialStudentForm); }
        else if (type === 'user' || type === 'teacher') {
            setEditingUser(null);
            setUserForm(initialUserForm);
            setTeacherForm(initialTeacherForm);
        }
        else if (type === 'vehicle') { setEditingVehicle(null); setVehicleForm(initialVehicleForm); }
    };
    const handleSubmit = async (e: React.FormEvent, type: 'course' | 'student' | 'user' | 'vehicle', subType?: 'teacher' | 'manager') => {
        e.preventDefault();
        setIsSubmitting(true);
        // ... (logic is identical to original, no changes needed)
         try {
            switch (type) {
                case 'user': {
                    const form = subType === 'teacher' ? teacherForm : userForm;
                    const currentId = editingUser?.id;
                    if (subType === 'teacher' && !form.specialty) throw new Error('Vui lòng chọn chuyên môn cho giáo viên.');
                    if (subType === 'manager' && !form.role) throw new Error('Vui lòng chọn vai trò cho người dùng.');
                    if (!form.phone) throw new Error('Số điện thoại là bắt buộc.');
                    const isPhoneInUse = (users || []).some(user => user?.phone === form.phone && user.id !== currentId);
                    if (isPhoneInUse) throw new Error('Số điện thoại này đã được một tài khoản khác sử dụng.');
                    if (editingUser) {
                        const { password, ...dataToUpdate } = form;
                        const updatePayload = password && password.length >= 6 ? { ...dataToUpdate, password } : dataToUpdate;
                        await updateUser({ ...editingUser, ...updatePayload });
                    } else {
                        if (!form.password || form.password.length < 6) throw new Error('Mật khẩu là bắt buộc và phải có ít nhất 6 ký tự.');
                        await addUser(form as Omit<User, 'id'> & { password: string });
                    }
                    break;
                }
                case 'student': {
                    if (!studentForm.courseId) throw new Error('Vui lòng chọn một khóa đào tạo cho học viên.');
                    if (editingStudent) await updateStudent({ ...editingStudent, ...studentForm });
                    else await addStudent(studentForm);
                    break;
                }
                case 'course': {
                    if (editingCourse) await updateCourse({ ...editingCourse, ...courseForm });
                    else await addCourse(courseForm);
                    break;
                }
                case 'vehicle': {
                    if (editingVehicle) await updateVehicle({ ...editingVehicle, ...vehicleForm });
                    else await addVehicle(vehicleForm);
                    break;
                }
            }
            alert('Thao tác thành công!');
            handleCancelEdit(subType || type);
        } catch (error: any) {
            console.error(`Lỗi khi xử lý ${type}:`, error);
            alert(`Lỗi: ${error.message || 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleDeleteRequest = (type: 'course' | 'student' | 'user' | 'vehicle', id: string) => { setConfirmDelete({ type, id }); };
    const confirmDeletion = async () => {
        // ... (logic is identical to original)
        if (!confirmDelete) return;
        const { type, id } = confirmDelete;
        setIsSubmitting(true);
        try {
            if (type === 'course') await deleteCourse(id);
            else if (type === 'student') await deleteStudent(id);
            else if (type === 'user') await deleteUser(id);
            else if (type === 'vehicle') await deleteVehicle(id);
            alert('Xóa thành công!');
        } catch (err: any) { 
            console.error(`Lỗi khi xóa ${type}:`, err); 
            alert(`Lỗi: ${err.message || `Không thể xóa ${type}.`}`); 
        }
        finally { setIsSubmitting(false); setConfirmDelete(null); }
    };
    const getCourseDisplayString = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        return course ? `${course.name} (K${course.courseNumber})` : 'Không rõ';
    };
    const handleTeacherCourseChange = (courseId: string, isChecked: boolean) => {
        setTeacherForm(prev => ({ ...prev, courseIds: isChecked ? [...(prev.courseIds || []), courseId] : (prev.courseIds || []).filter(id => id !== courseId) }));
    };
    const handlePaymentChange = (paymentType: 'theoryPayment' | 'practicePayment', field: string, value: any) => {
        setTeacherForm(prev => ({ ...prev, [paymentType]: { ...(prev[paymentType] || {}), [field]: value } }));
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
            {confirmDelete && <ConfirmationModal message="Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác." onConfirm={confirmDeletion} onCancel={() => setConfirmDelete(null)} />}
            
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Quản trị hệ thống</h2>
            </header>

            {/* --- DASHBOARD STATS --- */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-8">
                <StatCard title="Tổng số Giáo viên" value={teachers.length} color="bg-blue-100 text-blue-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
                <StatCard title="Tổng số Học viên" value={students.length} color="bg-green-100 text-green-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                <StatCard title="Tổng số Khóa học" value={courses.length} color="bg-indigo-100 text-indigo-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m-9-5.747h18" /></svg>} />
                <StatCard title="Tổng số Phương tiện" value={vehicles.length} color="bg-amber-100 text-amber-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m-9-5.747h18" /></svg>} />
            </div>

            <ManagementSectionCard title="Nghiệp vụ & Báo cáo">
                <div className="max-w-sm">
                    <button onClick={() => setActiveScreen(Screen.RECONCILIATION_REPORT)} className="block p-6 bg-teal-50 border border-teal-200 rounded-lg shadow-sm hover:bg-teal-100 text-left w-full h-full transition-all">
                        <h5 className="mb-2 text-md font-bold tracking-tight text-teal-800">Báo cáo Đối chiếu Điểm danh</h5>
                        <p className="font-normal text-sm text-teal-700">So sánh và phát hiện sai lệch trong dữ liệu điểm danh.</p>
                    </button>
                </div>
            </ManagementSectionCard>

            <ManagementSectionCard title="Quản lý Giáo viên">
                <form onSubmit={(e) => handleSubmit(e, 'user', 'teacher')} className="space-y-6">
                    {/* Teacher Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormInput type="text" placeholder="Tên giáo viên" value={teacherForm.name || ''} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} required />
                        <FormInput type="tel" placeholder="SĐT (dùng để đăng nhập)" value={teacherForm.phone || ''} onChange={e => setTeacherForm({...teacherForm, phone: e.target.value})} required />
                        <FormInput type="password" placeholder={editingUser ? "Mật khẩu (để trống nếu không đổi)" : "Mật khẩu (ít nhất 6 ký tự)"} value={teacherForm.password || ''} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} autoComplete="new-password" required={!editingUser} />
                        <FormSelect value={teacherForm.specialty || ""} onChange={e => setTeacherForm({...teacherForm, specialty: e.target.value as TeacherSpecialty})} required>
                            <option value="" disabled>-- Chọn chuyên môn --</option>
                            <option value={TeacherSpecialty.THEORY}>Lý thuyết</option>
                            <option value={TeacherSpecialty.PRACTICE}>Thực hành</option>
                        </FormSelect>
                    </div>

                    {/* Payment Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-t border-gray-200 pt-6">
                        <div className="space-y-2"><h4 className="font-medium text-sm text-gray-600">Thù lao Lý thuyết</h4><FormSelect value={teacherForm.theoryPayment?.type} onChange={e => handlePaymentChange('theoryPayment', 'type', e.target.value)}>{Object.values(PaymentType).map(t => <option key={t} value={t}>{t}</option>)}</FormSelect><FormInput type="number" placeholder="Số tiền (VND)" value={teacherForm.theoryPayment?.amount || 0} onChange={e => handlePaymentChange('theoryPayment', 'amount', parseFloat(e.target.value))} />{teacherForm.theoryPayment?.type === PaymentType.RATE && (<FormSelect value={teacherForm.theoryPayment?.rateUnit} onChange={e => handlePaymentChange('theoryPayment', 'rateUnit', e.target.value)}>{Object.values(RateUnit).map(u => <option key={u} value={u}>{u}</option>)}</FormSelect>)}</div>
                        <div className="space-y-2"><h4 className="font-medium text-sm text-gray-600">Thù lao Thực hành</h4><FormSelect value={teacherForm.practicePayment?.type} onChange={e => handlePaymentChange('practicePayment', 'type', e.target.value)}>{Object.values(PaymentType).map(t => <option key={t} value={t}>{t}</option>)}</FormSelect><FormInput type="number" placeholder="Số tiền (VND)" value={teacherForm.practicePayment?.amount || 0} onChange={e => handlePaymentChange('practicePayment', 'amount', parseFloat(e.target.value))} />{teacherForm.practicePayment?.type === PaymentType.RATE && (<FormSelect value={teacherForm.practicePayment?.rateUnit} onChange={e => handlePaymentChange('practicePayment', 'rateUnit', e.target.value)}>{Object.values(RateUnit).map(u => <option key={u} value={u}>{u}</option>)}</FormSelect>)}</div>
                    </div>
                    
                    {/* Course Assignment */}
                    <div className="border-t border-gray-200 pt-6"><label className="block mb-2 font-medium text-sm text-gray-600">Phụ trách khóa</label><div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">{courses.map(c => (<label key={c.id} className="flex items-center space-x-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={(teacherForm.courseIds || []).includes(c.id)} onChange={e => handleTeacherCourseChange(c.id, e.target.checked)} /><span>{getCourseDisplayString(c.id)}</span></label>))}</div></div>
                    
                    {/* Actions */}
                    <div className="flex space-x-2"><Button type="submit" disabled={isSubmitting}>{editingUser ? 'Cập nhật' : 'Thêm giáo viên'}</Button>{editingUser && <Button type="button" variant="secondary" onClick={() => handleCancelEdit('teacher')}>Hủy</Button>}</div>
                </form>
                <div className="overflow-x-auto mt-6"><table className="min-w-full bg-white text-sm"><thead className="bg-gray-50"><tr><th className="py-2 px-4 text-left font-semibold text-gray-600">Tên Giáo viên</th><th className="py-2 px-4 text-left font-semibold text-gray-600">SĐT</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Chuyên môn</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Hành động</th></tr></thead><tbody className="divide-y divide-gray-200">{teachers.map(teacher => (<tr key={teacher.id}><td className="py-2 px-4">{teacher.name}</td><td className="py-2 px-4">{teacher.phone}</td><td className="py-2 px-4">{teacher.specialty}</td><td className="py-2 px-4 whitespace-nowrap"><button onClick={() => handleEdit('user', teacher)} className="text-blue-600 hover:underline font-medium mr-4">Sửa</button><button onClick={() => handleDeleteRequest('user', teacher.id)} className="text-red-600 hover:underline font-medium">Xóa</button></td></tr>))}</tbody></table></div>
            </ManagementSectionCard>

            <ManagementSectionCard title="Quản lý Khóa học">
                <form onSubmit={(e) => handleSubmit(e, 'course')} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end mb-6">
                    <div className="lg:col-span-2"><FormInput type="text" placeholder="Tên khóa học" value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} required /></div>
                    <div><FormInput type="number" placeholder="Số hiệu khóa" value={courseForm.courseNumber} onChange={e => setCourseForm({...courseForm, courseNumber: parseInt(e.target.value) || 0})} required/></div>
                    <div><FormInput type="date" value={courseForm.startDate} onChange={e => setCourseForm({...courseForm, startDate: e.target.value})} required/></div>
                    <div><FormInput type="date" value={courseForm.endDate} onChange={e => setCourseForm({...courseForm, endDate: e.target.value})} required/></div>
                    <div className="flex space-x-2 col-span-full lg:col-span-1">
                        <Button type="submit" disabled={isSubmitting} className="w-full">{editingCourse ? 'Cập nhật' : 'Thêm'}</Button>
                        {editingCourse && <Button type="button" variant="secondary" onClick={() => handleCancelEdit('course')} className="w-full">Hủy</Button>}
                    </div>
                </form>
                <div className="overflow-x-auto"><table className="min-w-full bg-white text-sm"><thead className="bg-gray-50"><tr><th className="py-2 px-4 text-left font-semibold text-gray-600">Tên khóa học</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Số hiệu</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Ngày bắt đầu</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Ngày kết thúc</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Hành động</th></tr></thead><tbody className="divide-y divide-gray-200">{courses.map(course => (<tr key={course.id}><td className="py-2 px-4">{course.name}</td><td className="py-2 px-4">{course.courseNumber}</td><td className="py-2 px-4">{course.startDate}</td><td className="py-2 px-4">{course.endDate}</td><td className="py-2 px-4 whitespace-nowrap"><button onClick={() => handleEdit('course', course)} className="text-blue-600 hover:underline font-medium mr-4">Sửa</button><button onClick={() => handleDeleteRequest('course', course.id)} className="text-red-600 hover:underline font-medium">Xóa</button></td></tr>))}</tbody></table></div>
            </ManagementSectionCard>

            <ManagementSectionCard title="Quản lý Học viên">
                 <form onSubmit={(e) => handleSubmit(e, 'student')} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-6">
                    <FormInput type="text" placeholder="Tên học viên" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} required />
                    <FormInput type="text" placeholder="SĐT" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value})} />
                    <FormSelect value={studentForm.courseId} onChange={e => setStudentForm({...studentForm, courseId: e.target.value})} required><option value="" disabled>-- Chọn khóa học --</option>{courses.map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)}</FormSelect>
                     <div className="flex space-x-2">
                        <Button type="submit" disabled={isSubmitting} className="w-full">{editingStudent ? 'Cập nhật' : 'Thêm'}</Button>
                        {editingStudent && <Button type="button" variant="secondary" onClick={() => handleCancelEdit('student')} className="w-full">Hủy</Button>}
                    </div>
                </form>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <FormSelect onChange={e => setStudentCourseFilter(e.target.value)} value={studentCourseFilter} className="w-full md:w-auto"><option value="all">Tất cả khóa học</option>{courses.map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)}</FormSelect>
                    <Button variant="success" onClick={() => studentFileInputRef.current?.click()} className="w-full md:w-auto">Nhập từ Excel</Button>
                    <input type="file" ref={studentFileInputRef} onChange={(e) => handleFileUpload(e, 'student')} accept=".xlsx, .xls" className="hidden" />
                </div>
                 <div className="overflow-x-auto"><table className="min-w-full bg-white text-sm"><thead className="bg-gray-50"><tr><th className="py-2 px-4 text-left font-semibold text-gray-600">Tên học viên</th><th className="py-2 px-4 text-left font-semibold text-gray-600">SĐT</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Khóa học</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Hành động</th></tr></thead><tbody className="divide-y divide-gray-200">{filteredStudents.map(student => (<tr key={student.id}><td className="py-2 px-4">{student.name}</td><td className="py-2 px-4">{student.phone}</td><td className="py-2 px-4">{getCourseDisplayString(student.courseId)}</td><td className="py-2 px-4 whitespace-nowrap"><button onClick={() => handleEdit('student', student)} className="text-blue-600 hover:underline font-medium mr-4">Sửa</button><button onClick={() => handleDeleteRequest('student', student.id)} className="text-red-600 hover:underline font-medium">Xóa</button></td></tr>))}</tbody></table></div>
            </ManagementSectionCard>

            <ManagementSectionCard title="Quản lý Phương tiện">
                <form onSubmit={(e) => handleSubmit(e, 'vehicle')} className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                        <FormInput type="text" placeholder="Tên / Loại xe" value={vehicleForm.name} onChange={e => setVehicleForm({...vehicleForm, name: e.target.value})} required />
                        <FormInput type="text" placeholder="Biển số xe" value={vehicleForm.licensePlate} onChange={e => setVehicleForm({...vehicleForm, licensePlate: e.target.value})} required/>
                        <FormSelect value={vehicleForm.fuelType} onChange={e => setVehicleForm({...vehicleForm, fuelType: e.target.value as FuelType})}>{Object.values(FuelType).map(f => <option key={f} value={f}>{f}</option>)}</FormSelect>
                        <FormInput type="number" placeholder="Định mức tiêu thụ" value={vehicleForm.consumptionRate} onChange={e => setVehicleForm({...vehicleForm, consumptionRate: parseFloat(e.target.value)})} required/>
                        <FormInput type="text" placeholder="Đơn vị (vd: lít/100km)" value={vehicleForm.consumptionUnit} onChange={e => setVehicleForm({...vehicleForm, consumptionUnit: e.target.value})} required/>
                    </div>
                    <div className="flex space-x-2"><Button type="submit" disabled={isSubmitting}>{editingVehicle ? 'Cập nhật' : 'Thêm'}</Button>{editingVehicle && <Button type="button" variant="secondary" onClick={() => handleCancelEdit('vehicle')}>Hủy</Button>}</div>
                </form>
                <div className="overflow-x-auto"><table className="min-w-full bg-white text-sm"><thead className="bg-gray-50"><tr><th className="py-2 px-4 text-left font-semibold text-gray-600">Tên / Loại xe</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Biển số</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Nhiên liệu</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Định mức</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Hành động</th></tr></thead><tbody className="divide-y divide-gray-200">{vehicles.map(v => (<tr key={v.id}><td className="py-2 px-4">{v.name}</td><td className="py-2 px-4">{v.licensePlate}</td><td className="py-2 px-4">{v.fuelType}</td><td className="py-2 px-4">{v.consumptionRate} {v.consumptionUnit}</td><td className="py-2 px-4 whitespace-nowrap"><button onClick={() => handleEdit('vehicle', v)} className="text-blue-600 hover:underline font-medium mr-4">Sửa</button><button onClick={() => handleDeleteRequest('vehicle', v.id)} className="text-red-600 hover:underline font-medium">Xóa</button></td></tr>))}</tbody></table></div>
            </ManagementSectionCard>

            <ManagementSectionCard title="Quản lý Người dùng khác">
                 <form onSubmit={(e) => handleSubmit(e, 'user', 'manager')} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-6">
                    <FormInput type="text" placeholder="Tên người dùng" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required />
                    <FormInput type="tel" placeholder="SĐT (dùng để đăng nhập)" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} required />
                    <FormInput type="password" placeholder={editingUser ? "Mật khẩu (để trống nếu không đổi)" : "Mật khẩu (ít nhất 6 ký tự)"} value={userForm.password || ''} onChange={e => setUserForm({...userForm, password: e.target.value})} autoComplete="new-password" required={!editingUser}/>
                    <FormSelect value={userForm.role || ''} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} required>
                        <option value="" disabled>-- Chọn vai trò --</option>
                        <option value={UserRole.MANAGER}>Quản lý</option>
                        <option value={UserRole.TEAM_LEADER}>Nhóm trưởng</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                    </FormSelect>
                    <div className="flex space-x-2 col-span-full">
                        <Button type="submit" disabled={isSubmitting}>{editingUser ? 'Cập nhật' : 'Thêm người dùng'}</Button>
                        {editingUser && <Button type="button" variant="secondary" onClick={() => handleCancelEdit('user')}>Hủy</Button>}
                    </div>
                </form>
                <div className="overflow-x-auto"><table className="min-w-full bg-white text-sm"><thead className="bg-gray-50"><tr><th className="py-2 px-4 text-left font-semibold text-gray-600">Tên người dùng</th><th className="py-2 px-4 text-left font-semibold text-gray-600">SĐT</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Vai trò</th><th className="py-2 px-4 text-left font-semibold text-gray-600">Hành động</th></tr></thead><tbody className="divide-y divide-gray-200">{otherUsers.map(user => (<tr key={user.id}><td className="py-2 px-4">{user.name}</td><td className="py-2 px-4">{user.phone}</td><td className="py-2 px-4">{user.role}</td><td className="py-2 px-4 whitespace-nowrap"><button onClick={() => handleEdit('user', user)} className="text-blue-600 hover:underline font-medium mr-4">Sửa</button><button onClick={() => handleDeleteRequest('user', user.id)} className="text-red-600 hover:underline font-medium">Xóa</button></td></tr>))}</tbody></table></div>
            </ManagementSectionCard>
        </div>
    );
};

export default ManagementScreen;