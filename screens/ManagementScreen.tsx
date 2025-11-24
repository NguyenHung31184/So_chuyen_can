import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Course, Student, User, Vehicle, TeacherSpecialty, UserRole, Screen, PaymentType, RateUnit, FuelType } from '../types';

// --- Micro-Components ---
const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap px-2 ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
    >
        {label}
    </button>
);

const ListItemCard: React.FC<{ 
    title: string; 
    subtitle?: string; 
    icon?: React.ReactNode;
    badges?: { text: string; color: string }[];
    onEdit: () => void; 
    onDelete: () => void; 
}> = ({ title, subtitle, icon, badges, onEdit, onDelete }) => (
    <div className="bg-white p-3 rounded-xl mb-2 flex items-center justify-between active:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 flex-shrink-0 border">
                {icon || <span className="font-bold text-sm">{title.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="min-w-0">
                <h4 className="font-bold text-gray-800 text-sm truncate">{title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                    {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
                    {badges && badges.map((badge, idx) => (
                        <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.color}`}>
                            {badge.text}
                        </span>
                    ))}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
    </div>
);

// --- NEW: Collapsible Group Card ---
const CollapsibleGroupCard: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-3">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <h3 className="font-bold text-gray-700">{title}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{count}</span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
            {isOpen && (
                <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in-fast">
                    {children}
                </div>
            )}
        </div>
    )
}

// --- Modal Form (Unchanged) ---
const ModalForm: React.FC<{ 
    isOpen: boolean; 
    title: string; 
    onClose: () => void; 
    onSubmit: (e: React.FormEvent) => void; 
    isSubmitting: boolean;
    children: React.ReactNode 
}> = ({ isOpen, title, onClose, onSubmit, isSubmitting, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500">✕</button>
                </div>
                <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                    {children}
                    <div className="pt-4">
                        <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 shadow-lg shadow-blue-500/30 transition-all">
                            {isSubmitting ? 'Đang xử lý...' : 'Lưu lại'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Main Component ---
const ManagementScreen: React.FC<{ setActiveScreen: (screen: Screen) => void }> = ({ setActiveScreen }) => {
    const context = useContext(AppContext);
    if (!context) return <div className="p-8 text-center text-red-500">Lỗi tải dữ liệu.</div>;
    const { courses, students, users, vehicles, addCourse, updateCourse, deleteCourse, addStudent, updateStudent, deleteStudent, addUser, updateUser, deleteUser, addVehicle, updateVehicle, deleteVehicle } = context;

    const [activeTab, setActiveTab] = useState<'teacher' | 'course' | 'student' | 'vehicle' | 'user'>('teacher');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const initialCourseForm: Omit<Course, 'id'> = { name: '', courseNumber: 0, startDate: '', endDate: '' };
    const initialStudentForm: Omit<Student, 'id'> = { name: '', birthDate: '', phone: '', group: '', courseId: '' };
    const initialTeacherForm: Partial<User> = { name: '', phone: '', role: UserRole.TEACHER, specialty: '' as any, courseIds: [], password: '', theoryPayment: { type: PaymentType.RATE, amount: 0, rateUnit: RateUnit.HOUR }, practicePayment: { type: PaymentType.RATE, amount: 0, rateUnit: RateUnit.HOUR } };
    const initialUserForm: Omit<User, 'id'> & { password?: string } = { name: '', phone: '', role: '' as any, password: '' };
    const initialVehicleForm: Omit<Vehicle, 'id'> = { name: '', licensePlate: '', fuelType: FuelType.DIESEL, consumptionRate: 0, consumptionUnit: 'lít/giờ' };

    const [formData, setFormData] = useState<any>({});

    const { teachers, theoryTeachers, practiceTeachers, otherUsers } = useMemo(() => {
        const allTeachers = (users || []).filter(u => u?.role === UserRole.TEACHER);
        return {
            teachers: allTeachers,
            theoryTeachers: allTeachers.filter(t => t.specialty === TeacherSpecialty.THEORY),
            practiceTeachers: allTeachers.filter(t => t.specialty === TeacherSpecialty.PRACTICE),
            otherUsers: (users || []).filter(u => u && (u.role === UserRole.ADMIN || u.role === UserRole.MANAGER || u.role === UserRole.TEAM_LEADER))
        };
    }, [users]);

    const openModal = (item: any = null, type?: 'teacher' | 'course' | 'student' | 'vehicle' | 'user') => {
        const tab = type || activeTab;
        setEditingItem(item);
        if (tab === 'teacher') setFormData(item ? { ...initialTeacherForm, ...item, password: '' } : initialTeacherForm);
        else if (tab === 'course') setFormData(item || initialCourseForm);
        else if (tab === 'student') setFormData(item || initialStudentForm);
        else if (tab === 'vehicle') setFormData(item || initialVehicleForm);
        else if (tab === 'user') setFormData(item ? { ...initialUserForm, ...item, password: '' } : initialUserForm);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, type: 'teacher' | 'course' | 'student' | 'vehicle' | 'user') => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa mục này không?')) return;
        try {
            if (type === 'teacher' || type === 'user') await deleteUser(id);
            else if (type === 'course') await deleteCourse(id);
            else if (type === 'student') await deleteStudent(id);
            else if (type === 'vehicle') await deleteVehicle(id);
            alert('Xóa thành công!');
        } catch (e) { alert('Lỗi khi xóa!'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const isEdit = !!editingItem;
            const type = activeTab;
            let payload = { ...formData };
            if (type === 'teacher' || type === 'user') {
                if (!payload.password || payload.password.length < 6) delete payload.password;
                if (isEdit) await updateUser(payload); else await addUser(payload);
            } else if (type === 'course') {
                if (isEdit) await updateCourse(payload); else await addCourse(payload);
            } else if (type === 'student') {
                if (isEdit) await updateStudent(payload); else await addStudent(payload);
            } else if (type === 'vehicle') {
                if (isEdit) await updateVehicle(payload); else await addVehicle(payload);
            }
            alert('Thao tác thành công!');
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message || 'Đã xảy ra lỗi');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCourseDisplayString = (id: string) => {
        const c = courses.find(co => co.id === id);
        return c ? `${c.name} (K${c.courseNumber})` : '---';
    };

    return (
        <div className="pb-24 bg-gray-50 min-h-screen font-sans">
            <div className="bg-white shadow-sm sticky top-0 z-20">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Quản trị hệ thống</h2>
                </div>
                <div className="flex overflow-x-auto no-scrollbar">
                    <TabButton active={activeTab === 'teacher'} onClick={() => setActiveTab('teacher')} label="Giáo viên" />
                    <TabButton active={activeTab === 'student'} onClick={() => setActiveTab('student')} label="Học viên" />
                    <TabButton active={activeTab === 'course'} onClick={() => setActiveTab('course')} label="Khóa học" />
                    <TabButton active={activeTab === 'vehicle'} onClick={() => setActiveTab('vehicle')} label="Xe tập" />
                    <TabButton active={activeTab === 'user'} onClick={() => setActiveTab('user')} label="Admin/QL" />
                </div>
            </div>

            <div className="p-4">
                {activeTab === 'teacher' && (
                    <>
                        <CollapsibleGroupCard title="Giáo viên Lý thuyết" count={theoryTeachers.length}>
                           {theoryTeachers.map(t => <ListItemCard key={t.id} title={t.name} subtitle={t.phone} onEdit={() => openModal(t)} onDelete={() => handleDelete(t.id, 'teacher')} />)}
                        </CollapsibleGroupCard>
                        <CollapsibleGroupCard title="Giáo viên Thực hành" count={practiceTeachers.length}>
                           {practiceTeachers.map(t => <ListItemCard key={t.id} title={t.name} subtitle={t.phone} onEdit={() => openModal(t)} onDelete={() => handleDelete(t.id, 'teacher')} />)}
                        </CollapsibleGroupCard>
                    </>
                )}
                
                {activeTab === 'student' && courses.map(course => {
                    const courseStudents = students.filter(s => s.courseId === course.id);
                    return (
                        <CollapsibleGroupCard key={course.id} title={`${course.name} - K${course.courseNumber}`} count={courseStudents.length}>
                           {courseStudents.map(s => <ListItemCard key={s.id} title={s.name} subtitle={s.phone} onEdit={() => openModal(s)} onDelete={() => handleDelete(s.id, 'student')} />)}
                        </CollapsibleGroupCard>
                    )
                })}

                {activeTab === 'course' && courses.map(c => (
                    <ListItemCard key={c.id} title={c.name} subtitle={`K${c.courseNumber}`} onEdit={() => openModal(c)} onDelete={() => handleDelete(c.id, 'course')} />
                ))}

                {activeTab === 'vehicle' && vehicles.map(v => (
                    <ListItemCard key={v.id} title={v.name} subtitle={v.licensePlate} onEdit={() => openModal(v)} onDelete={() => handleDelete(v.id, 'vehicle')} />
                ))}

                {activeTab === 'user' && otherUsers.map(u => (
                     <ListItemCard key={u.id} title={u.name} subtitle={u.role} onEdit={() => openModal(u)} onDelete={() => handleDelete(u.id, 'user')} />
                ))}
            </div>

            <button onClick={() => openModal(null)} className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-500/40 active:scale-90 transition-transform z-30">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>

            <ModalForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} isSubmitting={isSubmitting} title={editingItem ? 'Cập nhật' : 'Thêm mới'}>
                 {activeTab === 'teacher' && (
                    <>
                        <input type="text" placeholder="Tên giáo viên" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg" required />
                        <input type="tel" placeholder="SĐT (Đăng nhập)" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 border rounded-lg" required />
                        <input type="password" placeholder={editingItem ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu (bắt buộc)"} value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border rounded-lg" autoComplete="new-password" required={!editingItem} />
                        <select value={formData.specialty || ''} onChange={e => setFormData({...formData, specialty: e.target.value})} className="w-full p-3 border rounded-lg" required>
                            <option value="">-- Chuyên môn --</option>
                            <option value={TeacherSpecialty.THEORY}>Lý thuyết</option>
                            <option value={TeacherSpecialty.PRACTICE}>Thực hành</option>
                        </select>
                        <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="font-bold mb-2 text-sm">Lương dạy (VND/giờ)</p>
                            <input type="number" placeholder="Lương lý thuyết" value={formData.theoryPayment?.amount || 0} onChange={e => setFormData({...formData, theoryPayment: {...formData.theoryPayment, amount: Number(e.target.value), rateUnit: RateUnit.HOUR}})} className="w-full p-2 border rounded mb-2" />
                            <input type="number" placeholder="Lương thực hành" value={formData.practicePayment?.amount || 0} onChange={e => setFormData({...formData, practicePayment: {...formData.practicePayment, amount: Number(e.target.value), rateUnit: RateUnit.HOUR}})} className="w-full p-2 border rounded" />
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border max-h-40 overflow-y-auto">
                            <p className="font-bold mb-2 text-sm">Phụ trách khóa:</p>
                            {courses.map(c => (
                                <label key={c.id} className="flex items-center space-x-2 mb-1">
                                    <input type="checkbox" checked={(formData.courseIds || []).includes(c.id)} onChange={e => {
                                        const ids = formData.courseIds || [];
                                        setFormData({...formData, courseIds: e.target.checked ? [...ids, c.id] : ids.filter((id: string) => id !== c.id)});
                                    }} />
                                    <span className="text-sm">{`${c.name} - K${c.courseNumber}`}</span>
                                </label>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'student' && (
                     <>
                        <input type="text" placeholder="Tên học viên" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg" required />
                        <input type="tel" placeholder="SĐT" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 border rounded-lg" />
                        <input type="text" placeholder="Nhóm (VD: A, B)" value={formData.group || ''} onChange={e => setFormData({...formData, group: e.target.value})} className="w-full p-3 border rounded-lg" />
                        <select value={formData.courseId || ''} onChange={e => setFormData({...formData, courseId: e.target.value})} className="w-full p-3 border rounded-lg" required>
                            <option value="">-- Chọn khóa học --</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)}
                        </select>
                    </>
                )}

                {activeTab === 'course' && (
                    <>
                        <input type="text" placeholder="Tên khóa học" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg" required />
                        <input type="number" placeholder="Số hiệu khóa (K)" value={formData.courseNumber || ''} onChange={e => setFormData({...formData, courseNumber: Number(e.target.value)})} className="w-full p-3 border rounded-lg" required />
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-xs text-gray-500">Bắt đầu</label><input type="date" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full p-3 border rounded-lg" required /></div>
                            <div><label className="text-xs text-gray-500">Kết thúc</label><input type="date" value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full p-3 border rounded-lg" required /></div>
                        </div>
                    </>
                )}

                {activeTab === 'vehicle' && (
                    <>
                        <input type="text" placeholder="Tên xe (VD: Xe nâng 01)" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg" required />
                        <input type="text" placeholder="Biển số" value={formData.licensePlate || ''} onChange={e => setFormData({...formData, licensePlate: e.target.value})} className="w-full p-3 border rounded-lg" required />
                        <select value={formData.fuelType || FuelType.DIESEL} onChange={e => setFormData({...formData, fuelType: e.target.value})} className="w-full p-3 border rounded-lg">
                            <option value={FuelType.DIESEL}>Dầu Diesel</option>
                            <option value={FuelType.ELECTRIC}>Điện</option>
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" placeholder="Định mức tiêu thụ" value={formData.consumptionRate || ''} onChange={e => setFormData({...formData, consumptionRate: Number(e.target.value)})} className="w-full p-3 border rounded-lg" required />
                            <input type="text" placeholder="Đơn vị (lít/h)" value={formData.consumptionUnit || ''} onChange={e => setFormData({...formData, consumptionUnit: e.target.value})} className="w-full p-3 border rounded-lg" required />
                        </div>
                    </>
                )}

                {activeTab === 'user' && (
                     <>
                        <input type="text" placeholder="Tên người dùng" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg" required />
                        <input type="tel" placeholder="SĐT (Đăng nhập)" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 border rounded-lg" required />
                        <input type="password" placeholder={editingItem ? "Mật khẩu mới" : "Mật khẩu"} value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border rounded-lg" autoComplete="new-password" required={!editingItem} />
                        <select value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 border rounded-lg" required>
                            <option value="">-- Vai trò --</option>
                            <option value={UserRole.MANAGER}>Quản lý</option>
                            <option value={UserRole.TEAM_LEADER}>Nhóm trưởng</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                    </>
                )}
            </ModalForm>
        </div>
    );
};

export default ManagementScreen;
