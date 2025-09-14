
import React, { useState, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Session, SessionType, Teacher, Course } from '../types'; // Import main types
import * as XLSX from 'xlsx';

// --- Reusable Modal Component for Creating/Editing ---
const ScheduleModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    scheduleItem, 
    teachers, 
    courses 
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Omit<Session, 'id'> | Session) => void;
    scheduleItem: Session | null;
    teachers: Teacher[];
    courses: Course[];
}) => {
    if (!isOpen) return null;

    // Initialize form with scheduleItem or defaults matching the Session type
    const [formData, setFormData] = useState(
        scheduleItem || { 
            date: '', 
            startTime: '', 
            endTime: '', 
            topic: '', 
            courseId: '', 
            teacherId: '', 
            studentIds: [], // Default to empty array
            type: SessionType.THEORY, // Default type
        }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData); // FIX: Removed incorrect type assertion
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h3 className="font-bold text-xl text-gray-800 border-b pb-3 mb-4">
                    {scheduleItem ? 'Chỉnh sửa Lịch đào tạo' : 'Tạo mới Lịch đào tạo'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <label className="block"><span className="text-gray-700">Ngày</span><input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></label>
                         <label className="block"><span className="text-gray-700">Loại buổi học</span>
                            <select name="type" value={formData.type} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                                <option value={SessionType.THEORY}>Lý thuyết</option>
                                <option value={SessionType.PRACTICE}>Thực hành</option>
                            </select>
                        </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block"><span className="text-gray-700">Bắt đầu</span><input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></label>
                        <label className="block"><span className="text-gray-700">Kết thúc</span><input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></label>
                    </div>
                     <label className="block"><span className="text-gray-700">Khóa học</span>
                        <select name="courseId" value={formData.courseId} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="" disabled>-- Chọn khóa học --</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.courseNumber}</option>)}
                        </select>
                    </label>
                    <label className="block"><span className="text-gray-700">Nội dung công việc (Chủ đề)</span>
                        <input type="text" name="topic" value={formData.topic} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </label>
                     <label className="block"><span className="text-gray-700">Giáo viên (Chủ trì)</span>
                        <select name="teacherId" value={formData.teacherId} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="" disabled>-- Chọn giáo viên --</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </label>
                    <div className="flex justify-end pt-4 mt-4 border-t">
                        <button type="button" onClick={onClose} className="mr-3 bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Huỷ</button>
                        <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const OverviewScreen: React.FC = () => {
    // --- CONTEXT and STATE ---
    const context = useContext(AppContext);
    if (!context) throw new Error("AppContext must be used within an AppProvider");
    const { sessions, teachers, courses, addSession, updateSession, deleteSession } = context;

    const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Session | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- HANDLERS ---
    const handleRowClick = (id: string) => setSelectedScheduleId(prev => (prev === id ? null : id));

    const handleCreate = () => {
        setEditingSchedule(null);
        setIsModalOpen(true);
    };

    const handleEdit = () => {
        if (!selectedScheduleId) return;
        const itemToEdit = sessions.find(item => item.id === selectedScheduleId);
        if (itemToEdit) {
            setEditingSchedule(itemToEdit);
            setIsModalOpen(true);
        }
    };

    const handleCancel = async () => {
        if (!selectedScheduleId) return;
        if (window.confirm('Bạn có chắc chắn muốn huỷ lịch học này không?')) {
            await deleteSession(selectedScheduleId);
            setSelectedScheduleId(null);
        }
    };

    const handleSave = async (itemToSave: Omit<Session, 'id'> | Session) => {
        try {
             if ('id' in itemToSave) { // Update
                await updateSession(itemToSave as Session);
            } else { // Create
                await addSession(itemToSave as Omit<Session, 'id'>);
            }
            setIsModalOpen(false);
            setEditingSchedule(null);
        } catch (error) {
            console.error("Failed to save session:", error);
            alert("Lỗi: không thể lưu lịch học. Vui lòng thử lại.");
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
                const json = XLSX.utils.sheet_to_json<any>(worksheet);

                const teacherNameMap = teachers.reduce((acc, teacher) => ({ ...acc, [teacher.name.toLowerCase()]: teacher.id }), {});
                const courseNameMap = courses.reduce((acc, course) => ({...acc, [course.name.toLowerCase()]: course.id}), {});

                const newSessions: Omit<Session, 'id'>[] = [];
                for (const row of json) {
                    const teacherId = teacherNameMap[row['Chủ trì']?.trim().toLowerCase()];
                    const courseId = courseNameMap[row['Khóa học']?.trim().toLowerCase()];
                    
                    if (!teacherId || !courseId) {
                        console.warn("Skipping row due to missing teacher or course:", row);
                        continue; // Skip rows without a valid teacher or course
                    }
                    
                    newSessions.push({
                        date: new Date(row['Ngày']).toISOString().split('T')[0],
                        startTime: row['Bắt đầu'],
                        endTime: row['Kết thúc'],
                        topic: row['Nội dung công việc'],
                        teacherId,
                        courseId,
                        studentIds: [], // Placeholder
                        type: row['Loại'] === 'Thực hành' ? SessionType.PRACTICE : SessionType.THEORY,
                    });
                }

                if(window.confirm(`Bạn có muốn nhập ${newSessions.length} lịch học mới không?`)){
                    for(const session of newSessions){
                        await addSession(session);
                    }
                    alert(`Đã nhập thành công ${newSessions.length} lịch học!`);
                }

            } catch (error) {
                console.error("Error processing Excel file:", error);
                alert("Đã có lỗi xảy ra khi xử lý file.");
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = ''; // Reset file input
    };

    const getDayOfWeek = (dateString: string) => {
         const date = new Date(dateString);
         const dayIndex = date.getUTCDay();
         const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
         return days[dayIndex];
    }

    const teacherMap = useMemo(() => teachers.reduce((acc, t) => ({...acc, [t.id]: t.name}), {}), [teachers]);

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-gray-100 min-h-screen">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".xlsx, .xls" />
            <ScheduleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} scheduleItem={editingSchedule} teachers={teachers} courses={courses} />
            
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="font-bold text-lg text-gray-800 mb-4">Dự kiến lịch đào tạo tuần</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-t border-gray-200">
                        <thead className="bg-gray-50"> 
                             <tr>
                                {['Thứ/Ngày', 'Thời gian', 'Nội dung công việc', 'Loại', 'Chủ trì'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {sessions.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-16 text-gray-500 border-b">Không có lịch đào tạo.</td></tr>
                            ) : (
                                [...sessions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(item => (
                                    <tr key={item.id} onClick={() => handleRowClick(item.id)} className={`cursor-pointer border-b ${selectedScheduleId === item.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">
                                            <div>{getDayOfWeek(item.date)}</div>
                                            <div>{new Date(item.date).toLocaleDateString('vi-VN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{item.startTime} - {item.endTime}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{item.topic}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{item.type}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{teacherMap[item.teacherId] || 'N/A'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center flex-wrap gap-2 pt-4 mt-4 border-t">
                    <button onClick={handleCreate} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Tạo mới</button>
                    <button onClick={handleEdit} disabled={!selectedScheduleId} className="bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600 disabled:bg-gray-400">Chỉnh sửa</button>
                    <button onClick={handleCancel} disabled={!selectedScheduleId} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400">Huỷ</button>
                    <button onClick={handleImportClick} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700">Nhập từ Excel</button>
                </div>
            </div>
        </div>
    );
};

export default OverviewScreen;
