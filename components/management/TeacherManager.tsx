import React, { useMemo, useState } from 'react';
import { User, UserRole, TeacherSpecialty, PaymentType, RateUnit } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { CollapsibleGroupCard, ListItemCard, ModalForm } from './ManagementUI';

const TeacherForm: React.FC<{
    initialData: User | null;
    courses: any[];
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}> = ({ initialData, courses, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<Partial<User> & { password?: string }>(initialData ? { ...initialData, password: '' } : {
        name: '', phone: '', role: UserRole.TEACHER, password: '', 
        specialty: TeacherSpecialty.THEORY, courseIds: [],
        payment: { type: PaymentType.RATE, amount: 0, rateUnit: RateUnit.HOUR }
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (!initialData && (!formData.password || formData.password.length < 6)) {
                throw new Error("Mật khẩu phải từ 6 ký tự trở lên");
            }
            await onSubmit(formData);
            onClose();
        } catch (err: any) {
            alert(err.message || 'Lỗi lưu dữ liệu');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ModalForm isOpen={true} title={initialData ? "Cập nhật giáo viên" : "Thêm giáo viên mới"} onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting}>
            <div className="space-y-4">
                <input type="text" placeholder="Họ tên" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border rounded-lg" required />
                <input type="tel" placeholder="SĐT (Đăng nhập)" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3 border rounded-lg" required />
                <input type="password" placeholder={initialData ? "Mật khẩu mới (nếu đổi)" : "Mật khẩu"} value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-3 border rounded-lg" autoComplete="new-password" required={!initialData} />
                <select value={formData.specialty || ''} onChange={e => setFormData({ ...formData, specialty: e.target.value as TeacherSpecialty })} className="w-full p-3 border rounded-lg">
                    <option value={TeacherSpecialty.THEORY}>Lý thuyết</option>
                    <option value={TeacherSpecialty.PRACTICE}>Thực hành</option>
                    <option value={TeacherSpecialty.GENERAL}>Tổng hợp</option>
                </select>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="font-bold text-sm text-gray-700 mb-2">Lương dạy (VND/Giờ)</p>
                    <input type="number" value={formData.payment?.amount || 0} onChange={e => setFormData({ ...formData, payment: { type: PaymentType.RATE, rateUnit: RateUnit.HOUR, amount: Number(e.target.value) } })} className="w-full p-2 border rounded" />
                </div>
                 <div className="p-3 bg-gray-50 rounded-lg border max-h-40 overflow-y-auto">
                    <p className="font-bold mb-2 text-sm">Phụ trách khóa:</p>
                    {courses.map(c => (
                        <label key={c.id} className="flex items-center space-x-2 mb-1">
                            <input type="checkbox" checked={(formData.courseIds || []).includes(c.id)} onChange={e => {
                                const ids = formData.courseIds || [];
                                setFormData({...formData, courseIds: e.target.checked ? [...ids, c.id] : ids.filter(id => id !== c.id)});
                            }} />
                            <span className="text-sm">{`${c.name} - K${c.courseNumber}`}</span>
                        </label>
                    ))}
                </div>
            </div>
        </ModalForm>
    );
};

export const TeacherManager: React.FC = () => {
    const { users, courses, addUser, updateUser, deleteUser } = useAppContext();
    const [editingItem, setEditingItem] = useState<User | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const { theoryTeachers, practiceTeachers } = useMemo(() => {
        const all = (users || []).filter(u => u.role === UserRole.TEACHER);
        return {
            theoryTeachers: all.filter(t => t.specialty === TeacherSpecialty.THEORY),
            practiceTeachers: all.filter(t => t.specialty === TeacherSpecialty.PRACTICE)
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
            <CollapsibleGroupCard title="Giáo viên Lý thuyết" count={theoryTeachers.length}>
                {theoryTeachers.map(t => <ListItemCard key={t.id} title={t.name} subtitle={t.phone} onEdit={() => { setEditingItem(t); setIsFormOpen(true); }} onDelete={() => deleteUser(t.id)} />)}
            </CollapsibleGroupCard>
            <CollapsibleGroupCard title="Giáo viên Thực hành" count={practiceTeachers.length}>
                {practiceTeachers.map(t => <ListItemCard key={t.id} title={t.name} subtitle={t.phone} onEdit={() => { setEditingItem(t); setIsFormOpen(true); }} onDelete={() => deleteUser(t.id)} />)}
            </CollapsibleGroupCard>
            <button onClick={() => { setEditingItem(null); setIsFormOpen(true); }} className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg z-30"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
            {isFormOpen && <TeacherForm initialData={editingItem} courses={courses || []} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} />}
        </div>
    );
};