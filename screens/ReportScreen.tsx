import React, { useState, useContext, useMemo } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';
import { Course, Session, Student, User, UserRole, Vehicle, FuelType, PaymentType, RateUnit } from '../types';
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
    if (!context) return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu...</div>;
    const { courses, users, students, sessions, vehicles } = context as AppContextType;

    // --- STATE ---
    const [activeTab, setActiveTab] = useState<'operation' | 'attendance'>('operation');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('all');
    const [dieselPrice, setDieselPrice] = useState(25000);
    const [electricityPrice, setElectricityPrice] = useState(3000);
    const [modalState, setModalState] = useState({ isOpen: false, title: '', headers: [], data: [], onExport: () => {} });

    const teachers = useMemo(() => (users || []).filter(u => u.role === UserRole.TEACHER), [users]);

    // --- HELPERS ---
    const getCourseDisplayString = (courseId: string) => {
        const course = (courses || []).find(c => c.id === courseId);
        return course ? `${course.name} - K${course.courseNumber}` : 'N/A';
    };
    const formatCurrency = (value: number) => !isNaN(value) ? value.toLocaleString('vi-VN') + ' đ' : '0 đ';
    const formatDate = (date: any) => {
        const d = toDate(date);
        return d ? d.toLocaleDateString('vi-VN') : 'N/A';
    };

    // --- FILTER LOGIC ---
    const filteredSessions = useMemo(() => {
        const start = startDate ? toDate(startDate) : null;
        const end = endDate ? toDate(endDate) : null;
        if (end) { end.setHours(23, 59, 59, 999); }

        return (sessions || []).filter(session => {
            const sessionDate = toDate(session.startTimestamp);
            if (!sessionDate) return false;
            if (start && sessionDate < start) return false;
            if (end && sessionDate > end) return false;
            if (activeTab === 'attendance' && selectedCourseId !== 'all' && session.courseId !== selectedCourseId) return false;
            return true;
        });
    }, [sessions, startDate, endDate, selectedCourseId, activeTab]);

    // --- DATA PROCESSING ---
    
    // 1. Teacher Report
    const teacherReportData = useMemo(() => {
        const report: { [teacherId: string]: { teacher: User, totalHours: number } } = {};
        teachers.forEach(t => { report[t.id] = { teacher: t, totalHours: 0 }; });

        filteredSessions.forEach(session => {
            if (report[session.teacherId]) {
                const duration = calculateDurationInHours(session.startTimestamp, session.endTimestamp);
                report[session.teacherId].totalHours += duration;
            }
        });

        return Object.values(report).filter(item => item.totalHours > 0).sort((a, b) => b.totalHours - a.totalHours);
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

            // Teacher Cost
            const teacher = users.find(u => u.id === session.teacherId);
            if (teacher?.payment?.type === PaymentType.RATE && teacher.payment.rateUnit === RateUnit.HOUR) {
                totalTeacherPayment += duration * teacher.payment.amount;
            }

            // Vehicle Cost
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
    }, [filteredSessions, dieselPrice, electricityPrice, users, vehicles]);

    // --- ACTIONS ---
    const handleSummaryExport = (report: 'teacher' | 'student' | 'cost') => {
        let summaryData: any[] = [];
        let fileName = `BaoCao_${report}_${startDate || 'ToanBo'}_${endDate || ''}`;
        
        if (report === 'teacher') {
            summaryData = teacherReportData.map((item, index) => ({
                'STT': index + 1, 'Tên giáo viên': item.teacher.name, 'Tổng giờ dạy': item.totalHours.toFixed(2)
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
            headers = ['STT', 'Ngày', 'Khóa', 'Nội dung', 'Giờ dạy'];
            detailData = filteredSessions.filter(s => s.teacherId === item.teacher.id).map((s, i) => ({
                'STT': i + 1,
                'Ngày': formatDate(s.startTimestamp),
                'Khóa': getCourseDisplayString(s.courseId),
                'Nội dung': s.content,
                'Giờ dạy': calculateDurationInHours(s.startTimestamp, s.endTimestamp).toFixed(2)
            }));
        } else if (type === 'student') {
            title = `Điểm danh: ${item.student.name}`;
            headers = ['STT', 'Ngày', 'Nội dung', 'Trạng thái'];
            const courseSessions = filteredSessions.filter(s => s.courseId === item.student.courseId);
            detailData = courseSessions.map((s, i) => ({
                'STT': i + 1,
                'Ngày': formatDate(s.startTimestamp),
                'Nội dung': s.content,
                'Trạng thái': (s.studentIds || []).includes(item.student.id) ? 'Có mặt' : 'Vắng'
            }));
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
                </div>
                
                {/* FILTERS */}
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
                            <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" disabled={activeTab !== 'attendance'}>
                                <option value="all">Tất cả khóa đào tạo</option>
                                {(courses || []).map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {activeTab === 'operation' && (
                    <>
                        {/* COST REPORT CARD */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                                <h2 className="font-bold text-lg text-gray-800">Chi phí vận hành</h2>
                                <span className="text-xl font-bold text-red-600">{formatCurrency(totalCost)}</span>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Giá Diesel (đ/lít)</label>
                                    <input type="number" value={dieselPrice} onChange={e => setDieselPrice(Number(e.target.value))} className="w-full p-2 border rounded text-sm"/>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Giá Điện (đ/kWh)</label>
                                    <input type="number" value={electricityPrice} onChange={e => setElectricityPrice(Number(e.target.value))} className="w-full p-2 border rounded text-sm"/>
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

                        {/* TEACHER REPORT CARD */}
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
                                                <p className="text-xs text-gray-500">{item.totalHours.toFixed(1)} giờ dạy</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDetailClick('teacher', item)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg font-bold hover:bg-gray-200">Chi tiết</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'attendance' && (
                    <>
                        {/* STUDENT REPORT CARD */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="font-bold text-lg text-gray-800">Thống kê Điểm danh ({studentReportData.length})</h2>
                                <button onClick={() => handleSummaryExport('student')} disabled={selectedCourseId === 'all'} className="text-blue-600 text-sm font-bold disabled:text-gray-300 disabled:cursor-not-allowed">Xuất Excel</button>
                            </div>
                            {selectedCourseId === 'all' ? (
                                <div className="p-8 text-center text-gray-400 bg-gray-50 text-sm">
                                    Vui lòng chọn một Khóa đào tạo cụ thể để xem báo cáo điểm danh của học viên.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    {studentReportData.length === 0 ? <p className="text-center py-8 text-gray-400">Chưa có dữ liệu điểm danh</p> : studentReportData.map((item) => (
                                        <div key={item.student.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleDetailClick('student', item)}>
                                            <div className="flex justify-between mb-2">
                                                <span className="font-semibold text-sm text-gray-800">{item.student.name}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.attendancePercentage >= 80 ? 'bg-green-100 text-green-700' : item.attendancePercentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {item.attendancePercentage.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full ${item.attendancePercentage >= 80 ? 'bg-green-500' : item.attendancePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${item.attendancePercentage}%` }}></div>
                                            </div>
                                            <div className="mt-1 flex justify-between text-xs text-gray-500">
                                                <span>{item.attendedSessions}/{item.totalSessions} buổi</span>
                                                <span className="text-blue-600">Bấm để xem chi tiết</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <DetailModal {...modalState} onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))} />
        </div>
    );
};

export default ReportScreen;
