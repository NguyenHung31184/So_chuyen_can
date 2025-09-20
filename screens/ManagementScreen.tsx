import React, { useState, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Course, Student, User, Vehicle, TeacherSpecialty, TeacherContractType, UserRole, Screen, PaymentType, RateUnit, FuelType } from '../types';
import * as XLSX from 'xlsx';

// --- COMPONENTS ---
interface ManagementScreenProps {
    setActiveScreen: (screen: Screen) => void;
}

const ManagementCard: React.FC<{ title: string; description: string; onClick: () => void, className?: string }> = ({ title, description, onClick, className = '' }) => (
    <button onClick={onClick} className={`block p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 text-left w-full h-full transition-all ${className}`}>
        <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900">{title}</h5>
        <p className="font-normal text-gray-700">{description}</p>
    </button>
);

const ConfirmationModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void; }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto">
            <p className="mb-4 text-gray-800">{message}</p>
            <div className="flex justify-end space-x-4">
                <button onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg">Không</button>
                <button onClick={onConfirm} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">Có, Xóa</button>
            </div>
        </div>
    </div>
);

// --- MAIN SCREEN COMPONENT ---
const ManagementScreen: React.FC<ManagementScreenProps> = ({ setActiveScreen }) => {
    const context = useContext(AppContext);

    // --- STATE & FORMS ---
    const initialCourseForm: Omit<Course, 'id'> = { name: '', courseNumber: 0, startDate: '', endDate: '' };
    const initialStudentForm: Omit<Student, 'id'> = { name: '', birthDate: '', phone: '', group: '', courseId: '' };
    const initialTeacherForm: Partial<User> & { password?: string } = { name: '', phone: '', role: UserRole.TEACHER, contractType: TeacherContractType.CONTRACT, specialty: TeacherSpecialty.THEORY, courseIds: [], password: '', theoryPayment: { type: PaymentType.RATE, amount: 0, rateUnit: RateUnit.SESSION }, practicePayment: { type: PaymentType.RATE, amount: 0, rateUnit: RateUnit.SESSION } };
    const initialUserForm: Omit<User, 'id'> & { password?: string } = { name: '', phone: '', role: UserRole.MANAGER, password: '' };
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
    const teacherFileInputRef = useRef<HTMLInputElement>(null);

    if (!context) {
        return <div className="p-8 text-center">Đang tải context...</div>;
    }
    const { courses, students, users, vehicles, addCourse, updateCourse, deleteCourse, addStudent, updateStudent, deleteStudent, addUser, updateUser, deleteUser, addVehicle, updateVehicle, deleteVehicle } = context;

    const teachers = useMemo(() => (users || []).filter(u => u?.role === UserRole.TEACHER), [users]);
    const otherUsers = useMemo(() => (users || []).filter(u => u && (u.role === UserRole.ADMIN || u.role === UserRole.MANAGER || u.role === UserRole.TEAM_LEADER)), [users]);
    const filteredStudents = useMemo(() => {
        if (!Array.isArray(students)) return [];
        if (studentCourseFilter === 'all') return students;
        return students.filter(s => s?.courseId === studentCourseFilter);
    }, [students, studentCourseFilter]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'student' | 'teacher') => { /* ... */ };

    const handleEdit = (type: 'course' | 'student' | 'user' | 'vehicle', item: any) => {
        if (type === 'course') { setEditingCourse(item); setCourseForm(item); }
        else if (type === 'student') { setEditingStudent(item); setStudentForm(item); }
        else if (type === 'user') {
            setEditingUser(item);
            if (item.role === UserRole.TEACHER) { setTeacherForm({ ...initialTeacherForm, ...item, password: '' }); }
            else { setUserForm({ ...item, password: '' }); }
        }
        else if (type === 'vehicle') { setEditingVehicle(item); setVehicleForm(item); }
    };
    
    const handleCancelEdit = (type: string) => {
        if (type === 'course') { setEditingCourse(null); setCourseForm(initialCourseForm); }
        else if (type === 'student') { setEditingStudent(null); setStudentForm(initialStudentForm); }
        else if (type === 'teacher') { setEditingUser(null); setTeacherForm(initialTeacherForm); }
        else if (type === 'user') { setEditingUser(null); setUserForm(initialUserForm); }
        else if (type === 'vehicle') { setEditingVehicle(null); setVehicleForm(initialVehicleForm); }
    };

    const handleSubmit = async (e: React.FormEvent, type: 'course' | 'student' | 'user' | 'vehicle', subType?: 'teacher' | 'manager') => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (type === 'course') {
                if (editingCourse) await updateCourse({ ...courseForm, id: editingCourse.id }); else await addCourse(courseForm);
                handleCancelEdit('course');
            } else if (type === 'student') {
                if (editingStudent) await updateStudent({ ...studentForm, id: editingStudent.id }); else await addStudent(studentForm);
                handleCancelEdit('student');
            } else if (type === 'user' && subType === 'teacher') {
                const { password, ...teacherData } = teacherForm;
                if (editingUser) await updateUser({ ...teacherData, id: editingUser.id }); else await addUser({ ...teacherData, password } as Omit<User, 'id'> & { password?: string });
                handleCancelEdit('teacher');
            } else if (type === 'user' && subType === 'manager') {
                const { password, ...userData } = userForm;
                if (editingUser) await updateUser({ ...userData, id: editingUser.id }); else await addUser({ ...userData, password } as Omit<User, 'id'> & { password?: string });
                handleCancelEdit('user');
            } else if (type === 'vehicle') {
                if (editingVehicle) await updateVehicle({ ...vehicleForm, id: editingVehicle.id }); else await addVehicle(vehicleForm);
                handleCancelEdit('vehicle');
            }
        } catch (err) { console.error(`Lỗi khi lưu ${type}:`, err); alert(`Đã xảy ra lỗi, không thể lưu ${type}.`); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteRequest = (type: 'course' | 'student' | 'user' | 'vehicle', id: string) => { setConfirmDelete({ type, id }); };

    const confirmDeletion = async () => {
        if (!confirmDelete) return;
        const { type, id } = confirmDelete;
        setIsSubmitting(true);
        try {
            if (type === 'course') await deleteCourse(id);
            else if (type === 'student') await deleteStudent(id);
            else if (type === 'user') await deleteUser(id);
            else if (type === 'vehicle') await deleteVehicle(id);
        } catch (err) { console.error(`Lỗi khi xóa ${type}:`, err); alert(`Đã xảy ra lỗi, không thể xóa ${type}.`); }
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
        setTeacherForm(prev => ({ ...prev, [paymentType]: { ...prev[paymentType], [field]: value } }));
    };
    
    return (
        <div className="p-4 md:p-6 lg:p-8 bg-gray-100 min-h-screen">
            {confirmDelete && <ConfirmationModal message="Bạn có chắc chắn muốn xóa mục này?" onConfirm={confirmDeletion} onCancel={() => setConfirmDelete(null)} />}
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Quản trị hệ thống</h2>
            
            <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Nghiệp vụ & Báo cáo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ManagementCard title="Báo cáo Đối chiếu Điểm danh" description="So sánh và phát hiện sai lệch trong dữ liệu điểm danh." onClick={() => setActiveScreen(Screen.RECONCILIATION_REPORT)} className="bg-teal-50 hover:bg-teal-100" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Quản lý Khóa học</h3>
                <form onSubmit={(e) => handleSubmit(e, 'course')} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end mb-6">
                    <input type="text" placeholder="Tên khóa học" value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} className="p-2 border rounded col-span-1 lg:col-span-2" required />
                    <input type="number" placeholder="Số hiệu khóa" value={courseForm.courseNumber} onChange={e => setCourseForm({...courseForm, courseNumber: parseInt(e.target.value) || 0})} className="p-2 border rounded col-span-1" required/>
                    <input type="date" value={courseForm.startDate} onChange={e => setCourseForm({...courseForm, startDate: e.target.value})} className="p-2 border rounded col-span-1" required/>
                    <input type="date" value={courseForm.endDate} onChange={e => setCourseForm({...courseForm, endDate: e.target.value})} className="p-2 border rounded col-span-1" required/>
                    <div className="flex space-x-2 col-span-full lg:col-span-1">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300">{editingCourse ? 'Cập nhật' : 'Thêm'}</button>
                        {editingCourse && <button type="button" onClick={() => handleCancelEdit('course')} className="w-full bg-gray-300 p-2 rounded hover:bg-gray-400">Hủy</button>}
                    </div>
                </form>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-200"><tr><th className="py-2 px-4 text-left">Tên khóa học</th><th className="py-2 px-4 text-left">Số hiệu</th><th className="py-2 px-4 text-left">Ngày bắt đầu</th><th className="py-2 px-4 text-left">Ngày kết thúc</th><th className="py-2 px-4 text-left">Hành động</th></tr></thead>
                        <tbody>
                            {courses.map(course => (<tr key={course.id} className="border-b"><td className="py-2 px-4">{course.name}</td><td className="py-2 px-4">{course.courseNumber}</td><td className="py-2 px-4">{course.startDate}</td><td className="py-2 px-4">{course.endDate}</td><td className="py-2 px-4"><button onClick={() => handleEdit('course', course)} className="text-blue-500 hover:underline mr-4">Sửa</button><button onClick={() => handleDeleteRequest('course', course.id)} className="text-red-500 hover:underline">Xóa</button></td></tr>))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Quản lý Học viên</h3>
                 <form onSubmit={(e) => handleSubmit(e, 'student')} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-6">
                    <input type="text" placeholder="Tên học viên" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="p-2 border rounded" required />
                    <input type="text" placeholder="SĐT" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value})} className="p-2 border rounded" />
                    <select value={studentForm.courseId} onChange={e => setStudentForm({...studentForm, courseId: e.target.value})} className="p-2 border rounded" required><option value="" disabled>Chọn khóa học</option>{courses.map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)}</select>
                     <div className="flex space-x-2">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300">{editingStudent ? 'Cập nhật' : 'Thêm'}</button>
                        {editingStudent && <button type="button" onClick={() => handleCancelEdit('student')} className="w-full bg-gray-300 p-2 rounded hover:bg-gray-400">Hủy</button>}
                    </div>
                </form>
                <div className="flex justify-between items-center mb-4">
                    <select onChange={e => setStudentCourseFilter(e.target.value)} value={studentCourseFilter} className="p-2 border rounded"><option value="all">Tất cả khóa học</option>{courses.map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)}</select>
                    <button onClick={() => studentFileInputRef.current?.click()} className="bg-green-500 text-white p-2 rounded hover:bg-green-600">Nhập từ Excel</button>
                    <input type="file" ref={studentFileInputRef} onChange={(e) => handleFileUpload(e, 'student')} accept=".xlsx, .xls" className="hidden" />
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-200"><tr><th className="py-2 px-4 text-left">Tên học viên</th><th className="py-2 px-4 text-left">SĐT</th><th className="py-2 px-4 text-left">Khóa học</th><th className="py-2 px-4 text-left">Hành động</th></tr></thead>
                        <tbody>
                            {filteredStudents.map(student => (<tr key={student.id} className="border-b"><td className="py-2 px-4">{student.name}</td><td className="py-2 px-4">{student.phone}</td><td className="py-2 px-4">{getCourseDisplayString(student.courseId)}</td><td className="py-2 px-4"><button onClick={() => handleEdit('student', student)} className="text-blue-500 hover:underline mr-4">Sửa</button><button onClick={() => handleDeleteRequest('student', student.id)} className="text-red-500 hover:underline">Xóa</button></td></tr>))}
                        </tbody>
                    </table>
                </div>
            </div>

             <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                 <h3 className="text-xl font-bold text-gray-700 mb-4">Quản lý Giáo viên</h3>
                <form onSubmit={(e) => handleSubmit(e, 'user', 'teacher')} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><input type="text" placeholder="Tên giáo viên" value={teacherForm.name || ''} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="p-2 border rounded" required /><input type="text" placeholder="SĐT (dùng để đăng nhập)" value={teacherForm.phone || ''} onChange={e => setTeacherForm({...teacherForm, phone: e.target.value})} className="p-2 border rounded" required /><input type="password" placeholder="Mật khẩu (để trống nếu không đổi)" value={teacherForm.password || ''} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} className="p-2 border rounded" autoComplete="new-password" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
                        <div className="space-y-2"><h4 className="font-semibold text-gray-600">Thù lao Lý thuyết</h4><select value={teacherForm.theoryPayment?.type} onChange={e => handlePaymentChange('theoryPayment', 'type', e.target.value)} className="w-full p-2 border rounded">{Object.values(PaymentType).map(t => <option key={t} value={t}>{t}</option>)}</select><input type="number" placeholder="Số tiền (VND)" value={teacherForm.theoryPayment?.amount || 0} onChange={e => handlePaymentChange('theoryPayment', 'amount', parseFloat(e.target.value))} className="w-full p-2 border rounded" />{teacherForm.theoryPayment?.type === PaymentType.RATE && (<select value={teacherForm.theoryPayment?.rateUnit} onChange={e => handlePaymentChange('theoryPayment', 'rateUnit', e.target.value)} className="w-full p-2 border rounded">{Object.values(RateUnit).map(u => <option key={u} value={u}>{u}</option>)}</select>)}</div>
                        <div className="space-y-2"><h4 className="font-semibold text-gray-600">Thù lao Thực hành</h4><select value={teacherForm.practicePayment?.type} onChange={e => handlePaymentChange('practicePayment', 'type', e.target.value)} className="w-full p-2 border rounded">{Object.values(PaymentType).map(t => <option key={t} value={t}>{t}</option>)}</select><input type="number" placeholder="Số tiền (VND)" value={teacherForm.practicePayment?.amount || 0} onChange={e => handlePaymentChange('practicePayment', 'amount', parseFloat(e.target.value))} className="w-full p-2 border rounded" />{teacherForm.practicePayment?.type === PaymentType.RATE && (<select value={teacherForm.practicePayment?.rateUnit} onChange={e => handlePaymentChange('practicePayment', 'rateUnit', e.target.value)} className="w-full p-2 border rounded">{Object.values(RateUnit).map(u => <option key={u} value={u}>{u}</option>)}</select>)}</div>
                    </div>
                    <div className="border-t pt-4"><label className="block mb-2 font-semibold">Phụ trách khóa:</label><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{courses.map(c => (<label key={c.id} className="flex items-center space-x-2"><input type="checkbox" checked={(teacherForm.courseIds || []).includes(c.id)} onChange={e => handleTeacherCourseChange(c.id, e.target.checked)} /><span>{c.name}</span></label>))}</div></div>
                    <div className="flex space-x-2"><button type="submit" disabled={isSubmitting} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300">{editingUser && editingUser.role === UserRole.TEACHER ? 'Cập nhật' : 'Thêm'}</button>{editingUser && editingUser.role === UserRole.TEACHER && <button type="button" onClick={() => handleCancelEdit('teacher')} className="bg-gray-300 p-2 rounded hover:bg-gray-400">Hủy</button>}</div>
                </form>
                 <div className="overflow-x-auto mt-6"><table className="min-w-full bg-white"><thead className="bg-gray-200"><tr><th className="py-2 px-4 text-left">Tên Giáo viên</th><th className="py-2 px-4 text-left">SĐT</th><th className="py-2 px-4 text-left">Chuyên môn</th><th className="py-2 px-4 text-left">Hành động</th></tr></thead><tbody>{teachers.map(teacher => (<tr key={teacher.id} className="border-b"><td className="py-2 px-4">{teacher.name}</td><td className="py-2 px-4">{teacher.phone}</td><td className="py-2 px-4">{teacher.specialty}</td><td className="py-2 px-4"><button onClick={() => handleEdit('user', teacher)} className="text-blue-500 hover:underline mr-4">Sửa</button><button onClick={() => handleDeleteRequest('user', teacher.id)} className="text-red-500 hover:underline">Xóa</button></td></tr>))}</tbody></table></div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Quản lý Phương tiện</h3>
                <form onSubmit={(e) => handleSubmit(e, 'vehicle')} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end mb-6">
                    <input type="text" placeholder="Tên / Loại xe" value={vehicleForm.name} onChange={e => setVehicleForm({...vehicleForm, name: e.target.value})} className="p-2 border rounded col-span-1" required /><input type="text" placeholder="Biển số xe" value={vehicleForm.licensePlate} onChange={e => setVehicleForm({...vehicleForm, licensePlate: e.target.value})} className="p-2 border rounded col-span-1" required/><select value={vehicleForm.fuelType} onChange={e => setVehicleForm({...vehicleForm, fuelType: e.target.value as FuelType})} className="p-2 border rounded col-span-1">{Object.values(FuelType).map(f => <option key={f} value={f}>{f}</option>)}</select><input type="number" placeholder="Định mức tiêu thụ" value={vehicleForm.consumptionRate} onChange={e => setVehicleForm({...vehicleForm, consumptionRate: parseFloat(e.target.value)})} className="p-2 border rounded col-span-1" required/><input type="text" placeholder="Đơn vị (vd: lít/100km)" value={vehicleForm.consumptionUnit} onChange={e => setVehicleForm({...vehicleForm, consumptionUnit: e.target.value})} className="p-2 border rounded col-span-1" required/>
                    <div className="flex space-x-2 col-span-full"><button type="submit" disabled={isSubmitting} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300">{editingVehicle ? 'Cập nhật' : 'Thêm'}</button>{editingVehicle && <button type="button" onClick={() => handleCancelEdit('vehicle')} className="bg-gray-300 p-2 rounded hover:bg-gray-400">Hủy</button>}</div>
                </form>
                <div className="overflow-x-auto"><table className="min-w-full bg-white"><thead className="bg-gray-200"><tr><th className="py-2 px-4 text-left">Tên / Loại xe</th><th className="py-2 px-4 text-left">Biển số</th><th className="py-2 px-4 text-left">Nhiên liệu</th><th className="py-2 px-4 text-left">Định mức</th><th className="py-2 px-4 text-left">Hành động</th></tr></thead><tbody>{vehicles.map(v => (<tr key={v.id} className="border-b"><td className="py-2 px-4">{v.name}</td><td className="py-2 px-4">{v.licensePlate}</td><td className="py-2 px-4">{v.fuelType}</td><td className="py-2 px-4">{v.consumptionRate} {v.consumptionUnit}</td><td className="py-2 px-4"><button onClick={() => handleEdit('vehicle', v)} className="text-blue-500 hover:underline mr-4">Sửa</button><button onClick={() => handleDeleteRequest('vehicle', v.id)} className="text-red-500 hover:underline">Xóa</button></td></tr>))}</tbody></table></div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Quản lý Người dùng khác</h3>
                 <form onSubmit={(e) => handleSubmit(e, 'user', 'manager')} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-6">
                    <input type="text" placeholder="Tên người dùng" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="p-2 border rounded" required /><input type="text" placeholder="SĐT (dùng để đăng nhập)" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} className="p-2 border rounded" required /><input type="password" placeholder="Mật khẩu (để trống nếu không đổi)" value={userForm.password || ''} onChange={e => setUserForm({...userForm, password: e.target.value})} className="p-2 border rounded" autoComplete="new-password"/><select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="p-2 border rounded"><option value={UserRole.MANAGER}>Quản lý</option><option value={UserRole.TEAM_LEADER}>Nhóm trưởng</option><option value={UserRole.ADMIN}>Admin</option></select>
                    <div className="flex space-x-2 col-span-full"><button type="submit" disabled={isSubmitting} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300">{editingUser && editingUser.role !== UserRole.TEACHER ? 'Cập nhật' : 'Thêm'}</button>{editingUser && editingUser.role !== UserRole.TEACHER && <button type="button" onClick={() => handleCancelEdit('user')} className="bg-gray-300 p-2 rounded hover:bg-gray-400">Hủy</button>}</div>
                </form>
                <div className="overflow-x-auto"><table className="min-w-full bg-white"><thead className="bg-gray-200"><tr><th className="py-2 px-4 text-left">Tên người dùng</th><th className="py-2 px-4 text-left">SĐT</th><th className="py-2 px-4 text-left">Vai trò</th><th className="py-2 px-4 text-left">Hành động</th></tr></thead><tbody>{otherUsers.map(user => (<tr key={user.id} className="border-b"><td className="py-2 px-4">{user.name}</td><td className="py-2 px-4">{user.phone}</td><td className="py-2 px-4">{user.role}</td><td className="py-2 px-4"><button onClick={() => handleEdit('user', user)} className="text-blue-500 hover:underline mr-4">Sửa</button><button onClick={() => handleDeleteRequest('user', user.id)} className="text-red-500 hover:underline">Xóa</button></td></tr>))}</tbody></table></div>
            </div>
        </div>
    );
};

export default ManagementScreen;