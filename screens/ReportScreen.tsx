import React, { useState, useContext, useMemo } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';
import { User, UserRole, Vehicle, FuelType, PaymentType, RateUnit, Session } from '../types';
import * as XLSX from 'xlsx';

// --- HÀM HỖ TRỢ ---
const toDate = (value: any): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return date && !isNaN(date.getTime()) ? date : null;
};

const calculateDurationInHours = (start: any, end: any): number => {
    const startDate = toDate(start);
    const endDate = toDate(end);
    if (!startDate || !endDate) return 0;
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
};

// Hàm xác định buổi (Sáng/Chiều/Tối)
const getSessionPeriod = (date: Date): string => {
    const hour = date.getHours();
    if (hour < 12) return 'Sáng';
    if (hour < 18) return 'Chiều';
    return 'Tối';
};

// --- LOGIC TÌM TRÙNG LẶP ---
const findDuplicateSessions = (sessions: Session[]): { duplicates: Session[] } => {
    const seen = new Set<string>();
    const duplicates: Session[] = [];

    const sortedSessions = [...sessions].sort((a, b) => 
        (a.startTimestamp || 0) - (b.startTimestamp || 0)
    );

    sortedSessions.forEach(session => {
        const date = toDate(session.startTimestamp);
        if (!date) return;

        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const timeKey = `${date.getHours()}:${date.getMinutes()}`;
        
        const creatorId = (session as any).createdBy || (session as any).userId || 'unknown_creator';

        const key = `${session.teacherId}-${session.courseId}-${dateKey}-${timeKey}-${creatorId}`;
        
        if (seen.has(key)) {
            duplicates.push(session);
        } else {
            seen.add(key);
        }
    });

    return { duplicates };
};

const exportExcel = (data: any[], fileName: string, sheetName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

// --- MODAL CHI TIẾT ---
const DetailModal = ({ isOpen, onClose, title, headers, data, onExport }: any) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center border-b p-4 bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">✕</button>
                </div>
                <div className="overflow-auto flex-1 p-0">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>{headers.map((h: string) => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.length === 0 ? (
                                <tr><td colSpan={headers.length} className="text-center py-8 text-gray-400 italic">Không có dữ liệu chi tiết</td></tr>
                            ) : data.map((row: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    {headers.map((header: string) => <td key={header} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{String(row[header] ?? '')}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors">Đóng</button>
                    <button onClick={onExport} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Xuất Excel
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReportScreen: React.FC = () => {
    const context = useContext(AppContext);
    
    // --- STATE ---
    const [activeTab, setActiveTab] = useState<'operation' | 'attendance' | 'cleanup'>('operation');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('all');
    
    // Cost configurations
    const [dieselPrice, setDieselPrice] = useState(20000);
    const [electricityPrice, setElectricityPrice] = useState(3000);
    const [hourlyRate, setHourlyRate] = useState(50000);
    const [sessionRate, setSessionRate] = useState(200000);

    // Cleanup Tool State
    const [duplicates, setDuplicates] = useState<Session[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);
    const [deleteComplete, setDeleteComplete] = useState(false);
    const [cleanupError, setCleanupError] = useState<string | null>(null);

    const [modalState, setModalState] = useState({ isOpen: false, title: '', headers: [], data: [], onExport: () => {} });

    if (!context) return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu...</div>;
    
    const { courses, users, students, sessions, vehicles, deleteSession, fetchData } = context as AppContextType;

    const teachers = useMemo(() => (users || []).filter(u => u.role === UserRole.TEACHER), [users]);

    // --- HELPERS ---
    const getCourseDisplayString = (courseId: string) => {
        const course = (courses || []).find(c => c.id === courseId);
        return course ? `${course.name} - K${course.courseNumber}` : 'N/A';
    };
    const getUserName = (id: string) => users?.find(u => u.id === id)?.name || 'Không rõ';
    const formatCurrency = (value: number) => !isNaN(value) ? value.toLocaleString('vi-VN') + ' đ' : '0 đ';
    const formatDate = (date: any) => {
        const d = toDate(date);
        return d ? d.toLocaleDateString('vi-VN') : 'N/A';
    };

    // --- CLEANUP ACTIONS ---
    const handleScan = () => {
        setIsScanning(true);
        setScanComplete(false);
        setDeleteComplete(false);
        setDuplicates([]);
        setCleanupError(null);

        if (!sessions) {
            setCleanupError("Dữ liệu buổi học chưa được tải.");
            setIsScanning(false);
            return;
        }
        
        setTimeout(() => {
            const { duplicates: foundDuplicates } = findDuplicateSessions(sessions);
            setDuplicates(foundDuplicates);
            setIsScanning(false);
            setScanComplete(true);
        }, 500);
    };

    const handleDeleteDuplicates = async () => {
        if (duplicates.length === 0) return;
        if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn ${duplicates.length} bản ghi rác này không?`)) return;

        setIsDeleting(true);
        setCleanupError(null);
        let deletedCount = 0;

        try {
            for (const session of duplicates) {
                await deleteSession(session.id);
                deletedCount++;
            }
            await fetchData(); 
            
            setDeleteComplete(true);
            setDuplicates([]);
        } catch (err) {
            console.error("Lỗi xóa:", err);
            setCleanupError(`Đã xảy ra lỗi sau khi xóa ${deletedCount} bản ghi.`);
        } finally {
            setIsDeleting(false);
        }
    };

    // --- REPORT LOGIC ---
    const filteredSessions = useMemo(() => {
        const start = startDate ? toDate(startDate) : null;
        const end = endDate ? toDate(endDate) : null;
        if (end) { end.setHours(23, 59, 59, 999); }

        return (sessions || []).filter(session => {
            const sessionDate = toDate(session.startTimestamp);
            if (!sessionDate) return false;
            if (start && sessionDate < start) return false;
            if (end && sessionDate > end) return false;
            // Áp dụng bộ lọc khóa học cho tất cả các tab (bao gồm Vận hành)
            if (selectedCourseId !== 'all' && session.courseId !== selectedCourseId) return false;
            return true;
        });
    }, [sessions, startDate, endDate, selectedCourseId, activeTab]);

    // 1. Teacher Report
    const teacherReportData = useMemo(() => {
        const report: { [teacherId: string]: { teacher: User, totalHours: number, totalSessions: number } } = {};
        teachers.forEach(t => { report[t.id] = { teacher: t, totalHours: 0, totalSessions: 0 }; });

        filteredSessions.forEach(session => {
            if (report[session.teacherId]) {
                const duration = calculateDurationInHours(session.startTimestamp, session.endTimestamp);
                report[session.teacherId].totalHours += duration;
                report[session.teacherId].totalSessions += 1;
            }
        });

        return Object.values(report).filter(item => item.totalHours > 0 || item.totalSessions > 0).sort((a, b) => b.totalHours - a.totalHours);
    }, [filteredSessions, teachers]);

    // 2. Student Report
    const studentReportData = useMemo(() => {
        if (selectedCourseId === 'all') return [];
        const courseStudents = (students || []).filter(s => s.courseId === selectedCourseId);
        const courseSessions = filteredSessions.filter(s => s.courseId === selectedCourseId);
        const totalLogicalSessions = courseSessions.length;

        if (totalLogicalSessions === 0) return [];

        return courseStudents.map(student => {
            const attendedSessionsCount = courseSessions.filter(s => 
                Array.isArray(s.studentIds) && s.studentIds.includes(student.id)
            ).length;
            const attendancePercentage = (attendedSessionsCount / totalLogicalSessions) * 100;
            return { student, attendedSessions: attendedSessionsCount, totalSessions: totalLogicalSessions, attendancePercentage };
        }).sort((a, b) => a.student.name.localeCompare(b.student.name));
    }, [students, filteredSessions, selectedCourseId]);

    // 3. Cost Report
    const costReportData = useMemo(() => {
        if (!users || !vehicles) return [];
        let totalTeacherPayment = 0;
        let totalDieselCost = 0;
        let totalElectricityCost = 0;
        
        filteredSessions.forEach(session => {
            const duration = calculateDurationInHours(session.startTimestamp, session.endTimestamp);
            if (duration <= 0) return;

            const teacher = users.find(u => u.id === session.teacherId);
            if (teacher) {
                const isSessionBased = teacher.payment?.rateUnit === RateUnit.SESSION;
                if (isSessionBased) {
                    totalTeacherPayment += 1 * sessionRate;
                } else {
                    totalTeacherPayment += duration * hourlyRate;
                }
            }

            if (session.vehicleId) {
                const vehicle = vehicles.find(v => v.id === session.vehicleId);
                if (vehicle) {
                    const consumption = duration * vehicle.consumptionRate;
                    if (vehicle.fuelType === FuelType.DIESEL) {
                        totalDieselCost += consumption * dieselPrice;
                    } else if (vehicle.fuelType === FuelType.ELECTRIC) {
                        totalElectricityCost += consumption * electricityPrice;
                    }
                }
            }
        });

        return [
            { id: 'cost_teacher_payment', description: 'Thù lao giáo viên', total: totalTeacherPayment, icon: '👨‍🏫', color: 'text-blue-600', bg: 'bg-blue-100' },
            { id: 'cost_diesel', description: 'Nhiên liệu (Diesel)', total: totalDieselCost, icon: '⛽', color: 'text-orange-600', bg: 'bg-orange-100' },
            { id: 'cost_electricity', description: 'Điện năng', total: totalElectricityCost, icon: '⚡', color: 'text-yellow-600', bg: 'bg-yellow-100' },
        ];
    }, [filteredSessions, dieselPrice, electricityPrice, hourlyRate, sessionRate, users, vehicles]);

    // --- EXPORT & DETAIL HANDLERS ---
    const handleSummaryExport = (report: 'teacher' | 'student' | 'cost') => {
        let summaryData: any[] = [];
        let fileName = `BaoCao_${report}_${startDate || 'ToanBo'}_${endDate || ''}`;
        
        if (report === 'teacher') {
            summaryData = teacherReportData.map((item, index) => ({
                'STT': index + 1, 'Tên giáo viên': item.teacher.name, 'Tổng giờ dạy': item.totalHours.toFixed(2), 'Tổng số buổi': item.totalSessions
            }));
        } else if (report === 'student') {
            summaryData = studentReportData.map((item, index) => ({
                'STT': index + 1, 'Tên học viên': item.student.name, 'Số buổi có mặt': item.attendedSessions, 'Tổng số buổi': item.totalSessions, 'Tỷ lệ (%)': item.attendancePercentage.toFixed(2)
            }));
        } else if (report === 'cost') {
            summaryData = costReportData.map((item, index) => ({
                'STT': index + 1, 'Khoản mục': item.description, 'Thành tiền': item.total
            }));
        }
        exportExcel(summaryData, fileName, 'TongHop');
    };

    const handleDetailClick = (type: string, item: any) => {
        let detailData: any[] = [];
        let headers: string[] = [];
        let title = '';

        if (type === 'teacher') {
            title = `Chi tiết: ${item.teacher.name}`;
            headers = ['STT', 'Ngày', 'Buổi', 'Khóa', 'Nội dung', 'Giờ dạy'];
            detailData = filteredSessions.filter(s => s.teacherId === item.teacher.id).map((s, i) => {
                const sDate = toDate(s.startTimestamp);
                return {
                    'STT': i + 1,
                    'Ngày': formatDate(s.startTimestamp),
                    'Buổi': sDate ? getSessionPeriod(sDate) : '-',
                    'Khóa': getCourseDisplayString(s.courseId),
                    'Nội dung': s.content,
                    'Giờ dạy': calculateDurationInHours(s.startTimestamp, s.endTimestamp).toFixed(2)
                };
            });
        } else if (type === 'student') {
            title = `Điểm danh: ${item.student.name}`;
            headers = ['STT', 'Ngày', 'Buổi', 'Nội dung', 'Trạng thái'];
            const courseSessions = filteredSessions.filter(s => s.courseId === item.student.courseId);
            detailData = courseSessions.map((s, i) => {
                const sDate = toDate(s.startTimestamp);
                return {
                    'STT': i + 1,
                    'Ngày': formatDate(s.startTimestamp),
                    'Buổi': sDate ? getSessionPeriod(sDate) : '-',
                    'Nội dung': s.content,
                    'Trạng thái': (s.studentIds || []).includes(item.student.id) ? 'Có mặt' : 'Vắng'
                };
            });
        } else if (type.startsWith('cost')) {
            title = `Chi tiết ${item.description}`;
            headers = ['STT', 'Ngày', 'Phương tiện/GV', 'Giờ', 'Định mức/Đơn giá', 'Thành tiền'];
        }

        setModalState({
            isOpen: true,
            title,
            headers,
            data: detailData,
            onExport: () => exportExcel(detailData, title.replace(/ /g, '_'), 'ChiTiet')
        });
    };

    const totalCost = costReportData.reduce((sum, item) => sum + item.total, 0);

    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans">
            {/* HEADER & TABS */}
            <div className="bg-white shadow-sm sticky top-0 z-20">
                 <div className="flex border-b">
                    <button 
                        onClick={() => setActiveTab('operation')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'operation' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                    >
                        Báo cáo Vận hành
                    </button>
                    <button 
                        onClick={() => setActiveTab('attendance')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                    >
                        Báo cáo Điểm danh
                    </button>
                    <button 
                        onClick={() => setActiveTab('cleanup')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'cleanup' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500'}`}
                    >
                        Tiện ích & Dọn dẹp
                    </button>
                </div>
                
                {/* FILTERS */}
                {activeTab !== 'cleanup' && (
                    <div className="p-4 bg-gray-50 border-b">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Từ ngày</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Đến ngày</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white"/>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Khóa đào tạo</label>
                                <select 
                                    value={selectedCourseId} 
                                    onChange={e => setSelectedCourseId(e.target.value)} 
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                >
                                    <option value="all">Tất cả khóa đào tạo</option>
                                    {(courses || []).map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 space-y-6">
                {activeTab === 'operation' && (
                    <>
                        {/* COST REPORT */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                                <h2 className="font-bold text-lg text-gray-800">Chi phí vận hành</h2>
                                <span className="text-xl font-bold text-red-600">{formatCurrency(totalCost)}</span>
                            </div>
                            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Giá Diesel (đ/lít)</label>
                                    <input type="number" value={dieselPrice} onChange={e => setDieselPrice(Number(e.target.value))} className="w-full p-2 border rounded text-sm bg-orange-50 focus:bg-white"/>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Giá Điện (đ/kWh)</label>
                                    <input type="number" value={electricityPrice} onChange={e => setElectricityPrice(Number(e.target.value))} className="w-full p-2 border rounded text-sm bg-yellow-50 focus:bg-white"/>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Lương (đ/giờ)</label>
                                    <input type="number" value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))} className="w-full p-2 border rounded text-sm bg-blue-50 focus:bg-white"/>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Lương (đ/buổi)</label>
                                    <input type="number" value={sessionRate} onChange={e => setSessionRate(Number(e.target.value))} className="w-full p-2 border rounded text-sm bg-blue-50 focus:bg-white"/>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {costReportData.map(item => (
                                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.bg} ${item.color} text-xl`}>{item.icon}</div>
                                            <div>
                                                <p className="font-semibold text-sm text-gray-800">{item.description}</p>
                                                <p className="text-xs text-gray-500">Tạm tính</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-gray-800">{formatCurrency(item.total)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                                <button onClick={() => handleSummaryExport('cost')} className="text-sm font-bold text-gray-600 hover:text-gray-900 flex items-center justify-center w-full">
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Xuất Excel Tổng hợp Chi phí
                                </button>
                            </div>
                        </div>

                        {/* TEACHER REPORT */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="font-bold text-lg text-gray-800">Thống kê giờ dạy ({teacherReportData.length})</h2>
                                <button onClick={() => handleSummaryExport('teacher')} className="text-blue-600 text-sm font-bold">Xuất Excel</button>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto custom-scrollbar">
                                {teacherReportData.length === 0 ? <p className="text-center py-8 text-gray-400">Không có dữ liệu</p> : teacherReportData.map((item, idx) => (
                                    <div key={item.teacher.id} className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                                            <div>
                                                <p className="font-semibold text-sm text-gray-800">{item.teacher.name}</p>
                                                <p className="text-xs text-gray-500">{item.totalHours.toFixed(1)} giờ dạy - {item.totalSessions} buổi</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDetailClick('teacher', item)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg font-bold hover:bg-gray-200">Chi tiết</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* DATA CLEANUP TOOL TAB */}
                {activeTab === 'cleanup' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-yellow-300 overflow-hidden">
                        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                            <h2 className="font-bold text-lg text-yellow-800">Công cụ Dọn dẹp Dữ liệu Trùng lặp</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Công cụ này sẽ quét và xóa các buổi học bị trùng lặp dựa trên tiêu chí: <strong className="font-mono bg-yellow-100 px-1 rounded">Giáo viên (bao gồm Nhóm trưởng) + Khóa học + Ngày + Giờ bắt đầu + Người tạo</strong>.
                            </p>
                            <p className="text-xs text-red-700 mt-2 font-semibold flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                Cảnh báo: Hành động xóa là vĩnh viễn và không thể hoàn tác. Danh sách dưới đây chỉ hiển thị các bản ghi THỪA (bản sao thứ 2 trở đi).
                            </p>
                        </div>
                        
                        <div className="p-6">
                            <div className="flex flex-wrap items-center gap-4 mb-6">
                                <button 
                                    onClick={handleScan}
                                    disabled={isScanning || isDeleting}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 font-bold shadow-sm transition-all transform hover:scale-105"
                                >
                                    {isScanning ? 'Đang quét...' : '1. Quét tìm bản ghi trùng lặp'}
                                </button>
                                {duplicates.length > 0 && !isDeleting && (
                                    <button
                                        onClick={handleDeleteDuplicates}
                                        className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-gray-400 font-bold shadow-sm animate-pulse transition-all transform hover:scale-105"
                                    >
                                        {`2. Xóa ${duplicates.length} bản ghi`}
                                    </button>
                                )}
                            </div>

                            {/* Status Messages */}
                            {scanComplete && !isDeleting && (
                                <div className={`mb-4 p-4 rounded-xl border ${duplicates.length > 0 ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                                    <p className="font-bold text-lg flex items-center">
                                        {duplicates.length > 0 ? '⚠️ Phát hiện dữ liệu trùng lặp!' : '🎉 Dữ liệu sạch!'}
                                    </p>
                                    <p className="text-sm mt-1">
                                        {duplicates.length > 0 
                                            ? `Tìm thấy ${duplicates.length} buổi học bị trùng (bản sao thừa). Vui lòng kiểm tra danh sách bên dưới trước khi xóa.`
                                            : "Không tìm thấy buổi học nào bị trùng lặp theo tiêu chí đã chọn."
                                        }
                                    </p>
                                </div>
                            )}

                            {isDeleting && <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200 font-bold animate-pulse text-center">⏳ Đang xóa dữ liệu... Vui lòng chờ...</div>}
                            
                            {deleteComplete && (
                                <div className="p-4 bg-green-100 text-green-800 rounded-xl font-bold border border-green-200 text-center flex items-center justify-center">
                                    <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Đã dọn dẹp dữ liệu thành công!
                                </div>
                            )}

                            {cleanupError && (
                                <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 font-bold text-center">
                                    {cleanupError}
                                </div>
                            )}

                            {/* Duplicate List */}
                            {duplicates.length > 0 && !isDeleting && (
                                <div className="border rounded-xl overflow-hidden mt-4 shadow-sm">
                                    <div className="bg-gray-50 px-4 py-3 border-b font-bold text-gray-700">Danh sách bản ghi sẽ bị xóa (Bản sao thừa)</div>
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-white sticky top-0 shadow-sm z-10">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-600 bg-gray-50">Ngày & Giờ</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-600 bg-gray-50">Giáo viên</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-600 bg-gray-50">Khóa học</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {duplicates.map((session, idx) => (
                                                    <tr key={session.id} className="hover:bg-red-50 transition-colors">
                                                        <td className="px-4 py-3 text-gray-800">
                                                            {new Date(session.startTimestamp).toLocaleString('vi-VN')}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 font-medium">{getUserName(session.teacherId)}</td>
                                                        <td className="px-4 py-3 text-gray-500">{getCourseDisplayString(session.courseId)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <DetailModal {...modalState} onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))} />
        </div>
    );
};

export default ReportScreen;