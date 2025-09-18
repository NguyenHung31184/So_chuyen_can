import React, { useState, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Session, WeeklyPlan, UserRole, AppContextType } from '../types';
import * as XLSX from 'xlsx';

// --- COMPONENT: Modal for PLANNED schedule (giữ nguyên) ---
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
    // ... (Toàn bộ code của PlanModal được giữ nguyên)
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block"><span className="text-gray-700">Ngày</span><input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></label>
                        <label className="block"><span className="text-gray-700">Thời gian</span><input type="text" name="timeRange" placeholder="VD: 08:00 - 12:00" value={formData.timeRange} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></label>
                    </div>
                    <label className="block"><span className="text-gray-700">Nội dung công việc</span><input type="text" name="content" value={formData.content} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    const context = useContext(AppContext);
    if (!context) throw new Error("Context is not available");
    const { weeklyPlans, sessions, users, courses, addWeeklyPlan, updateWeeklyPlan, deleteWeeklyPlan } = context;

    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<WeeklyPlan | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // === THAY ĐỔI 1: Lọc ra các buổi học thực tế CHỈ DO GIÁO VIÊN TẠO ===
    const actualTeacherSessions = useMemo(() => 
        (sessions || []).filter(session => session.createdBy === 'teacher'), 
    [sessions]);

    const teacherMap = useMemo(() => (users || []).filter(u => u.role === UserRole.TEACHER).reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {}), [users]);
    const courseMap = useMemo(() => (courses || []).reduce((acc, c) => ({ ...acc, [c.id]: `${c.name} - Khóa ${c.courseNumber}` }), {}), [courses]);

    // === THAY ĐỔI 2: Hàm helper mạnh mẽ hơn để xử lý cả dữ liệu cũ và mới ===
    const getSessionDate = (session: Session | any): Date | null => {
        if (session.startTimestamp) {
            return new Date(session.startTimestamp);
        }
        // Fallback for old data
        if (session.date) {
            const date = new Date(session.date);
            if (!isNaN(date.getTime())) return date;
        }
        return null;
    };

    const getDayOfWeek = (date: Date | null) => {
        if (!date) return 'N/A';
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
    
    // === THAY ĐỔI 3: Cải thiện logic nhập Excel để an toàn hơn ===
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                // Sử dụng { raw: false } để Excel tự động chuyển đổi ngày
                const json = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false });

                const newPlans: Omit<WeeklyPlan, 'id'>[] = json.map(row => {
                    const dateValue = row['Ngày'];
                    let formattedDate = '';
                    if (dateValue instanceof Date) {
                        formattedDate = dateValue.toISOString().split('T')[0];
                    } else if (typeof dateValue === 'string') {
                        // Cố gắng xử lý các định dạng chuỗi khác nếu cần
                        formattedDate = new Date(dateValue).toISOString().split('T')[0];
                    }

                    if (!formattedDate || formattedDate === 'Invalid Date') {
                        throw new Error(`Định dạng ngày không hợp lệ ở dòng: ${JSON.stringify(row)}`);
                    }
                    
                    return {
                        date: formattedDate,
                        timeRange: row['Thời gian'] || '',
                        content: row['Nội dung công việc'] || '',
                        type: row['Loại'] || '',
                        instructor: row['Chủ trì'] || '',
                    };
                });

                if (window.confirm(`Bạn có muốn nhập ${newPlans.length} kế hoạch mới không?`)) {
                    for (const plan of newPlans) {
                        await addWeeklyPlan(plan);
                    }
                    alert(`Đã nhập thành công ${newPlans.length} kế hoạch!`);
                }
            } catch (error: any) {
                console.error("Error processing Excel file:", error);
                alert(`Lỗi khi xử lý file Excel: ${error.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
        if (event.target) event.target.value = '';
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 bg-gray-100 min-h-screen">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".xlsx, .xls" />
            <PlanModal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} onSave={handleSavePlan} planItem={editingPlan} />

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="font-bold text-lg text-gray-800 mb-4">Dự kiến lịch đào tạo tuần</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-t border-gray-200">
                         {/* ... (Phần table Dự kiến giữ nguyên) ... */}
                        <thead className="bg-gray-50">
                            <tr>{['Thứ/Ngày', 'Thời gian', 'Nội dung công việc', 'Loại', 'Chủ trì'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">{h}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white">
                            {weeklyPlans.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-16 text-gray-500">Chưa có kế hoạch dự kiến.</td></tr>
                            ) : (
                                [...weeklyPlans].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(item => (
                                    <tr key={item.id} onClick={() => handlePlanRowClick(item.id)} className={`cursor-pointer border-b ${selectedPlanId === item.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-3 font-medium"><div className="text-sm text-gray-800">{getDayOfWeek(new Date(item.date))}</div><div className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}</div></td>
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

            {/* === THAY ĐỔI 4: Cập nhật toàn bộ bảng Triển khai Lịch đào tạo === */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="font-bold text-lg text-gray-800 mb-4">Triển khai lịch đào tạo tuần (Thực tế)</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-t border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{['Thứ/Ngày', 'Thời gian', 'Chủ đề', 'Khóa học', 'Loại', 'Giáo viên'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">{h}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white">
                            {actualTeacherSessions.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-16 text-gray-500">Chưa có buổi học nào do giáo viên triển khai.</td></tr>
                            ) : (
                                [...actualTeacherSessions].sort((a, b) => (getSessionDate(a)?.getTime() || 0) - (getSessionDate(b)?.getTime() || 0)).map(item => {
                                    const sessionDate = getSessionDate(item);
                                    const displayDate = sessionDate ? sessionDate.toLocaleDateString('vi-VN') : 'N/A';
                                    const displayDayOfWeek = getDayOfWeek(sessionDate);

                                    const startTime = item.startTimestamp ? new Date(item.startTimestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : (item as any).startTime || '-';
                                    const endTime = item.endTimestamp ? new Date(item.endTimestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : (item as any).endTime || '-';
                                    const displayTime = item.startTimestamp ? `${startTime} - ${endTime}` : startTime;

                                    return (
                                        <tr key={item.id} className="border-b">
                                            <td className="px-4 py-3 font-medium">
                                                <div className="text-sm text-gray-800">{displayDayOfWeek}</div>
                                                <div className="text-xs text-gray-500">{displayDate}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">{displayTime}</td>
                                            <td className="px-4 py-3 text-sm">{item.content || (item as any).topic}</td>
                                            <td className="px-4 py-3 text-sm">{courseMap[item.courseId] || 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm">{item.type}</td>
                                            <td className="px-4 py-3 text-sm">{teacherMap[item.teacherId] || 'N/A'}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OverviewScreen;