import React, { useState, useContext, useMemo } from 'react';
// [QUAN TRỌNG] Import AppContext thật từ dự án của bạn
import { AppContext } from '../contexts/AppContext';

// [QUAN TRỌNG] Import các Types thật từ dự án của bạn
import { User, UserRole, Session, FuelType, Course, RateUnit, PaymentType } from '../types';

// Sử dụng ExcelJS từ CDN
import ExcelJS from 'https://cdn.skypack.dev/exceljs';
import { saveAs } from 'https://cdn.skypack.dev/file-saver';


// --- HÀM HỖ TRỢ (UTILS) ---
const toDate = (value: any): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return date && !isNaN(date.getTime()) ? date : null;
};

const calculateDurationInHours = (start: number, end: number): number => {
    if (!start || !end) return 0;
    return (end - start) / (1000 * 60 * 60);
};

const getSessionCode = (date: Date): string => {
    const hour = date.getHours();
    if (hour < 12) return 'S';
    if (hour < 18) return 'C';
    return 'T';
};

const getSessionPeriod = (date: Date): string => {
    const hour = date.getHours();
    if (hour < 12) return 'Sáng';
    if (hour < 18) return 'Chiều';
    return 'Tối';
};

// Cập nhật hàm này để xử lý an toàn hơn với dữ liệu thiếu trường
const getCourseDisplayString = (course: any) => {
    if (!course) return 'N/A';
    // Fallback: Nếu không có 'name' thì thử tìm 'courseName', tương tự với 'courseNumber'
    const name = course.name || course.courseName || 'Tên khóa?';
    const number = course.courseNumber || course.code || course.number || '?';
    return `${name} - K${number}`;
};

const formatCurrency = (value: number) => !isNaN(value) ? value.toLocaleString('vi-VN') + ' đ' : '0 đ';

const formatDate = (date: any) => {
    const d = toDate(date);
    return d ? d.toLocaleDateString('vi-VN') : 'N/A';
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
        const creatorId = (session as any).creatorId || 'unknown';
        const key = `${session.teacherId}-${session.courseId}-${dateKey}-${timeKey}-${creatorId}`;
        
        if (seen.has(key)) {
            duplicates.push(session);
        } else {
            seen.add(key);
        }
    });
    return { duplicates };
};

// --- LOGIC XUẤT BẢNG CHẤM CÔNG EXCEL BẰNG EXCELJS ---
const exportAttendanceReport = async (
    companyName: string,
    unitName: string,
    courseName: string,
    month: number,
    year: number,
    teachers: User[],
    sessions: Session[],
    minRows: number = 15
) => {
    const workbook = new ExcelJS.Workbook();
    const daysInMonth = new Date(year, month, 0).getDate(); 

    // --- SHEET 1: GIỜ THỰC TẾ ---
    const sheetHours = workbook.addWorksheet('Gio_Day_Thuc_Te');
    
    // Style
    const headerStyle = { font: { name: 'Times New Roman', bold: true, size: 11 }, alignment: { vertical: 'middle', horizontal: 'center', wrapText: true } };
    const titleStyle = { font: { name: 'Times New Roman', bold: true, size: 14 }, alignment: { vertical: 'middle', horizontal: 'center' } };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    // Header Thông tin
    sheetHours.mergeCells('A1:P1');
    sheetHours.getCell('A1').value = companyName.toUpperCase();
    sheetHours.getCell('A1').font = { name: 'Times New Roman', bold: true, size: 11 };

    sheetHours.mergeCells('A2:P2');
    sheetHours.getCell('A2').value = unitName;
    sheetHours.getCell('A2').font = { name: 'Times New Roman', bold: true, size: 11 };

    sheetHours.mergeCells('A4:AK4');
    sheetHours.getCell('A4').value = 'BẢNG CHẤM CÔNG VÀ THANH TOÁN TIỀN LƯƠNG (GIỜ THỰC TẾ)';
    sheetHours.getCell('A4').style = titleStyle;

    sheetHours.mergeCells('A5:AK5');
    sheetHours.getCell('A5').value = `Tháng ${month} năm ${year}`;
    sheetHours.getCell('A5').style = { font: { name: 'Times New Roman', italic: true, size: 11 }, alignment: { horizontal: 'center' } };

    sheetHours.mergeCells('A6:AK6');
    sheetHours.getCell('A6').value = `Lớp: ${courseName}`;
    sheetHours.getCell('A6').style = { font: { name: 'Times New Roman', bold: true, size: 11 }, alignment: { horizontal: 'center' } };

    // Table Header
    sheetHours.mergeCells('A8:A9'); sheetHours.getCell('A8').value = 'STT';
    sheetHours.mergeCells('B8:B9'); sheetHours.getCell('B8').value = 'Họ và tên';
    sheetHours.mergeCells('C8:C9'); sheetHours.getCell('C8').value = 'Chức danh';
    
    let colIndex = 4; 
    for (let d = 1; d <= 31; d++) {
        const cell = sheetHours.getRow(8).getCell(colIndex);
        cell.value = d;
        
        if (d <= daysInMonth) {
            const currentDate = new Date(year, month - 1, d);
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek === 0) sheetHours.getRow(9).getCell(colIndex).value = 'CN';
            else if (dayOfWeek === 6) sheetHours.getRow(9).getCell(colIndex).value = 'T7';
        }
        colIndex++;
    }

    const summaryHeaders = ['Sản xuất', 'TDTT, VHQC', 'Học họp (Tổng)', 'Nghỉ phép', 'Nghỉ BHXH', 'Nghỉ ko lý do', 'Cộng'];
    summaryHeaders.forEach(header => {
        sheetHours.mergeCells(8, colIndex, 9, colIndex);
        sheetHours.getRow(8).getCell(colIndex).value = header;
        colIndex++;
    });

    for (let r = 8; r <= 9; r++) {
        const row = sheetHours.getRow(r);
        for (let c = 1; c < colIndex; c++) {
            const cell = row.getCell(c);
            cell.style = headerStyle;
            cell.border = borderStyle;
        }
    }

    // Data
    const attendanceMap: Record<string, Record<number, { hours: number, codes: string[] }>> = {};
    sessions.forEach(session => {
        const date = toDate(session.startTimestamp);
        if (!date) return;
        if (date.getMonth() + 1 !== month || date.getFullYear() !== year) return;
        const day = date.getDate();
        const duration = calculateDurationInHours(session.startTimestamp, session.endTimestamp);
        if (!attendanceMap[session.teacherId]) attendanceMap[session.teacherId] = {};
        if (!attendanceMap[session.teacherId][day]) attendanceMap[session.teacherId][day] = { hours: 0, codes: [] };
        attendanceMap[session.teacherId][day].hours += duration;
    });

    let currentRow = 10;
    let stt = 1;
    teachers.forEach(teacher => {
        const row = sheetHours.getRow(currentRow);
        row.getCell(1).value = stt++;
        row.getCell(2).value = teacher.name;
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(3).value = 'Giáo viên';

        const teacherData = attendanceMap[teacher.id] || {};
        let total = 0;
        let currentDataCol = 4;

        for (let d = 1; d <= 31; d++) {
            if (d <= daysInMonth) {
                const dayData = teacherData[d];
                if (dayData) {
                    row.getCell(currentDataCol).value = dayData.hours;
                    total += dayData.hours;
                }
            }
            currentDataCol++;
        }

        row.getCell(37).value = total;

        for (let c = 1; c < colIndex; c++) {
            const cell = row.getCell(c);
            cell.border = borderStyle;
            if(c !== 2) cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        
        currentRow++;
    });

    const rowsToAdd = Math.max(0, minRows - teachers.length);
    for (let i = 0; i < rowsToAdd; i++) {
        const row = sheetHours.getRow(currentRow);
        row.getCell(1).value = stt++;
        for (let c = 1; c < colIndex; c++) {
            row.getCell(c).border = borderStyle;
        }
        currentRow++;
    }

    currentRow += 2;
    sheetHours.mergeCells(`A${currentRow}:C${currentRow}`);
    sheetHours.getCell(`A${currentRow}`).value = 'NGƯỜI LẬP BIỂU';
    sheetHours.mergeCells(`O${currentRow}:R${currentRow}`);
    sheetHours.getCell(`O${currentRow}`).value = 'KẾ TOÁN TRƯỞNG';
    sheetHours.mergeCells(`AB${currentRow}:AE${currentRow}`);
    sheetHours.getCell(`AB${currentRow}`).value = 'GIÁM ĐỐC';

    sheetHours.getColumn(1).width = 5;
    sheetHours.getColumn(2).width = 25;
    sheetHours.getColumn(3).width = 12;
    for(let c=4; c<=34; c++) sheetHours.getColumn(c).width = 4;
    for(let c=35; c<colIndex; c++) sheetHours.getColumn(c).width = 10;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `BangChamCong_${courseName}_T${month}_${year}.xlsx`);
};


// --- EXPORT MODAL ---
const ExportConfigModal = ({ isOpen, onClose, onExport, courses }: any) => {
    const today = new Date();
    const [companyName, setCompanyName] = useState('CÔNG TY CỔ PHẦN DỊCH VỤ KỸ THUẬT VÀ ĐÀO TẠO CẢNG HẢI PHÒNG');
    const [unitName, setUnitName] = useState('Đội kỹ thuật khu vực Cảng Hoàng Diệu Chùa Vẽ');
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());
    const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-blue-600 p-4">
                    <h3 className="text-white font-bold text-lg">Xuất Bảng Chấm Công (Mẫu Excel Chuẩn)</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tên Công Ty (Header 1)</label>
                        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tên Đơn Vị (Header 2)</label>
                        <input type="text" value={unitName} onChange={e => setUnitName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Tháng</label>
                            <input type="number" min={1} max={12} value={month} onChange={e => setMonth(parseInt(e.target.value))} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Năm</label>
                            <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Chọn Khóa Đào Tạo</label>
                        <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                            {(courses || []).map((c: any) => <option key={c.id} value={c.id}>{getCourseDisplayString(c)}</option>)}
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Hủy</button>
                    <button 
                        onClick={() => onExport(companyName, unitName, month, year, selectedCourseId)} 
                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center"
                    >
                        Xuất Excel
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- DETAIL MODAL ---
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

// --- MAIN SCREEN ---
const ReportScreen: React.FC = () => {
    const context = useContext(AppContext);
    
    const [activeTab, setActiveTab] = useState<'operation' | 'attendance' | 'cleanup'>('operation');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('all');
    
    const [dieselPrice, setDieselPrice] = useState(25000);
    const [electricityPrice, setElectricityPrice] = useState(3000);
    const [hourlyRate, setHourlyRate] = useState(100000);
    const [sessionRate, setSessionRate] = useState(500000);

    const [duplicates, setDuplicates] = useState<Session[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);
    const [deleteComplete, setDeleteComplete] = useState(false);
    const [cleanupError, setCleanupError] = useState<string | null>(null);

    const [modalState, setModalState] = useState({ isOpen: false, title: '', headers: [], data: [], onExport: () => {} });
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    if (!context) return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu...</div>;
    
    const { courses, users, students, sessions, vehicles, deleteSession, fetchData } = context;

    const teachers = useMemo(() => (users || []).filter(u => u.role === UserRole.TEACHER), [users]);

    const getUserName = (id: string) => users?.find(u => u.id === id)?.name || 'Không rõ';

    const handleExportAttendanceSubmit = (companyName: string, unitName: string, month: number, year: number, courseId: string) => {
        const targetSessions = (sessions || []).filter(s => s.courseId === courseId);
        const teacherIdsInCourse = Array.from(new Set(targetSessions.map(s => s.teacherId)));
        const teachersInCourse = teachers.filter(t => teacherIdsInCourse.includes(t.id));

        if (teachersInCourse.length === 0) {
            alert('Không tìm thấy giáo viên nào có lịch dạy trong khóa học này.');
            return;
        }

        const course = courses?.find(c => c.id === courseId);
        const courseName = course ? `${course.name} - K${course.courseNumber}` : 'Không rõ';

        exportAttendanceReport(companyName, unitName, courseName, month, year, teachersInCourse, targetSessions);
        setIsExportModalOpen(false);
    };
    
    // Hàm xuất excel đơn giản cho Modal Chi tiết
    const handleSimpleExport = async (data: any[], fileName: string) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');
        
        if (data.length > 0) {
            const headers = Object.keys(data[0]);
            worksheet.addRow(headers);
        }

        data.forEach(row => {
            worksheet.addRow(Object.values(row));
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${fileName}.xlsx`);
    };

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

    const filteredSessions = useMemo(() => {
        const start = startDate ? toDate(startDate) : null;
        const end = endDate ? toDate(endDate) : null;
        if (end) { end.setHours(23, 59, 59, 999); }

        return (sessions || []).filter(session => {
            const sessionDate = toDate(session.startTimestamp);
            if (!sessionDate) return false;
            if (start && sessionDate < start) return false;
            if (end && sessionDate > end) return false;
            if (selectedCourseId !== 'all' && session.courseId !== selectedCourseId) return false;
            return true;
        });
    }, [sessions, startDate, endDate, selectedCourseId, activeTab]);

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

    const studentReportData = useMemo(() => {
        if (selectedCourseId === 'all') return [];
        const courseStudents = (students || []).filter(s => s.courseId === selectedCourseId);
        const courseSessions = filteredSessions.filter(s => s.courseId === selectedCourseId);
        const totalLogicalSessions = courseSessions.length;

        if (totalLogicalSessions === 0) return [];

        return courseStudents.map(student => {
            const attendedSessionsCount = courseSessions.filter(s => 
                Array.isArray(s.attendees) && s.attendees.includes(student.id) // Sửa studentIds -> attendees
            ).length;
            const attendancePercentage = (attendedSessionsCount / totalLogicalSessions) * 100;
            return { student, attendedSessions: attendedSessionsCount, totalSessions: totalLogicalSessions, attendancePercentage };
        }).sort((a, b) => a.student.name.localeCompare(b.student.name));
    }, [students, filteredSessions, selectedCourseId]);

    const costReportData = useMemo(() => {
        if (!users || !vehicles) return [];
        let totalTeacherPayment = 0;
        let totalDieselCost = 0;
        let totalElectricityCost = 0;
        
        filteredSessions.forEach(session => {
            const duration = calculateDurationInHours(session.startTimestamp, session.endTimestamp);
            if (duration <= 0) return;

            const teacher = users.find(u => u.id === session.teacherId);
            if (teacher && teacher.payment) {
                const { amount, rateUnit } = teacher.payment;
                if (rateUnit === RateUnit.SESSION) {
                    totalTeacherPayment += amount;
                } else {
                    totalTeacherPayment += duration * amount;
                }
            } else {
                 totalTeacherPayment += duration * hourlyRate;
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
        handleSimpleExport(summaryData, fileName);
    };

    const handleDetailClick = (type: string, item: any) => {
        let detailData: any[] = [];
        let headers: string[] = [];
        let title = '';

        if (type === 'teacher') {
            title = `Chi tiết: ${item.teacher.name}`;
            headers = ['STT', 'NGÀY', 'BUỔI', 'KHÓA', 'NỘI DUNG', 'GIỜ DẠY'];
            const teacherSessions = filteredSessions.filter(s => s.teacherId === item.teacher.id);
            
            detailData = teacherSessions.map((s, i) => {
                const sDate = toDate(s.startTimestamp);
                return {
                    'STT': i + 1,
                    'NGÀY': formatDate(s.startTimestamp),
                    'BUỔI': sDate ? getSessionPeriod(sDate) : '-',
                    'KHÓA': getCourseDisplayString(courses?.find(c => c.id === s.courseId)),
                    'NỘI DUNG': s.content,
                    'GIỜ DẠY': calculateDurationInHours(s.startTimestamp, s.endTimestamp).toFixed(2)
                };
            });
        } else if (type === 'student') {
            title = `Điểm danh: ${item.student.name}`;
            headers = ['STT', 'NGÀY', 'BUỔI', 'KHÓA', 'NỘI DUNG', 'TRẠNG THÁI'];
            
            const courseSessions = filteredSessions.filter(s => 
                s.courseId === item.student.courseId && 
                Array.isArray(s.attendees) && 
                s.attendees.includes(item.student.id)
            );
            
            detailData = courseSessions.map((s, i) => {
                const sDate = toDate(s.startTimestamp);
                return {
                    'STT': i + 1,
                    'NGÀY': formatDate(s.startTimestamp),
                    'BUỔI': sDate ? getSessionPeriod(sDate) : '-',
                    'KHÓA': getCourseDisplayString(courses?.find(c => c.id === s.courseId)),
                    'NỘI DUNG': s.content,
                    'TRẠNG THÁI': 'Có mặt'
                };
            });
        } else if (type.startsWith('cost')) {
            title = `Chi tiết: ${item.description}`;
            headers = ['STT', 'NGÀY', 'BUỔI', 'ĐỐI TƯỢNG', 'TIÊU THỤ/THỜI GIAN', 'THÀNH TIỀN'];
            
            if (item.id === 'cost_teacher_payment') {
                detailData = filteredSessions.filter(s => !!s.teacherId).map((s, i) => {
                    const sDate = toDate(s.startTimestamp);
                    const duration = calculateDurationInHours(s.startTimestamp, s.endTimestamp);
                    const teacher = users?.find(u => u.id === s.teacherId);
                    let amount = 0;
                    if (teacher && teacher.payment) {
                        amount = teacher.payment.rateUnit === RateUnit.SESSION 
                            ? teacher.payment.amount 
                            : duration * teacher.payment.amount;
                    } else {
                        amount = duration * hourlyRate;
                    }
                    return {
                        'STT': i + 1,
                        'NGÀY': formatDate(s.startTimestamp),
                        'BUỔI': sDate ? getSessionPeriod(sDate) : '-',
                        'ĐỐI TƯỢNG': teacher ? teacher.name : 'GV Chưa rõ',
                        'TIÊU THỤ/THỜI GIAN': `${duration.toFixed(2)} giờ`,
                        'THÀNH TIỀN': formatCurrency(amount)
                    };
                });
            } else if (item.id === 'cost_diesel' || item.id === 'cost_electricity') {
                const targetFuelType = item.id === 'cost_diesel' ? FuelType.DIESEL : FuelType.ELECTRIC;
                const price = item.id === 'cost_diesel' ? dieselPrice : electricityPrice;
                const unit = item.id === 'cost_diesel' ? 'lít' : 'kWh';

                detailData = filteredSessions.filter(s => {
                    const v = vehicles?.find(veh => veh.id === s.vehicleId);
                    return v && v.fuelType === targetFuelType;
                }).map((s, i) => {
                    const sDate = toDate(s.startTimestamp);
                    const duration = calculateDurationInHours(s.startTimestamp, s.endTimestamp);
                    const vehicle = vehicles?.find(v => v.id === s.vehicleId);
                    const consumption = duration * (vehicle?.consumptionRate || 0);
                    return {
                        'STT': i + 1,
                        'NGÀY': formatDate(s.startTimestamp),
                        'BUỔI': sDate ? getSessionPeriod(sDate) : '-',
                        'ĐỐI TƯỢNG': vehicle ? vehicle.name : 'Xe Chưa rõ',
                        'TIÊU THỤ/THỜI GIAN': `${consumption.toFixed(2)} ${unit}`,
                        'THÀNH TIỀN': formatCurrency(consumption * price)
                    };
                });
            }
        }

        setModalState({
            isOpen: true,
            title,
            headers,
            data: detailData,
            onExport: () => handleSimpleExport(detailData, title.replace(/ /g, '_'))
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
                                    {(courses || []).map(c => <option key={c.id} value={c.id}>{getCourseDisplayString(c)}</option>)}
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
                                        <div className="text-right flex items-center gap-2">
                                            <p className="font-bold text-sm text-gray-800">{formatCurrency(item.total)}</p>
                                            <button 
                                                onClick={() => handleDetailClick(item.id, item)}
                                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded font-medium"
                                            >
                                                Chi tiết
                                            </button>
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
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setIsExportModalOpen(true)}
                                        className="text-blue-600 text-sm font-bold bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 transition-colors flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Xuất Excel Chấm Công
                                    </button>
                                    <button onClick={() => handleSummaryExport('teacher')} className="text-gray-600 text-sm font-bold hover:text-gray-900">Xuất Excel DS</button>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto custom-scrollbar">
                                {teacherReportData.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-400">Không có dữ liệu giáo viên</p>
                                        {selectedCourseId !== 'all' && <p className="text-xs text-gray-400 mt-1">Đang lọc theo khóa học: {getCourseDisplayString(courses?.find(c => c.id === selectedCourseId))}</p>}
                                    </div>
                                ) : (
                                    teacherReportData.map((item, idx) => (
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
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* STUDENT REPORT TAB */}
                {activeTab === 'attendance' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="font-bold text-lg text-gray-800">Điểm danh học viên ({studentReportData.length})</h2>
                            <button onClick={() => handleSummaryExport('student')} className="text-blue-600 text-sm font-bold">Xuất Excel</button>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {studentReportData.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    {selectedCourseId === 'all' 
                                        ? 'Vui lòng chọn khóa học để xem báo cáo điểm danh' 
                                        : 'Không có dữ liệu học viên trong khoảng thời gian này'}
                                </div>
                            ) : (
                                studentReportData.map((item, idx) => (
                                    <div key={item.student.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                                            <div>
                                                <p className="font-semibold text-sm text-gray-800">{item.student.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    Có mặt: <span className="font-bold">{item.attendedSessions}</span>/{item.totalSessions} buổi 
                                                    <span className={`ml-2 ${item.attendancePercentage < 50 ? 'text-red-500' : 'text-green-500'}`}>
                                                        ({item.attendancePercentage.toFixed(1)}%)
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDetailClick('student', item)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg font-bold hover:bg-gray-200">
                                            Chi tiết
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
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
            
            <ExportConfigModal 
                isOpen={isExportModalOpen} 
                onClose={() => setIsExportModalOpen(false)} 
                courses={courses}
                onExport={handleExportAttendanceSubmit}
            />
        </div>
    );
};

export default ReportScreen;