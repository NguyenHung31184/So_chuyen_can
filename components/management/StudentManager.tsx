import React, { useMemo, useState } from 'react';
import { Student, Course } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { CollapsibleGroupCard, ListItemCard, ModalForm } from './ManagementUI';

const StudentForm: React.FC<{
    initialData: Student | null;
    courses: Course[];
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}> = ({ initialData, courses, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<Partial<Student>>(initialData || { name: '', phone: '', group: '', courseId: '', birthDate: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try { await onSubmit(formData); onClose(); } 
        catch (err: any) { alert(err.message); } 
        finally { setIsSubmitting(false); }
    };

    return (
        <ModalForm isOpen={true} title={initialData ? "Cập nhật học viên" : "Thêm học viên"} onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting}>
            <div className="space-y-4">
                <input type="text" placeholder="Họ tên" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border rounded-lg" required />
                <div className="grid grid-cols-2 gap-3">
                    <input type="tel" placeholder="SĐT" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3 border rounded-lg" />
                    <input type="date" value={formData.birthDate || ''} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className="w-full p-3 border rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <select value={formData.courseId || ''} onChange={e => setFormData({ ...formData, courseId: e.target.value })} className="w-full p-3 border rounded-lg" required>
                        <option value="">-- Khóa học --</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name} (K{c.courseNumber})</option>)}
                    </select>
                    <input type="text" placeholder="Nhóm" value={formData.group || ''} onChange={e => setFormData({ ...formData, group: e.target.value })} className="w-full p-3 border rounded-lg" />
                </div>
            </div>
        </ModalForm>
    );
};

export const StudentManager: React.FC = () => {
    const { students, courses, addStudent, updateStudent, deleteStudent } = useAppContext();
    const [editingItem, setEditingItem] = useState<Student | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const studentsByCourse = useMemo(() => {
        const map: Record<string, Student[]> = {};
        (students || []).forEach(s => { if (!map[s.courseId]) map[s.courseId] = []; map[s.courseId].push(s); });
        return map;
    }, [students]);

    const handleFormSubmit = async (data: any) => editingItem ? await updateStudent({ ...editingItem, ...data }) : await addStudent(data);

    if (!courses) return <div>Đang tải...</div>;

    return (
        <div className="pb-24">
            {courses.map(course => {
                const list = studentsByCourse[course.id] || [];
                return (
                    <CollapsibleGroupCard key={course.id} title={`${course.name} - K${course.courseNumber}`} count={list.length}>
                        {list.map(s => <ListItemCard key={s.id} title={s.name} subtitle={s.phone} badges={s.group ? [{text: `Nhóm ${s.group}`, color: 'bg-green-100 text-green-700'}] : []} onEdit={() => { setEditingItem(s); setIsFormOpen(true); }} onDelete={() => deleteStudent(s.id)} />)}
                    </CollapsibleGroupCard>
                );
            })}
            <button onClick={() => { setEditingItem(null); setIsFormOpen(true); }} className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg z-30"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
            {isFormOpen && <StudentForm initialData={editingItem} courses={courses} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} />}
        </div>
    );
};