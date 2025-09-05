
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
// Fix: Import SessionType to be used for type casting.
import { TeacherType, Session, SessionType } from '../types';

const ReportScreen: React.FC = () => {
    const context = useContext(AppContext);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [teacherReportType, setTeacherReportType] = useState<TeacherType>(TeacherType.PRACTICE);

    const filteredSessions = useMemo(() => {
        return context?.sessions.filter(s => {
            const sessionMonth = new Date(s.date).getMonth() + 1;
            const courseMatch = selectedCourse === 'all' || s.classId === selectedCourse;
            return sessionMonth === selectedMonth && courseMatch;
        }) || [];
    }, [context?.sessions, selectedMonth, selectedCourse]);

    const handleExport = (reportName: string) => {
        alert(`Đã xuất báo cáo "${reportName}" ra Excel (chức năng giả lập).`);
    };
    
    const getSessionDuration = (session: Session) => {
         const start = new Date(`1970-01-01T${session.startTime}:00`);
         const end = new Date(`1970-01-01T${session.endTime}:00`);
         return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }
    
    // Teacher Report
    const teacherHours = useMemo(() => {
        const report = new Map<string, number>();
        const relevantTeachers = context?.teachers.filter(t => t.type === teacherReportType) || [];
        
        relevantTeachers.forEach(teacher => {
            const hours = filteredSessions
                // Fix: Cast TeacherType to SessionType for comparison, as they share string values but are different enums.
                .filter(s => s.teacherId === teacher.id && s.type === (teacherReportType as unknown as SessionType))
                .reduce((acc, s) => acc + getSessionDuration(s), 0);
            if (hours > 0) {
                report.set(teacher.name, hours);
            }
        });
        return report;
    }, [filteredSessions, teacherReportType, context?.teachers]);

    // Student Report
    const studentHours = useMemo(() => {
        const report = new Map<string, { sessions: number, hours: number }>();
        context?.students.forEach(student => {
            const attendedSessions = filteredSessions.filter(s => s.studentIds.includes(student.id));
            if (attendedSessions.length > 0) {
                const totalHours = attendedSessions.reduce((acc, s) => acc + getSessionDuration(s), 0);
                report.set(student.name, { sessions: attendedSessions.length, hours: totalHours });
            }
        });
        return report;
    }, [filteredSessions, context?.students]);
    
    // Cost Report
    const costReport = useMemo(() => {
        const teacherSalaryRate = 200000; // VND/hour
        const electricityRate = 3000; // VND/kWh
        const electricityConsumption = 5; // kWh/hour
        const fuelRate = 25000; // VND/liter
        const fuelConsumption = 8; // liter/hour

        const theoryHours = filteredSessions.filter(s => s.type === 'Lý thuyết').reduce((acc, s) => acc + getSessionDuration(s), 0);
        const practiceHours = filteredSessions.filter(s => s.type === 'Thực hành').reduce((acc, s) => acc + getSessionDuration(s), 0);
        
        const teacherSalary = (theoryHours + practiceHours) * teacherSalaryRate;
        const electricityCost = practiceHours * electricityConsumption * electricityRate;
        const fuelCost = practiceHours * fuelConsumption * fuelRate;
        
        return { teacherSalary, electricityCost, fuelCost, total: teacherSalary + electricityCost + fuelCost };

    }, [filteredSessions]);

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Báo cáo</h2>
            
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-md mb-6 flex flex-col md:flex-row gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tháng báo cáo</label>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="mt-1 block w-full md:w-auto rounded-md border-gray-300 shadow-sm p-2 focus:border-primary focus:ring-primary">
                        {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Khóa đào tạo</label>
                     <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="mt-1 block w-full md:w-auto rounded-md border-gray-300 shadow-sm p-2 focus:border-primary focus:ring-primary">
                        <option value="all">Tất cả</option>
                        {context?.courses.map(c => <option key={c.id} value={c.id}>{c.name} - K{c.courseNumber}</option>)}
                    </select>
                </div>
            </div>

            {/* Reports Section */}
            <div className="space-y-6">
                {/* Teacher Report */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="text-xl font-bold text-gray-800">Báo cáo Giáo viên</h3>
                        <button onClick={() => handleExport("Giáo viên")} className="bg-green-600 text-white text-sm py-1 px-3 rounded-md hover:bg-green-700">Xuất Excel</button>
                    </div>
                    <div className="flex gap-2 mb-4 border-b">
                       <button onClick={() => setTeacherReportType(TeacherType.THEORY)} className={`py-2 px-4 text-sm font-medium ${teacherReportType === TeacherType.THEORY ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Lý thuyết</button>
                       <button onClick={() => setTeacherReportType(TeacherType.PRACTICE)} className={`py-2 px-4 text-sm font-medium ${teacherReportType === TeacherType.PRACTICE ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Thực hành</button>
                    </div>
                    <ul className="space-y-2">
                        {Array.from(teacherHours.entries()).map(([name, hours]) => (
                            <li key={name} className="flex justify-between p-2 rounded bg-gray-50"><span>{name}</span><span className="font-semibold">{hours.toFixed(1)} giờ</span></li>
                        ))}
                         {teacherHours.size === 0 && <p className="text-gray-500 text-center p-4">Không có dữ liệu</p>}
                    </ul>
                </div>
                
                {/* Student Report */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="text-xl font-bold text-gray-800">Báo cáo Học viên</h3>
                        <button onClick={() => handleExport("Học viên")} className="bg-green-600 text-white text-sm py-1 px-3 rounded-md hover:bg-green-700">Xuất Excel</button>
                    </div>
                     <ul className="space-y-2">
                        {Array.from(studentHours.entries()).map(([name, data]) => (
                            <li key={name} className="flex justify-between p-2 rounded bg-gray-50"><span>{name}</span><span className="font-semibold">{data.sessions} buổi / {data.hours.toFixed(1)} giờ</span></li>
                        ))}
                         {studentHours.size === 0 && <p className="text-gray-500 text-center p-4">Không có dữ liệu</p>}
                    </ul>
                </div>

                {/* Cost Report */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Báo cáo Chi phí</h3>
                    <ul className="space-y-3">
                         <li className="flex justify-between text-gray-700"><span>Lương giáo viên</span><span className="font-semibold">{costReport.teacherSalary.toLocaleString()} VNĐ</span></li>
                         <li className="flex justify-between text-gray-700"><span>Chi phí điện năng</span><span className="font-semibold">{costReport.electricityCost.toLocaleString()} VNĐ</span></li>
                         <li className="flex justify-between text-gray-700"><span>Chi phí nhiên liệu</span><span className="font-semibold">{costReport.fuelCost.toLocaleString()} VNĐ</span></li>
                         <li className="flex justify-between text-lg font-bold text-gray-900 border-t pt-3 mt-3"><span>Tổng chi phí</span><span className="text-primary">{costReport.total.toLocaleString()} VNĐ</span></li>
                    </ul>
                </div>
            </div>

        </div>
    );
};

export default ReportScreen;