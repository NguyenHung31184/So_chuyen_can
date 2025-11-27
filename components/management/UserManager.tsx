import React, { useMemo, useState } from 'react';
import { User, UserRole } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { CollapsibleGroupCard, ListItemCard, ModalForm } from './ManagementUI';

const UserForm: React.FC<{
    initialData: User | null;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}> = ({ initialData, onClose, onSubmit }) => {
    // 1. Lấy danh sách khóa học từ Context để hiển thị cho Admin chọn
    const { courses } = useAppContext();

    // 2. Khởi tạo state bao gồm cả field courseIds
    const [formData, setFormData] = useState<Partial<User> & { password?: string }>({
        name: initialData?.name || '',
        phone: initialData?.phone || '',
        role: initialData?.role || UserRole.TEAM_LEADER, // Mặc định là Nhóm trưởng để tiện thao tác
        password: '',
        courseIds: initialData?.courseIds || [], // Load danh sách khóa học đã gán (nếu có)
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Logic toggle chọn/bỏ chọn khóa học
    const handleToggleCourse = (courseId: string) => {
        setFormData(prev => {
            const currentIds = prev.courseIds || [];
            if (currentIds.includes(courseId)) {
                return { ...prev, courseIds: currentIds.filter(id => id !== courseId) };
            } else {
                return { ...prev, courseIds: [...currentIds, courseId] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (!initialData && (!formData.password || formData.password.length < 6)) {
                throw new Error("Mật khẩu phải từ 6 ký tự trở lên");
            }
            
            const cleanData = { 
                name: formData.name, 
                phone: formData.phone, 
                role: formData.role, 
                password: formData.password,
                // Chỉ lưu courseIds nếu user là Nhóm trưởng (hoặc role nào cần phân công)
                // Manager và Admin xem all nên có thể không cần, nhưng lưu cũng không sao.
                courseIds: formData.courseIds 
            };

            await onSubmit(cleanData);
            onClose();
        } catch (err: any) { 
            alert(err.message); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    // Lọc các khóa học đang hoạt động (active) để hiển thị cho gọn
    // Nếu muốn hiển thị cả khóa cũ để gán quyền xem lại, bạn có thể bỏ filter
    const activeCourses = useMemo(() => courses.filter(c => c.status !== 'inactive'), [courses]);

    return (
        <ModalForm 
            isOpen={true} 
            title={initialData ? "Cập nhật nhân sự" : "Thêm nhân sự"} 
            onClose={onClose} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting}
        >
            <div className="space-y-4">
                <input 
                    type="text" 
                    placeholder="Họ tên" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    required 
                />
                <input 
                    type="tel" 
                    placeholder="SĐT (Đăng nhập)" 
                    value={formData.phone || ''} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    required 
                />
                <input 
                    type="password" 
                    placeholder={initialData ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"} 
                    value={formData.password || ''} 
                    onChange={e => setFormData({ ...formData, password: e.target.value })} 
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    autoComplete="new-password" 
                    required={!initialData} 
                />
                
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vai trò</label>
                    <select 
                        value={formData.role || ''} 
                        onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} 
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value={UserRole.TEAM_LEADER}>Nhóm trưởng</option>
                        <option value={UserRole.MANAGER}>Quản lý (Manager)</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                    </select>
                </div>

                {/* UI CHỌN KHÓA HỌC - CHỈ HIỂN THỊ KHI ROLE LÀ TEAM_LEADER */}
                {formData.role === UserRole.TEAM_LEADER && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Phân công khóa học ({formData.courseIds?.length || 0})
                        </label>
                        {activeCourses.length > 0 ? (
                            <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                                {activeCourses.map(course => (
                                    <label key={course.id} className="flex items-center space-x-2 bg-white p-2 rounded border border-gray-100 cursor-pointer hover:bg-blue-50">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.courseIds?.includes(course.id)} 
                                            onChange={() => handleToggleCourse(course.id)}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-700">{course.name}</div>
                                            <div className="text-xs text-gray-400">K{course.courseNumber}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 italic text-center py-2">Chưa có khóa học nào đang hoạt động.</div>
                        )}
                        <p className="text-[10px] text-gray-500 mt-2">
                            * Nhóm trưởng chỉ xem và tạo báo cáo cho các khóa học được chọn.
                        </p>
                    </div>
                )}

                <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100">
                    Lưu ý: Để thêm <strong>Giáo viên</strong>, vui lòng dùng tab "Giáo viên".
                </div>
            </div>
        </ModalForm>
    );
};

export const UserManager: React.FC = () => {
    const { users, addUser, updateUser, deleteUser } = useAppContext();
    const [editingItem, setEditingItem] = useState<User | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const { admins, managers, leaders } = useMemo(() => {
        // Lọc bỏ Teacher vì họ được quản lý ở màn hình riêng
        const others = (users || []).filter(u => u.role !== UserRole.TEACHER);
        return {
            admins: others.filter(u => u.role === UserRole.ADMIN),
            managers: others.filter(u => u.role === UserRole.MANAGER),
            leaders: others.filter(u => u.role === UserRole.TEAM_LEADER)
        };
    }, [users]);

    const handleFormSubmit = async (data: any) => {
        if (editingItem) {
            const payload = { ...data, id: editingItem.id };
            if (!payload.password) delete payload.password;
            await updateUser(payload);
        } else {
            await addUser(data);
        }
    };

    return (
        <div className="pb-24 animate-fade-in">
            <CollapsibleGroupCard title="Admin" count={admins.length}>
                {admins.map(u => (
                    <ListItemCard 
                        key={u.id} 
                        title={u.name} 
                        subtitle={u.phone} 
                        onEdit={() => { setEditingItem(u); setIsFormOpen(true); }} 
                        onDelete={() => deleteUser(u.id)} 
                    />
                ))}
            </CollapsibleGroupCard>

            <CollapsibleGroupCard title="Quản lý" count={managers.length}>
                {managers.map(u => (
                    <ListItemCard 
                        key={u.id} 
                        title={u.name} 
                        subtitle={u.phone} 
                        onEdit={() => { setEditingItem(u); setIsFormOpen(true); }} 
                        onDelete={() => deleteUser(u.id)} 
                    />
                ))}
            </CollapsibleGroupCard>

            <CollapsibleGroupCard title="Nhóm trưởng" count={leaders.length}>
                {leaders.map(u => (
                    <ListItemCard 
                        key={u.id} 
                        title={u.name} 
                        subtitle={`${u.phone} • ${u.courseIds?.length || 0} khóa học`} // Hiển thị số lượng khóa được gán
                        onEdit={() => { setEditingItem(u); setIsFormOpen(true); }} 
                        onDelete={() => deleteUser(u.id)} 
                    />
                ))}
            </CollapsibleGroupCard>

            <button 
                onClick={() => { setEditingItem(null); setIsFormOpen(true); }} 
                className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg z-30 hover:bg-blue-700 transition-colors"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
            
            {isFormOpen && (
                <UserForm 
                    initialData={editingItem} 
                    onClose={() => setIsFormOpen(false)} 
                    onSubmit={handleFormSubmit} 
                />
            )}
        </div>
    );
};