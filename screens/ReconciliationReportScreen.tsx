import React, { useState, useMemo, useContext } from 'react'; // === THAY ĐỔI: Import thêm `useContext`
import { AppContext } from '../contexts/AppContext'; // === THAY ĐỔI: Import `AppContext` thay vì `useAppContext`
import { Session, UserRole, AppContextType } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// --- ĐỊNH NGHĨA CẤU TRÚC DỮ LIỆU CHO BÁO CÁO --- //
type ComparisonStatus = 'MATCHED' | 'DISCREPANCY' | 'MISSING_DATA';

interface SessionPair {
    key: number; 
    courseId: string;
    teacherSession?: Session;
    leaderSession?: Session;
}

interface ComparisonResult extends SessionPair {
    status: ComparisonStatus;
    courseName?: string;
    startTimestamp: number;
}

// --- COMPONENT MODAL ĐỂ HIỂN THỊ CHI TIẾT SAI LỆCH --- //
const DetailsModal: React.FC<{ pair: ComparisonResult; onClose: () => void; }> = ({ pair, onClose }) => {
    // === THAY ĐỔI: Sửa lại cách dùng Context ===
    const context = useContext(AppContext);
    const students = context?.students;

    const getStudentName = (id: string) => students?.find(s => s.id === id)?.name || `Không rõ (ID: ${id})`;

    const teacherAttendees = new Set(pair.teacherSession?.attendees || []);
    const leaderAttendees = new Set(pair.leaderSession?.attendees || []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
                <h3 className="text-xl font-bold mb-4">Chi tiết Đối chiếu</h3>
                <p className="mb-2 text-sm text-gray-600">
                    <strong>Khóa học:</strong> {pair.courseName}
                </p>
                <p className="mb-4 text-sm text-gray-600">
                    <strong>Thời gian:</strong> {new Date(pair.startTimestamp).toLocaleString('vi-VN')}
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                    {/* Cột Giáo viên */}
                    <div>
                        <h4 className="font-semibold border-b pb-2 mb-2">Giáo viên điểm danh</h4>
                        <ul className="space-y-1">
                            {(pair.teacherSession?.attendees || []).map(id => (
                                <li key={id} className={`p-2 rounded text-sm ${!leaderAttendees.has(id) ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}>
                                    {getStudentName(id)}
                                </li>
                            ))}
                             {pair.teacherSession?.attendees.length === 0 && <p className="text-gray-500 text-sm">Vắng tất cả</p>}
                        </ul>
                    </div>
                    {/* Cột Nhóm trưởng */}
                    <div>
                        <h4 className="font-semibold border-b pb-2 mb-2">Nhóm trưởng điểm danh</h4>
                         <ul className="space-y-1">
                            {(pair.leaderSession?.attendees || []).map(id => (
                                <li key={id} className={`p-2 rounded text-sm ${!teacherAttendees.has(id) ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}`}>
                                    {getStudentName(id)}
                                </li>
                            ))}
                             {pair.leaderSession?.attendees.length === 0 && <p className="text-gray-500 text-sm">Vắng tất cả</p>}
                        </ul>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="mt-6 float-right px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                    Đóng
                </button>
            </div>
        </div>
    );
};

// --- COMPONENT MÀN HÌNH BÁO CÁO CHÍNH --- //
const ReconciliationReportScreen: React.FC = () => {
    // === THAY ĐỔI: Sửa lại cách dùng Context ===
    const context = useContext(AppContext);
    if (!context) return <div>Đang tải context...</div>; // Xử lý trường hợp context chưa sẵn sàng
    const { courses, currentUser } = context;

    const [filterCourseId, setFilterCourseId] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const [reportData, setReportData] = useState<ComparisonResult[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [selectedPair, setSelectedPair] = useState<ComparisonResult | null>(null);

    if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.MANAGER) {
        return <div className="p-8 text-center text-red-600">Bạn không có quyền truy cập vào chức năng này.</div>;
    }

    const handleGenerateReport = async () => {
        if (!filterCourseId || !filterStartDate || !filterEndDate) {
            setError("Vui lòng chọn đầy đủ Khóa học, Ngày bắt đầu và Ngày kết thúc.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setReportData(null);

        try {
            const startTimestamp = new Date(filterStartDate).getTime();
            const endTimestamp = new Date(filterEndDate).setHours(23, 59, 59, 999);

            const sessionsRef = collection(db, 'schedules');
            const q = query(sessionsRef,
                where('courseId', '==', filterCourseId),
                where('startTimestamp', '>=', startTimestamp),
                where('startTimestamp', '<=', endTimestamp)
            );
            const querySnapshot = await getDocs(q);
            const fetchedSessions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Session[];

            const pairedSessions = new Map<number, SessionPair>();
            for (const session of fetchedSessions) {
                const key = session.startTimestamp;
                if (!pairedSessions.has(key)) {
                    pairedSessions.set(key, { key, courseId: session.courseId });
                }
                const pair = pairedSessions.get(key)!;
                if (session.createdBy === 'teacher') {
                    pair.teacherSession = session;
                } else if (session.createdBy === 'team_leader') {
                    pair.leaderSession = session;
                }
            }
            
            const results: ComparisonResult[] = Array.from(pairedSessions.values()).map(pair => {
                let status: ComparisonStatus = 'MISSING_DATA';
                
                if (pair.teacherSession && pair.leaderSession) {
                    const teacherAttendees = [...pair.teacherSession.attendees].sort().join(',');
                    const leaderAttendees = [...pair.leaderSession.attendees].sort().join(',');
                    status = teacherAttendees === leaderAttendees ? 'MATCHED' : 'DISCREPANCY';
                }

                return {
                    ...pair,
                    status,
                    startTimestamp: pair.key,
                    courseName: courses?.find(c => c.id === pair.courseId)?.name
                };
            }).sort((a, b) => a.startTimestamp - b.startTimestamp);

            setReportData(results);

        } catch (err: any) {
            console.error("Lỗi khi tạo báo cáo:", err);
            setError("Đã có lỗi xảy ra khi truy vấn dữ liệu.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const getStatusUI = (status: ComparisonStatus) => {
        switch (status) {
            case 'MATCHED':
                return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Trùng khớp</span>;
            case 'DISCREPANCY':
                return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">Có sai lệch</span>;
            case 'MISSING_DATA':
                return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">Thiếu dữ liệu</span>;
        }
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Báo cáo Đối chiếu Điểm danh</h1>

                <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2">
                            <label htmlFor="course-filter" className="block text-sm font-medium text-gray-700">Khóa học</label>
                            <select
                                id="course-filter"
                                value={filterCourseId}
                                onChange={(e) => setFilterCourseId(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            >
                                <option value="" disabled>-- Chọn một khóa học --</option>
                                {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Từ ngày</label>
                            <input
                                type="date"
                                id="start-date"
                                value={filterStartDate}
                                onChange={e => setFilterStartDate(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-1 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            />
                        </div>
                        <div>
                            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">Đến ngày</label>
                            <input
                                type="date"
                                id="end-date"
                                value={filterEndDate}
                                onChange={e => setFilterEndDate(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-1 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            />
                        </div>
                    </div>
                     {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
                    <div className="mt-4 text-right">
                        <button
                            onClick={handleGenerateReport}
                            disabled={isLoading}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                        >
                            {isLoading ? 'Đang xử lý...' : 'Xem báo cáo'}
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                     {!reportData && !isLoading && <p className="text-center text-gray-500">Vui lòng chọn bộ lọc và nhấn "Xem báo cáo" để bắt đầu.</p>}
                     {isLoading && <p className="text-center text-gray-500">Đang tải và phân tích dữ liệu...</p>}
                     {reportData && reportData.length === 0 && <p className="text-center text-gray-500">Không tìm thấy buổi học nào trong khoảng thời gian đã chọn.</p>}
                     {reportData && reportData.length > 0 && (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhóm trưởng</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reportData.map(pair => (
                                    <tr key={pair.key}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(pair.startTimestamp).toLocaleString('vi-VN')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{pair.teacherSession ? '✅' : '❌'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{pair.leaderSession ? '✅' : '❌'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusUI(pair.status)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {pair.status === 'DISCREPANCY' && (
                                                <button onClick={() => setSelectedPair(pair)} className="text-primary hover:underline">Xem chi tiết</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     )}
                </div>
            </div>
            
            {selectedPair && <DetailsModal pair={selectedPair} onClose={() => setSelectedPair(null)} />}
        </div>
    );
};

export default ReconciliationReportScreen;