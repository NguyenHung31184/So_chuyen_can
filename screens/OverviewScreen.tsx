import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { WeeklyPlan, UserRole, Session } from '../types';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// --- Card thống kê (Mobile Optimized) ---
const StatCard: React.FC<{ title: string; value: string | number; icon: JSX.Element; color: string }> = ({ title, value, icon, color }) => (
    <div className={`p-4 rounded-2xl shadow-sm flex items-center space-x-3 ${color} text-white transform transition-transform active:scale-95`}>
        <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm shadow-inner">{icon}</div>
        <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold truncate leading-none mb-1">{value}</p>
            <p className="text-white/90 text-xs font-medium uppercase tracking-wider truncate">{title}</p>
        </div>
    </div>
);

// --- Modal Component (Mobile Full Width) ---
const PlanModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (item: any) => void; planItem: WeeklyPlan | null; }> = ({ isOpen, onClose, onSave, planItem }) => {
    if (!isOpen) return null;
    const [formData, setFormData] = useState(planItem || { date: '', timeRange: '', content: '', type: 'Lý thuyết', instructor: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800">{planItem ? 'Sửa Kế hoạch' : 'Thêm Kế hoạch'}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian</label>
                        <input type="text" name="timeRange" placeholder="VD: 08:00 - 11:30" value={formData.timeRange} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Loại hình</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="Lý thuyết">Lý thuyết</option>
                                <option value="Thực hành">Thực hành</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giáo viên</label>
                            <input type="text" name="instructor" value={formData.instructor} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tên GV" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                        <textarea name="content" rows={3} value={formData.content} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nội dung bài giảng..." />
                    </div>
                    
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 mt-4">
                        Lưu kế hoạch
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const OverviewScreen: React.FC = () => {
    const context = useContext(AppContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<WeeklyPlan | null>(null);

    // Xử lý dữ liệu
    const { students, courses, sessions, weeklyPlans, addWeeklyPlan, updateWeeklyPlan, deleteWeeklyPlan, currentUser } = context!;
    
    // Thống kê
    const activeCourses = courses.length;
    const totalStudents = students.length;
    const totalSessions = sessions.length;
    
    // Tính toán tuần hiện tại
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Bắt đầu từ thứ 2
    const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i)), [startOfCurrentWeek]);

    const handleSavePlan = async (data: any) => {
        try {
            if (editingPlan) {
                await updateWeeklyPlan({ ...editingPlan, ...data });
            } else {
                await addWeeklyPlan(data);
            }
            setIsModalOpen(false);
            setEditingPlan(null);
        } catch (error) {
            console.error("Lỗi lưu kế hoạch:", error);
            alert("Có lỗi xảy ra, vui lòng thử lại.");
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (window.confirm("Bạn có chắc muốn xóa lịch này?")) {
            await deleteWeeklyPlan(id);
        }
    };

    const getPlanForDay = (date: Date) => {
        return weeklyPlans.filter(p => {
            // Fix logic so sánh ngày: Chuyển đổi chuỗi ngày trong DB thành Date object để so sánh
            // Giả sử p.date lưu string "YYYY-MM-DD"
            const planDate = parseISO(p.date); 
            return isSameDay(planDate, date);
        });
    };

    const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

    return (
        <div className="pb-24 bg-gray-50 min-h-screen">
            {/* Header Mobile */}
            <div className="bg-white p-5 pb-2 shadow-sm sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Tổng quan</h2>
                        <p className="text-sm text-gray-500">{format(today, "'Hôm nay,' d 'tháng' M, yyyy", { locale: vi })}</p>
                    </div>
                    {isAdminOrManager && (
                        <button 
                            onClick={() => { setEditingPlan(null); setIsModalOpen(true); }}
                            className="bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-500/30 active:scale-90 transition-transform"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Stats Grid - 2 cột trên mobile */}
                <div className="grid grid-cols-2 gap-3">
                    <StatCard 
                        title="Khóa học" 
                        value={activeCourses} 
                        color="bg-gradient-to-br from-purple-500 to-indigo-600"
                        icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                    />
                    <StatCard 
                        title="Học viên" 
                        value={totalStudents} 
                        color="bg-gradient-to-br from-pink-500 to-rose-600"
                        icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    />
                    <StatCard 
                        title="Buổi học" 
                        value={totalSessions} 
                        color="bg-gradient-to-br from-blue-500 to-cyan-600"
                        icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    <StatCard 
                        title="Tuần này" 
                        value={weeklyPlans.length} 
                        color="bg-gradient-to-br from-emerald-500 to-teal-600"
                        icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    />
                </div>

                {/* Timeline Lịch tuần */}
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <span className="bg-blue-100 text-blue-800 p-1.5 rounded-lg mr-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </span>
                        Lịch hoạt động tuần
                    </h3>
                    
                    <div className="space-y-4">
                        {weekDays.map((day, idx) => {
                            const isToday = isSameDay(day, today);
                            const plans = getPlanForDay(day);
                            
                            return (
                                <div key={idx} className={`relative ${isToday ? 'pl-4' : 'pl-0'}`}>
                                    {/* Timeline line */}
                                    {isToday && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full"></div>}
                                    
                                    <div className="flex items-center mb-2">
                                        <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                                            {format(day, "EEEE - dd/MM", { locale: vi })}
                                        </div>
                                        {isToday && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">Hôm nay</span>}
                                    </div>

                                    {plans.length > 0 ? (
                                        <div className="space-y-3">
                                            {plans.map(plan => (
                                                <div key={plan.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col relative group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${plan.type === 'Thực hành' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                            {plan.type}
                                                        </span>
                                                        <span className="text-gray-500 text-xs font-mono bg-gray-100 px-2 py-1 rounded">{plan.timeRange}</span>
                                                    </div>
                                                    
                                                    <h4 className="font-bold text-gray-800 mb-1 line-clamp-2">{plan.content}</h4>
                                                    
                                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                                        <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                        {plan.instructor || 'Chưa phân công'}
                                                    </div>

                                                    {/* Admin Actions */}
                                                    {isAdminOrManager && (
                                                        <div className="absolute top-3 right-3 flex space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => { setEditingPlan(plan); setIsModalOpen(true); }} className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                            </button>
                                                            <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                                            <p className="text-gray-400 text-sm">Không có lịch</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <PlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSavePlan} planItem={editingPlan} />
        </div>
    );
};

export default OverviewScreen;
