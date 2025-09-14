
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Course, Session, Student, Teacher } from '../types';
import * as XLSX from 'xlsx';

// --- Modal Component for Details ---
const DetailModal = ({ isOpen, onClose, title, headers, data, onExport }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
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
                                    {headers.map(header => <td key={header} className="px-4 py-3 text-sm whitespace-nowrap">{row[header]}</td>)}
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
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('all');
    const [modalState, setModalState] = useState({ isOpen: false, title: '', headers: [], data: [], onExport: () => {} });

    // --- Helper Functions ---
    const getCourseDisplayString = (courses: Course[], courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        return course ? `${course.name} - Khóa ${course.courseNumber}` : 'N/A';
    };
    const formatCurrency = (value: number) => value ? value.toLocaleString('vi-VN') + ' VND' : '0 VND';
    const formatDate = (date: string) => new Date(date).toLocaleDateString('vi-VN');
    const calculateDuration = (startTime: string, endTime: string) => {
        return (new Date(`1970-01-01T${endTime}:00`).getTime() - new Date(`1970-01-01T${startTime}:00`).getTime()) / (1000 * 60 * 60);
    };

    if (!context) return <div className="p-6">Đang tải dữ liệu...</div>;
    const { courses, teachers, students, sessions } = context;

    // --- Filtered Data ---
    const filteredSessions = useMemo(() => {
        return sessions.filter(session => {
            const sessionDate = new Date(session.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start && sessionDate < start) return false;
            if (end && sessionDate > end) return false;
            if (selectedCourseId !== 'all' && session.courseId !== selectedCourseId) return false;
            return true;
        });
    }, [sessions, startDate, endDate, selectedCourseId]);

    // --- Main Reports Data Calculation ---
    const teacherReportData = useMemo(() => {
        const report: { [key: string]: { teacher: Teacher, theoryHours: number, practiceHours: number, totalHours: number } } = {};
        filteredSessions.forEach(session => {
            const teacher = teachers.find(t => t.id === session.teacherId);
            if (!teacher) return;
            if (!report[teacher.id]) {
                report[teacher.id] = { teacher, theoryHours: 0, practiceHours: 0, totalHours: 0 };
            }
            const duration = calculateDuration(session.startTime, session.endTime);
            if (session.type === 'Theory') report[teacher.id].theoryHours += duration;
            else report[teacher.id].practiceHours += duration;
            report[teacher.id].totalHours += duration;
        });
        return Object.values(report).sort((a, b) => b.totalHours - a.totalHours);
    }, [filteredSessions, teachers]);

    const studentReportData = useMemo(() => {
        if (selectedCourseId === 'all') return [];
        const courseStudents = students.filter(s => s.courseId === selectedCourseId);
        const courseSessions = sessions.filter(s => s.courseId === selectedCourseId);
        const totalSessions = courseSessions.length;
        return courseStudents.map(student => {
            const attendedSessions = courseSessions.filter(s => s.studentIds.includes(student.id)).length;
            const attendancePercentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
            return { student, attendedSessions, totalSessions, attendancePercentage };
        }).sort((a, b) => a.student.name.localeCompare(b.student.name));
    }, [students, sessions, selectedCourseId]);

    const costReportData = useMemo(() => {
        if (selectedCourseId === 'all') return [];
        const courseStudentsCount = students.filter(s => s.courseId === selectedCourseId).length;
        const courseSessions = sessions.filter(s => s.courseId === selectedCourseId);

        const theoryHours = courseSessions.filter(s => s.type === 'Theory').reduce((acc, s) => acc + calculateDuration(s.startTime, s.endTime), 0);
        const practiceHours = courseSessions.filter(s => s.type === 'Practice').reduce((acc, s) => acc + calculateDuration(s.startTime, s.endTime), 0);

        const DIESEL_CONSUMPTION_RATE = 20; // lít/giờ
        const DIESEL_PRICE = 25000; // VND/lít
        const ELECTRICITY_CONSUMPTION_RATE = 100; // kWh/giờ
        const ELECTRICITY_PRICE = 3000; // VND/kWh

        return [
            { id: 'cost_theory_teacher', description: 'Thù lao giáo viên - Lý thuyết', unit: 'giờ', quantity: theoryHours, unitPrice: 500000, total: theoryHours * 500000 },
            { id: 'cost_practice_teacher', description: 'Thù lao giáo viên - Thực hành', unit: 'giờ', quantity: practiceHours, unitPrice: 600000, total: practiceHours * 600000 },
            { id: 'cost_materials', description: 'Tài liệu học tập', unit: 'bộ', quantity: courseStudentsCount, unitPrice: 150000, total: courseStudentsCount * 150000 },
            { id: 'cost_certification', description: 'Cấp chứng chỉ', unit: 'chứng chỉ', quantity: courseStudentsCount, unitPrice: 200000, total: courseStudentsCount * 200000 },
            { id: 'cost_diesel', description: 'Nhiên liệu (Diesel)', unit: 'lít', quantity: practiceHours * DIESEL_CONSUMPTION_RATE, unitPrice: DIESEL_PRICE, total: practiceHours * DIESEL_CONSUMPTION_RATE * DIESEL_PRICE },
            { id: 'cost_electricity', description: 'Điện năng', unit: 'kWh', quantity: practiceHours * ELECTRICITY_CONSUMPTION_RATE, unitPrice: ELECTRICITY_PRICE, total: practiceHours * ELECTRICITY_CONSUMPTION_RATE * ELECTRICITY_PRICE },
        ];
    }, [selectedCourseId, students, sessions]);

    // --- Excel Export & Modal Logic ---
    const exportExcel = (data: any[], fileName: string, sheetName: string) => {
        if (data.length === 0) {
            alert('Không có dữ liệu để xuất file.');
            return;
        }
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${fileName}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
    };

    const handleAction = (actionType: 'detail' | 'export', reportType: string, item: any) => {
        let detailData: any[] = [];
        let detailHeaders: string[] = [];
        let detailTitle = '';
        let fileName = '';

        switch (reportType) {
            case 'teacher':
                const teacher = item.teacher;
                detailTitle = `Báo cáo chi tiết cho giáo viên: ${teacher.name}`;
                fileName = `ChiTiet_GiaoVien_${teacher.name.replace(/ /g, '_')}`;
                detailHeaders = ['STT', 'Ngày', 'Khóa học', 'Nội dung buổi học', 'Loại buổi học', 'Thời lượng (giờ)'];
                detailData = filteredSessions
                    .filter(s => s.teacherId === teacher.id)
                    .map((s, i) => ({
                        'STT': i + 1,
                        'Ngày': formatDate(s.date),
                        'Khóa học': getCourseDisplayString(courses, s.courseId),
                        'Nội dung buổi học': s.topic,
                        'Loại buổi học': s.type === 'Theory' ? 'Lý thuyết' : 'Thực hành',
                        'Thời lượng (giờ)': calculateDuration(s.startTime, s.endTime).toFixed(2),
                    }));
                break;
            case 'student':
                const student = item.student;
                detailTitle = `Báo cáo chi tiết cho học viên: ${student.name}`;
                fileName = `ChiTiet_HocVien_${student.name.replace(/ /g, '_')}`;
                detailHeaders = ['STT', 'Ngày', 'Nội dung buổi học', 'Trạng thái'];
                 detailData = sessions
                    .filter(s => s.courseId === student.courseId)
                    .map((s, i) => ({
                        'STT': i + 1,
                        'Ngày': formatDate(s.date),
                        'Nội dung buổi học': s.topic,
                        'Trạng thái': s.studentIds.includes(student.id) ? 'Có mặt' : 'Vắng mặt',
                    }));
                break;
            case 'cost_theory_teacher':
            case 'cost_practice_teacher':
                const sessionType = reportType === 'cost_theory_teacher' ? 'Theory' : 'Practice';
                detailTitle = `Chi tiết thù lao giáo viên - ${sessionType === 'Theory' ? 'Lý thuyết' : 'Thực hành'}`;
                fileName = `ChiTiet_ThuLao_GV_${sessionType}`;
                detailHeaders = ['STT', 'Tên giáo viên', 'Số giờ', 'Đơn giá (VND/giờ)', 'Thành tiền (VND)'];
                
                const teacherHours = filteredSessions
                    .filter(s => s.type === sessionType && s.courseId === selectedCourseId)
                    .reduce((acc, session) => {
                        const teacherName = teachers.find(t => t.id === session.teacherId)?.name || 'N/A';
                        const duration = calculateDuration(session.startTime, session.endTime);
                        acc[teacherName] = (acc[teacherName] || 0) + duration;
                        return acc;
                    }, {});

                detailData = Object.entries(teacherHours).map(([name, hours], i) => ({
                    'STT': i + 1,
                    'Tên giáo viên': name,
                    'Số giờ': (hours as number).toFixed(2),
                    'Đơn giá (VND/giờ)': formatCurrency(item.unitPrice).replace(' VND', ''),
                    'Thành tiền (VND)': formatCurrency((hours as number) * item.unitPrice).replace(' VND', ''),
                }));
                break;
            case 'cost_materials':
            case 'cost_certification':
                const costType = reportType === 'cost_materials' ? 'Tài liệu học tập' : 'Cấp chứng chỉ';
                detailTitle = `Chi tiết chi phí - ${costType}`;
                fileName = `ChiTiet_ChiPhi_${costType.replace(/ /g, '_')}`;
                detailHeaders = ['STT', 'Tên học viên', 'Khóa đào tạo', 'Đơn giá (VND)'];
                detailData = students
                    .filter(s => s.courseId === selectedCourseId)
                    .map((s, i) => ({
                        'STT': i + 1,
                        'Tên học viên': s.name,
                        'Khóa đào tạo': getCourseDisplayString(courses, s.courseId),
                        'Đơn giá (VND)': formatCurrency(item.unitPrice).replace(' VND', ''),
                    }));
                break;
            case 'cost_diesel':
            case 'cost_electricity':
                const energyType = reportType === 'cost_diesel' ? 'Nhiên liệu (Diesel)' : 'Điện năng';
                const rate = reportType === 'cost_diesel' ? 20 : 100;
                const unit = reportType === 'cost_diesel' ? 'lít/giờ' : 'kWh/giờ';
                const totalUnit = reportType === 'cost_diesel' ? 'lít' : 'kWh';

                detailTitle = `Chi tiết chi phí - ${energyType}`;
                fileName = `ChiTiet_ChiPhi_${energyType.replace(/ /g, '_')}`;
                detailHeaders = ['STT', 'Ngày', 'Nội dung buổi học (Thiết bị)', 'Thời lượng hoạt động (giờ)', `Định mức tiêu thụ (${unit})`, `Tổng tiêu thụ (${totalUnit})`, 'Đơn giá', 'Thành tiền (VND)'];
                
                detailData = filteredSessions
                    .filter(s => s.type === 'Practice' && s.courseId === selectedCourseId)
                    .map((s, i) => {
                        const duration = calculateDuration(s.startTime, s.endTime);
                        const consumption = duration * rate;
                        return {
                            'STT': i + 1,
                            'Ngày': formatDate(s.date),
                            'Nội dung buổi học (Thiết bị)': s.topic,
                            'Thời lượng hoạt động (giờ)': duration.toFixed(2),
                            [`Định mức tiêu thụ (${unit})`]: rate,
                            [`Tổng tiêu thụ (${totalUnit})`]: consumption.toFixed(2),
                            'Đơn giá': formatCurrency(item.unitPrice).replace(' VND',''),
                            'Thành tiền (VND)': formatCurrency(consumption * item.unitPrice).replace(' VND',''),
                        };
                    });
                break;
        }

        if (actionType === 'export') {
            const exportableData = detailData.map(row => {
                 const newRow = {...row};
                 // Make sure all values are strings for excel export
                 for(const key in newRow) {
                     newRow[key] = String(newRow[key]);
                 }
                 return newRow;
            });
            exportExcel(exportableData, fileName, 'ChiTiet');
        } else {
            setModalState({
                isOpen: true,
                title: detailTitle,
                headers: detailHeaders,
                data: detailData,
                onExport: () => exportExcel(detailData, fileName, 'ChiTiet')
            });
        }
    };
    
    const handleSummaryExport = (report: 'teacher' | 'student' | 'cost') => {
        let summaryData: any[] = [];
        if (report === 'teacher') {
            summaryData = teacherReportData.map((item, index) => ({
                'STT': index + 1, 'Tên giáo viên': item.teacher.name, 'Giờ lý thuyết': item.theoryHours.toFixed(2), 'Giờ thực hành': item.practiceHours.toFixed(2), 'Tổng giờ': item.totalHours.toFixed(2)
            }));
            exportExcel(summaryData, 'TongHop_BaoCao_GiaoVien', 'TongHopGiaoVien');
        } else if (report === 'student') {
             summaryData = studentReportData.map((item, index) => ({
                'STT': index + 1, 'Tên học viên': item.student.name, 'Số buổi có mặt': item.attendedSessions, 'Tổng số buổi': item.totalSessions, 'Tỷ lệ tham gia (%)': item.attendancePercentage.toFixed(2)
            }));
            exportExcel(summaryData, 'TongHop_BaoCao_HocVien', 'TongHopHocVien');
        } else if (report === 'cost') {
            summaryData = costReportData.map((item, index) => ({
                'STT': index + 1, 'Nội dung chi phí': item.description, 'Đơn vị': item.unit, 'Số lượng': item.quantity.toFixed(2), 'Đơn giá': formatCurrency(item.unitPrice), 'Thành tiền': formatCurrency(item.total)
            }));
            exportExcel(summaryData, 'TongHop_BaoCao_ChiPhi', 'TongHopChiPhi');
        }
    };

    const renderReport = (title, type, data, headers, summaryDisabled = false) => (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                <button onClick={() => handleSummaryExport(type)} disabled={summaryDisabled} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">Xuất Báo cáo Tổng hợp</button>
            </div>
            {summaryDisabled ? (
                <p className="text-sm text-center text-gray-500 py-4">Vui lòng chọn một khóa đào tạo cụ thể để xem báo cáo.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.length === 0 ? (
                                <tr><td colSpan={headers.length} className="text-center py-4 text-gray-500">Không có dữ liệu</td></tr>
                            ) : data.map((item, index) => (
                                <tr key={item.id || item.teacher?.id || item.student?.id}>
                                    <td className="px-4 py-3 text-sm">{index + 1}</td>
                                    {type === 'teacher' && <><td>{item.teacher.name}</td><td>{item.theoryHours.toFixed(2)}</td><td>{item.practiceHours.toFixed(2)}</td><td>{item.totalHours.toFixed(2)}</td></>}
                                    {type === 'student' && <><td>{item.student.name}</td><td>{item.attendedSessions}</td><td>{item.totalSessions}</td><td>{item.attendancePercentage.toFixed(2)}%</td></>}
                                    {type === 'cost' && <><td>{item.description}</td><td>{item.unit}</td><td>{item.quantity.toFixed(2)}</td><td>{formatCurrency(item.unitPrice)}</td><td>{formatCurrency(item.total)}</td></>}
                                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap space-x-2">
                                        <button onClick={() => handleAction('detail', item.id ? item.id : type, item)} className="text-indigo-600 hover:text-indigo-900">Chi tiết</button>
                                        <button onClick={() => handleAction('export', item.id ? item.id : type, item)} className="text-green-600 hover:text-green-900">Xuất Excel</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

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
                        {courses.map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(courses, c.id)}</option>)}
                    </select>
                </div>
            </div>

            {renderReport('Báo cáo giáo viên', 'teacher', teacherReportData, ['STT', 'Tên giáo viên', 'Giờ lý thuyết', 'Giờ thực hành', 'Tổng giờ', 'Hành động'])}
            {renderReport('Báo cáo học viên', 'student', studentReportData, ['STT', 'Tên học viên', 'Số buổi có mặt', 'Tổng số buổi', 'Tỷ lệ tham gia (%)', 'Hành động'], selectedCourseId === 'all')}
            {renderReport('Báo cáo chi phí dự kiến', 'cost', costReportData, ['STT', 'Nội dung chi phí', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Hành động'], selectedCourseId === 'all')}
            
            <DetailModal 
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ isOpen: false, title: '', headers: [], data: [], onExport: () => {} })}
                title={modalState.title}
                headers={modalState.headers}
                data={modalState.data}
                onExport={modalState.onExport}
            />
        </div>
    );
};

export default ReportScreen;
