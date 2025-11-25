import React, { useMemo, useState } from 'react';
import { User, UserRole } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { CollapsibleGroupCard, ListItemCard, ModalForm } from './ManagementUI';

const UserForm: React.FC<{
    initialData: User | null;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}> = ({ initialData, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<Partial<User> & { password?: string }>(initialData ? { ...initialData, password: '' } : { name: '', phone: '', role: UserRole.MANAGER, password: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (!initialData && (!formData.password || formData.password.length < 6)) throw new Error("Mật khẩu < 6 ký tự");
            const cleanData = { name: formData.name, phone: formData.phone, role: formData.role, password: formData.password };
            await onSubmit(cleanData);
            onClose();
        } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
    };

    return (
        <ModalForm isOpen={true} title={initialData ? "Cập nhật nhân sự" : "Thêm nhân sự"} onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting}>
            <div className="space-y-4">
                <input type="text" placeholder="Họ tên" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border rounded-lg" required />
                <input type="tel" placeholder="SĐT (Đăng nhập)" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3 border rounded-lg" required />
                <input type="password" placeholder={initialData ? "Mật khẩu mới" : "Mật khẩu"} value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-3 border rounded-lg" autoComplete="new-password" required={!initialData} />
                <select value={formData.role || ''} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full p-3 border rounded-lg">
                    <option value={UserRole.MANAGER}>Quản lý (Manager)</option>
                    <option value={UserRole.TEAM_LEADER}>Nhóm trưởng</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                </select>
                <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100">Lưu ý: Để thêm <strong>Giáo viên</strong>, vui lòng dùng tab "Giáo viên".</div>
            </div>
        </ModalForm>
    );
};

export const UserManager: React.FC = () => {
    const { users, addUser, updateUser, deleteUser } = useAppContext();
    const [editingItem, setEditingItem] = useState<User | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const { admins, managers, leaders } = useMemo(() => {
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
        } else await addUser(data);
    };

    return (
        <div className="pb-24">
            <CollapsibleGroupCard title="Admin" count={admins.length}>{admins.map(u => <ListItemCard key={u.id} title={u.name} subtitle={u.phone} onEdit={() => { setEditingItem(u); setIsFormOpen(true); }} onDelete={() => deleteUser(u.id)} />)}</CollapsibleGroupCard>
            <CollapsibleGroupCard title="Quản lý" count={managers.length}>{managers.map(u => <ListItemCard key={u.id} title={u.name} subtitle={u.phone} onEdit={() => { setEditingItem(u); setIsFormOpen(true); }} onDelete={() => deleteUser(u.id)} />)}</CollapsibleGroupCard>
            <CollapsibleGroupCard title="Nhóm trưởng" count={leaders.length}>{leaders.map(u => <ListItemCard key={u.id} title={u.name} subtitle={u.phone} onEdit={() => { setEditingItem(u); setIsFormOpen(true); }} onDelete={() => deleteUser(u.id)} />)}</CollapsibleGroupCard>
            <button onClick={() => { setEditingItem(null); setIsFormOpen(true); }} className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg z-30"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
            {isFormOpen && <UserForm initialData={editingItem} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} />}
        </div>
    );
};