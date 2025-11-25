import React, { useState } from 'react';
import { Course } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { ListItemCard, ModalForm } from './ManagementUI';

const CourseForm: React.FC<{
    initialData: Course | null;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}> = ({ initialData, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<Partial<Course>>(initialData || { name: '', courseNumber: 0, startDate: '', endDate: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try { await onSubmit(formData); onClose(); } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
    };

    return (
        <ModalForm isOpen={true} title={initialData ? "Cập nhật khóa học" : "Thêm khóa học"} onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting}>
            <div className="space-y-4">
                <input type="text" placeholder="Tên khóa (VD: Hạng B2)" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border rounded-lg" required />
                <input type="number" placeholder="Số hiệu khóa (K)" value={formData.courseNumber || ''} onChange={e => setFormData({ ...formData, courseNumber: Number(e.target.value) })} className="w-full p-3 border rounded-lg" required />
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-gray-500">Bắt đầu</label><input type="date" value={formData.startDate || ''} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full p-3 border rounded-lg" required /></div>
                    <div><label className="text-xs text-gray-500">Kết thúc</label><input type="date" value={formData.endDate || ''} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full p-3 border rounded-lg" required /></div>
                </div>
            </div>
        </ModalForm>
    );
};

export const CourseManager: React.FC = () => {
    const { courses, addCourse, updateCourse, deleteCourse } = useAppContext();
    const [editingItem, setEditingItem] = useState<Course | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleFormSubmit = async (data: any) => editingItem ? await updateCourse({ ...editingItem, ...data }) : await addCourse(data);

    return (
        <div className="pb-24">
            {(courses || []).map(c => (
                <ListItemCard key={c.id} title={c.name} subtitle={`Khóa K${c.courseNumber} (${c.startDate} - ${c.endDate})`} onEdit={() => { setEditingItem(c); setIsFormOpen(true); }} onDelete={() => deleteCourse(c.id)} />
            ))}
            <button onClick={() => { setEditingItem(null); setIsFormOpen(true); }} className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg z-30"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
            {isFormOpen && <CourseForm initialData={editingItem} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} />}
        </div>
    );
};