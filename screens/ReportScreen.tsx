import React, { useState, useContext, useMemo } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';
import { Course, Session, Student, User, UserRole, Vehicle, FuelType, PaymentType, RateUnit } from '../types';
import * as XLSX from 'xlsx';

// --- HÀM HỖ TRỢ: Chuyển đổi an toàn sang Date ---
const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        if (date && !isNaN(date.getTime())) {
            return date;
        }
    }
    return null;
};

// --- HÀM HỖ TRỢ: Tính toán thời lượng (giờ) ---
const calculateDurationInHours = (start: any, end: any): number => {
    const startDate = toDate(start);
    const endDate = toDate(end);
    if (!startDate || !endDate) return 0;
    const durationMs = endDate.getTime() - startDate.getTime();
    return durationMs / (1000 * 60 * 60);
};


// --- Modal Component for Details (Không thay đổi) ---
const DetailModal = ({ isOpen, onClose, title, headers, data, onExport }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="font-bold text-xl text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>
                <div className="overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.length === 0 ? (
                                <tr><td colSpan={headers.length} className="text-center py-4 text-gray-500">Không có dữ liệu chi tiết</td></tr>
                            ) : data.map((row, index) => (
                                <tr key={index}>
                                    {headers.map(header => <td key={header} className="px-4 py-3 text-sm whitespace-nowrap">{String(row[header] ?? '')}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end mt-6 pt-4 border-t">
                    <button onClick={onExport} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">Xuất Excel</button>
                    <button onClick={onClose} className="ml-3 bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Đóng</button>
                </div>
            </div>
        </div>
    );
};


const ReportScreen: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return <div className="p-6">Đang tải dữ liệu...</div>;
    const { courses, users, students, sessions, vehicles } = context as AppContextType;
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('all');
    const [dieselPrice, setDieselPrice] = useState(25000);
    const [electricityPrice, setElectricityPrice] = useState(3000);
    const [modalState, setModalState] = useState({ isOpen: false, title: '', headers: [], data: [], onExport: () => {} });

    const teachers = useMemo(() => (users || []).filter(u => u.role === UserRole.TEACHER), [users]);
    
    const getCourseDisplayString = (courseId: string) => {
        const course = (courses || []).find(c => c.id === courseId);
        return course ? `${course.name} - Khóa ${course.courseNumber}` : 'N/A';
    };
    const formatCurrency = (value: number) => !isNaN(value) ? value.toLocaleString('vi-VN') + ' VND' : '0 VND';
    const formatDate = (date: any) => {
        const d = toDate(date);
        return d ? d.toLocaleDateString('vi-VN') : 'N/A';
    }
    
    // --- BƯỚC 1: LỌC NGUỒN DỮ LIỆU CHÍNH - CHỈ LẤY BUỔI HỌC DO GIÁO VIÊN TẠO ---
    const teacherCreatedSessions = useMemo(() => {
        return (sessions || []).filter(session => session.createdBy === 'teacher');
    }, [sessions]);

    // --- BƯỚC 2: LỌC DỮ LIỆU THEO BỘ LỌC (NGÀY, KHÓA HỌC) ---
    const filteredSessions = useMemo(() => {
        const start = startDate ? toDate(startDate) : null;
        const end = endDate ? toDate(endDate) : null;
        if (end) { end.setHours(23, 59, 59, 999); }

        return teacherCreatedSessions.filter(session => {
            const sessionDate = toDate(session.startTimestamp);
            if (!sessionDate) return false;
            if (start && sessionDate < start) return false;
            if (end && sessionDate > end) return false;
            if (selectedCourseId !== 'all' && session.courseId !== selectedCourseId) return false;
            return true;
        });
    }, [teacherCreatedSessions, startDate, endDate, selectedCourseId]);

    // --- LOGIC BÁO CÁO GIÁO VIÊN ---
    const teacherReportData = useMemo(() => {
        const report: { [teacherId: string]: { teacher: User, totalHours: number } } = {};
        teachers.forEach(t => { report[t.id] = { teacher: t, totalHours: 0 }; });

        filteredSessions.forEach(session => {
            if (report[session.teacherId]) {
                const duration = calculateDurationInHours(session.startTimestamp, session.endTimestamp);
                report[session.teacherId].totalHours += duration;
            }
        });

        return Object.values(report)
            .filter(item => item.totalHours > 0)
            .sort((a, b) => b.totalHours - a.totalHours);
    }, [filteredSessions, teachers]);

    // --- LOGIC BÁO CÁO HỌC VIÊN ---
    const studentReportData = useMemo(() => {
        if (selectedCourseId === 'all') return [];
        const courseStudents = (students || []).filter(s => s.courseId === selectedCourseId);
        const courseSessions = teacherCreatedSessions.filter(s => s.courseId === selectedCourseId);
        const totalLogicalSessions = courseSessions.length;
        if (totalLogicalSessions === 0) return [];

        return courseStudents.map(student => {
            const attendedSessionsCount = courseSessions.filter(s => 
                Array.isArray(s.attendees) && s.attendees.includes(student.id)
            ).length;
            const attendancePercentage = (attendedSessionsCount / totalLogicalSessions) * 100;
            return { student, attendedSessions: attendedSessionsCount, totalSessions: totalLogicalSessions, attendancePercentage };
        }).sort((a, b) => a.student.name.localeCompare(b.student.name));
    }, [students, teacherCreatedSessions, selectedCourseId]);

    // --- LOGIC BÁO CÁO CHI PHÍ (VIẾT LẠI HOÀN TOÀN THEO types.ts) ---
    const costReportData = useMemo(() => {
        if (selectedCourseId === 'all' || !users || !vehicles) return [];

        let totalTeacherPayment = 0;
        let totalDieselCost = 0;
        let totalElectricityCost = 0;
        
        const courseSessions = filteredSessions.filter(s => s.courseId === selectedCourseId);

        courseSessions.forEach(session => {
            const duration = calculateDurationInHours(session.startTimestamp, session.endTimestamp);
            if (duration <= 0) return;

            // 1. Tính thù lao giáo viên
            const teacher = users.find(u => u.id === session.teacherId);
            if (teacher?.payment?.type === PaymentType.RATE && teacher.payment.rateUnit === RateUnit.HOUR) {
                totalTeacherPayment += duration * teacher.payment.amount;
            }

            // 2. Tính chi phí nhiên liệu/điện
            if (session.vehicleId) {
                const vehicle = vehicles.find(v => v.id === session.vehicleId);
                if (vehicle) {
                    if (vehicle.fuelType === FuelType.DIESEL) {
                        totalDieselCost += duration * vehicle.consumptionRate * dieselPrice;
                    } else if (vehicle.fuelType === FuelType.ELECTRIC) {
                        totalElectricityCost += duration * vehicle.consumptionRate * electricityPrice;
                    }
                }
            }
        });

        return [
            { id: 'cost_teacher_payment', description: 'Tổng thù lao giáo viên (theo giờ)', total: totalTeacherPayment },
            { id: 'cost_diesel', description: 'Tổng chi phí nhiên liệu (Diesel)', total: totalDieselCost },
            { id: 'cost_electricity', description: 'Tổng chi phí điện năng', total: totalElectricityCost },
        ];
    }, [filteredSessions, selectedCourseId, dieselPrice, electricityPrice, users, vehicles]);

    const handleSummaryExport = (report: 'teacher' | 'student' | 'cost') => {
        let summaryData: any[] = [];
        let fileName = '';
        if (report === 'teacher') {
            fileName = 'TongHop_BaoCao_GiaoVien';
            summaryData = teacherReportData.map((item, index) => ({
                'STT': index + 1, 'Tên giáo viên': item.teacher.name, 'Tổng giờ dạy': item.totalHours.toFixed(2)
            }));
        } else if (report === 'student') {
            fileName = 'TongHop_BaoCao_HocVien';
            summaryData = studentReportData.map((item, index) => ({
                'STT': index + 1, 'Tên học viên': item.student.name, 'Số buổi có mặt': item.attendedSessions, 'Tổng số buổi': item.totalSessions, 'Tỷ lệ tham gia (%)': item.attendancePercentage.toFixed(2)
            }));
        } else if (report === 'cost') {
            fileName = 'TongHop_BaoCao_ChiPhi';
            summaryData = costReportData.map((item, index) => ({
                'STT': index + 1, 'Nội dung chi phí': item.description, 'Thành tiền': formatCurrency(item.total)
            }));
        }
        exportExcel(summaryData, fileName, 'TongHop');
    };
    
    // --- LOGIC XỬ LÝ MODAL CHI TIẾT (ĐÃ CẬP NHẬT) ---
    const handleAction = (reportType: string, item: any) => {
        let detailData: any[] = [];
        let detailHeaders: string[] = [];
        let detailTitle = '';

        const courseSessionsInFilter = filteredSessions.filter(s => 
            selectedCourseId === 'all' || s.courseId === selectedCourseId
        );

        switch (reportType) {
            case 'teacher':
                detailTitle = `Chi tiết giờ dạy: ${item.teacher.name}`;
                detailHeaders = ['STT', 'Ngày', 'Khóa học', 'Nội dung', 'Loại buổi học', 'Thời lượng (giờ)'];
                detailData = courseSessionsInFilter
                    .filter(s => s.teacherId === item.teacher.id)
                    .map((s, i) => ({
                        'STT': i + 1,
                        'Ngày': formatDate(s.startTimestamp),
                        'Khóa học': getCourseDisplayString(s.courseId),
                        'Nội dung': s.content,
                        'Loại buổi học': s.type,
                        'Thời lượng (giờ)': calculateDurationInHours(s.startTimestamp, s.endTimestamp).toFixed(2),
                    }));
                break;
            
            case 'student':
                detailTitle = `Chi tiết điểm danh: ${item.student.name}`;
                detailHeaders = ['STT', 'Ngày', 'Nội dung buổi học', 'Trạng thái'];
                detailData = teacherCreatedSessions
                   .filter(s => s.courseId === item.student.courseId)
                   .map((s, i) => ({
                       'STT': i + 1,
                       'Ngày': formatDate(s.startTimestamp),
                       'Nội dung buổi học': s.content,
                       'Trạng thái': (s.attendees || []).includes(item.student.id) ? 'Có mặt' : 'Vắng mặt',
                   }));
                break;

            case 'cost_teacher_payment':
                detailTitle = 'Chi tiết thù lao giáo viên';
                detailHeaders = ['STT', 'Ngày', 'Giáo viên', 'Thời lượng (giờ)', 'Đơn giá (VND/giờ)', 'Thành tiền (VND)'];
                detailData = courseSessionsInFilter
                    .map((s, i) => {
                        const teacher = users.find(u => u.id === s.teacherId);
                        const duration = calculateDurationInHours(s.startTimestamp, s.endTimestamp);
                        const isApplicable = teacher?.payment?.type === PaymentType.RATE && teacher.payment.rateUnit === RateUnit.HOUR;
                        const rate = isApplicable ? teacher.payment.amount : 0;
                        const total = duration * rate;
                        return {
                            'STT': i + 1,
                            'Ngày': formatDate(s.startTimestamp),
                            'Giáo viên': teacher?.name || 'N/A',
                            'Thời lượng (giờ)': duration.toFixed(2),
                            'Đơn giá (VND/giờ)': rate.toLocaleString('vi-VN'),
                            'Thành tiền (VND)': total.toLocaleString('vi-VN'),
                        };
                    })
                    .filter(d => parseFloat(d['Thời lượng (giờ)']) > 0 && parseFloat(d['Thành tiền (VND)']) > 0); // Chỉ hiển thị các dòng có chi phí
                break;

            case 'cost_diesel':
            case 'cost_electricity':
                const fuelTypeTarget = reportType === 'cost_diesel' ? FuelType.DIESEL : FuelType.ELECTRIC;
                detailTitle = `Chi tiết chi phí ${fuelTypeTarget}`;
                detailHeaders = ['STT', 'Ngày', 'Phương tiện', 'Thời lượng (giờ)', 'Định mức', 'Tiêu thụ', 'Đơn giá', 'Thành tiền (VND)'];
                detailData = courseSessionsInFilter
                    .filter(s => s.vehicleId)
                    .map((s, i) => {
                        const vehicle = vehicles.find(v => v.id === s.vehicleId);
                        if (!vehicle || vehicle.fuelType !== fuelTypeTarget) return null;
                        
                        const duration = calculateDurationInHours(s.startTimestamp, s.endTimestamp);
                        const price = fuelTypeTarget === FuelType.DIESEL ? dieselPrice : electricityPrice;
                        const consumption = duration * vehicle.consumptionRate;
                        const total = consumption * price;

                        return {
                            'STT': i + 1,
                            'Ngày': formatDate(s.startTimestamp),
                            'Phương tiện': vehicle.name,
                            'Thời lượng (giờ)': duration.toFixed(2),
                            'Định mức': `${vehicle.consumptionRate} ${vehicle.consumptionUnit}`,
                            'Tiêu thụ': `${consumption.toFixed(2)} ${vehicle.consumptionUnit.split('/')[0]}`,
                            'Đơn giá': price.toLocaleString('vi-VN'),
                            'Thành tiền (VND)': total.toLocaleString('vi-VN'),
                        };
                    })
                    .filter(Boolean); // Lọc bỏ các giá trị null
                break;
        }

        setModalState({
            isOpen: true,
            title: detailTitle,
            headers: detailHeaders,
            data: detailData,
            onExport: () => exportExcel(detailData, detailTitle.replace(/ /g, '_'), 'ChiTiet')
        });
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-gray-100 min-h-screen">
            <h2 className="text-2xl font-bold text-gray-800">Các báo cáo tổng hợp</h2>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="font-bold text-lg mb-4 text-gray-800">Lọc báo cáo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" title="Từ ngày"/>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" title="Đến ngày"/>
                    <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="all">Tất cả khóa đào tạo</option>
                        {(courses || []).map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c.id)}</option>)}
                    </select>
                </div>
            </div>

            {/* --- BÁO CÁO GIÁO VIÊN --- */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-800">Báo cáo giáo viên</h3>
                    <button onClick={() => handleSummaryExport('teacher')} disabled={teacherReportData.length === 0} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">Xuất Tổng hợp</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên giáo viên</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng giờ dạy</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {teacherReportData.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-4 text-gray-500">Không có dữ liệu</td></tr>
                            ) : teacherReportData.map((item, index) => (
                                <tr key={item.teacher.id}>
                                    <td className="px-4 py-3 text-sm">{index + 1}</td>
                                    <td className="px-4 py-3 text-sm">{item.teacher.name}</td>
                                    <td className="px-4 py-3 text-sm">{item.totalHours.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm"><button onClick={() => handleAction('teacher', item)} className="text-indigo-600 hover:text-indigo-900">Chi tiết</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* --- BÁO CÁO HỌC VIÊN --- */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-800">Báo cáo học viên</h3>
                    <button onClick={() => handleSummaryExport('student')} disabled={selectedCourseId === 'all' || studentReportData.length === 0} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">Xuất Tổng hợp</button>
                </div>
                {selectedCourseId === 'all' ? (
                     <p className="text-sm text-center text-gray-500 py-4">Vui lòng chọn một khóa đào tạo cụ thể để xem báo cáo.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên học viên</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số buổi có mặt</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng số buổi</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tỷ lệ (%)</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {studentReportData.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-gray-500">Không có dữ liệu</td></tr>
                                ) : studentReportData.map((item, index) => (
                                    <tr key={item.student.id}>
                                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                                        <td className="px-4 py-3 text-sm">{item.student.name}</td>
                                        <td className="px-4 py-3 text-sm">{item.attendedSessions}</td>
                                        <td className="px-4 py-3 text-sm">{item.totalSessions}</td>
                                        <td className="px-4 py-3 text-sm">{item.attendancePercentage.toFixed(2)}%</td>
                                        <td className="px-4 py-3 text-sm"><button onClick={() => handleAction('student', item)} className="text-indigo-600 hover:text-indigo-900">Chi tiết</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- BÁO CÁO CHI PHÍ --- */}
             <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-800">Báo cáo chi phí</h3>
                    <button onClick={() => handleSummaryExport('cost')} disabled={selectedCourseId === 'all'} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">Xuất Tổng hợp</button>
                </div>
                 {selectedCourseId === 'all' ? (
                     <p className="text-sm text-center text-gray-500 py-4">Vui lòng chọn một khóa đào tạo cụ thể để xem báo cáo.</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Đơn giá Diesel (VND/lít)</label>
                                <input type="number" value={dieselPrice} onChange={e => setDieselPrice(Number(e.target.value))} className="mt-1 w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Đơn giá Điện (VND/kWh)</label>
                                <input type="number" value={electricityPrice} onChange={e => setElectricityPrice(Number(e.target.value))} className="mt-1 w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung chi phí</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {costReportData.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3 text-sm">{item.description}</td>
                                            <td className="px-4 py-3 text-sm">{formatCurrency(item.total)}</td>
                                            <td className="px-4 py-3 text-sm"><button onClick={() => handleAction(item.id, item)} className="text-indigo-600 hover:text-indigo-900">Chi tiết</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
            
            <DetailModal 
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ isOpen: false, title: '', headers: [], data: [], onExport: () => {} })}
                {...modalState}
            />
        </div>
    );
};

export default ReportScreen;