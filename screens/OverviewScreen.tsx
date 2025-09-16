
import React, { useState, useContext, useMemo, useRef } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';
import { Session, WeeklyPlan, UserRole } from '../types';
import * as XLSX from 'xlsx';

// --- COMPONENT: Modal for PLANNED schedule ---
const PlanModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    planItem 
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Omit<WeeklyPlan, 'id'> | WeeklyPlan) => void;
    planItem: WeeklyPlan | null;
}) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState(
        planItem || { date: '', timeRange: '', content: '', type: 'Lý thuyết', instructor: '' }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as WeeklyPlan);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg">
                <h3 className="font-bold text-xl mb-4 border-b pb-2">{planItem ? 'Chỉnh sửa Kế hoạch' : 'Tạo mới Kế hoạch'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block"><span className="text-gray-700">Ngày</span><input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></label>
                        <label className="block"><span className="text-gray-700">Thời gian</span><input type="text" name="timeRange" placeholder="VD: 08:00 - 12:00" value={formData.timeRange} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></label>
                    </div>
                    <label className="block"><span className="text-gray-700">Nội dung công việc</span><input type="text" name="content" value={formData.content} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></label>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block"><span className="text-gray-700">Loại</span><input type="text" name="type" value={formData.type} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></label>
                        <label className="block"><span className="text-gray-700">Chủ trì</span><input type="text" name="instructor" value={formData.instructor} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></label>
                    </div>
                    <div className="flex justify-end pt-4 mt-4 border-t">
                        <button type="button" onClick={onClose} className="mr-3 bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg">Huỷ</button>
                        <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN SCREEN COMPONENT ---
const OverviewScreen: React.FC = () => {
    // --- CONTEXT and STATE ---
    const context = useContext(AppContext);
    if (!context) throw new Error("Context is not available");
    const { weeklyPlans, sessions, users, courses, addWeeklyPlan, updateWeeklyPlan, deleteWeeklyPlan } = context as AppContextType;

    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<WeeklyPlan | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- MEMOIZED DATA for performance ---
    const teacherMap = useMemo(() => (users || []).filter(u => u.role === UserRole.TEACHER).reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {}), [users]);
    const courseMap = useMemo(() => (courses || []).reduce((acc, c) => ({ ...acc, [c.id]: `${c.name} - ${c.courseNumber}` }), {}), [courses]);

    // --- UTILITY FUNCTIONS ---
    const getDayOfWeek = (dateString: string) => {
        const date = new Date(dateString);
        const dayIndex = date.getUTCDay();
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        return days[dayIndex];
    };

    // --- HANDLERS for PLANNED SCHEDULE ---
    const handlePlanRowClick = (id: string) => setSelectedPlanId(prev => (prev === id ? null : id));

    const handleCreatePlan = () => {
        setEditingPlan(null);
        setIsPlanModalOpen(true);
    };

    const handleEditPlan = () => {
        if (!selectedPlanId) return;
        const itemToEdit = weeklyPlans.find(item => item.id === selectedPlanId);
        if (itemToEdit) {
            setEditingPlan(itemToEdit);
            setIsPlanModalOpen(true);
        }
    };

    const handleDeletePlan = async () => {
        if (!selectedPlanId) return;
        if (window.confirm('Bạn có chắc chắn muốn xóa kế hoạch này?')) {
            await deleteWeeklyPlan(selectedPlanId);
            setSelectedPlanId(null);
        }
    };

    const handleSavePlan = async (itemToSave: Omit<WeeklyPlan, 'id'> | WeeklyPlan) => {
        try {
            if ('id' in itemToSave) {
                await updateWeeklyPlan(itemToSave as WeeklyPlan);
            } else {
                await addWeeklyPlan(itemToSave as Omit<WeeklyPlan, 'id'>);
            }
            setIsPlanModalOpen(false);
            setEditingPlan(null);
        } catch (error) {
            console.error("Failed to save plan:", error);
            alert("Lỗi: không thể lưu kế hoạch.");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false });

                const newPlans: Omit<WeeklyPlan, 'id'>[] = json.map(row => ({
                    date: new Date(row['Ngày']).toISOString().split('T')[0],
                    timeRange: row['Thời gian'] || '',
                    content: row['Nội dung công việc'] || '',
                    type: row['Loại'] || '',
                    instructor: row['Chủ trì'] || '',
                }));

                if (window.confirm(`Bạn có muốn nhập ${newPlans.length} kế hoạch mới không?`)) {
                    for (const plan of newPlans) {
                        await addWeeklyPlan(plan);
                    }
                    alert(`Đã nhập thành công ${newPlans.length} kế hoạch!`);
                }

            } catch (error) {
                console.error("Error processing Excel file:", error);
                alert("Lỗi khi xử lý file Excel.");
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = ''; // Reset file input
    };

    // --- RENDER ---
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 bg-gray-100 min-h-screen">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".xlsx, .xls" />
            <PlanModal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} onSave={handleSavePlan} planItem={editingPlan} />

            {/* Planned Schedule Section */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="font-bold text-lg text-gray-800 mb-4">Dự kiến lịch đào tạo tuần</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-t border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{['Thứ/Ngày', 'Thời gian', 'Nội dung công việc', 'Loại', 'Chủ trì'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">{h}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white">
                            {weeklyPlans.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-16 text-gray-500">Chưa có kế hoạch dự kiến.</td></tr>
                            ) : (
                                [...weeklyPlans].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(item => (
                                    <tr key={item.id} onClick={() => handlePlanRowClick(item.id)} className={`cursor-pointer border-b ${selectedPlanId === item.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-3 font-medium"><div className="text-sm text-gray-800">{getDayOfWeek(item.date)}</div><div className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}</div></td>
                                        <td className="px-4 py-3 text-sm">{item.timeRange}</td>
                                        <td className="px-4 py-3 text-sm">{item.content}</td>
                                        <td className="px-4 py-3 text-sm">{item.type}</td>
                                        <td className="px-4 py-3 text-sm">{item.instructor}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center flex-wrap gap-2 pt-4 mt-4 border-t">
                    <button onClick={handleCreatePlan} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Tạo mới</button>
                    <button onClick={handleEditPlan} disabled={!selectedPlanId} className="bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-gray-400">Chỉnh sửa</button>
                    <button onClick={handleDeletePlan} disabled={!selectedPlanId} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-gray-400">Xóa</button>
                    <button onClick={handleImportClick} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg">Nhập từ Excel</button>
                </div>
            </div>

            {/* Implemented/Actual Schedule Section */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="font-bold text-lg text-gray-800 mb-4">Triển khai lịch đào tạo tuần (Thực tế)</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-t border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{['Thứ/Ngày', 'Thời gian', 'Chủ đề', 'Khóa học', 'Loại', 'Giáo viên'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">{h}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white">
                            {sessions.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-16 text-gray-500">Chưa có buổi học nào được triển khai.</td></tr>
                            ) : (
                                [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(item => (
                                    <tr key={item.id} className="border-b">
                                        <td className="px-4 py-3 font-medium"><div className="text-sm text-gray-800">{getDayOfWeek(item.date)}</div><div className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}</div></td>
                                        <td className="px-4 py-3 text-sm">{item.startTime} - {item.endTime}</td>
                                        <td className="px-4 py-3 text-sm">{item.topic}</td>
                                        <td className="px-4 py-3 text-sm">{courseMap[item.courseId] || 'N/A'}</td>
                                        <td className="px-4 py-3 text-sm">{item.type}</td>
                                        <td className="px-4 py-3 text-sm">{teacherMap[item.teacherId] || 'N/A'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default OverviewScreen;
