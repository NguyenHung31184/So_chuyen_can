import React, { useState, useMemo, useContext } from 'react'; // === THAY ĐỔI: Import thêm `useContext`
import { AppContext } from '../contexts/AppContext'; // === THAY ĐỔI: Import `AppContext`
import { Session, UserRole } from '../types';

const equipmentList = [
    'Cần trục giàn QC, STS', 'Cần trục giàn RTG', 'Xe nâng hàng container',
    'Xe nâng hàng Forklift', 'Cần trục bánh lốp, bánh xích', 'Xe xúc gạt',
    'Cổng trục, cầu trục', 'Máy hàn', 'Xe oto', 'Khác'
];

interface CreateSessionFormProps {
    onClose: () => void;
}

const CreateSessionForm: React.FC<CreateSessionFormProps> = ({ onClose }) => {
    // === THAY ĐỔI: Sửa lại cách dùng Context ===
    const context = useContext(AppContext);
    if (!context) return <div>Đang tải...</div>;
    const { currentUser, courses, students, addSession } = context;

    const [courseId, setCourseId] = useState<string>('');
    const [sessionType, setSessionType] = useState<'Lý thuyết' | 'Thực hành'>('Lý thuyết');
    const [content, setContent] = useState<string>('');
    const [vehicleId, setVehicleId] = useState<string>('');
    const [vehicleName, setVehicleName] = useState<string>('');
    const [otherVehicleName, setOtherVehicleName] = useState('');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [attendees, setAttendees] = useState<Record<string, boolean>>({});
    
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const filteredStudents = useMemo(() => {
        if (!courseId || !students) return [];
        return students.filter(student => student.courseId === courseId);
    }, [courseId, students]);

    const handleAttendanceChange = (studentId: string) => {
        setAttendees(prev => ({ ...prev, [studentId]: !prev[studentId] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!courseId || !startTime || !endTime) {
            setError('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
            return;
        }

        const startTimestamp = new Date(startTime).getTime();
        const endTimestamp = new Date(endTime).getTime();

        if (startTimestamp >= endTimestamp) {
            setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
            return;
        }

        if (!currentUser) {
            setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
            return;
        }

        setIsLoading(true);

        try {
            const presentStudentIds = Object.keys(attendees).filter(id => attendees[id]);
            
            const sessionData: Omit<Session, 'id'> = {
                courseId,
                startTimestamp,
                endTimestamp,
                type: sessionType,
                teacherId: currentUser.id,
                content,
                vehicleId: `${vehicleName === 'Khác' ? otherVehicleName : vehicleName} - ${vehicleId}`,
                attendees: presentStudentIds,
                // === THAY ĐỔI: Thêm các trường bắt buộc cho buổi học ===
                creatorId: currentUser.id,
                createdBy: currentUser.role === UserRole.TEACHER ? 'teacher' : 'team_leader',
            };
            
            // Hàm addSession bây giờ nhận đúng kiểu dữ liệu
            await addSession(sessionData);
            
            alert('Buổi học đã được tạo thành công!');
            onClose();

        } catch (err: any) {
            console.error("Lỗi khi tạo buổi học:", err);
            setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 bg-white rounded-lg shadow-xl max-w-3xl mx-auto my-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Tạo buổi học</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Khóa đào tạo */}
                <div>
                    <label htmlFor="course" className="block text-sm font-medium text-gray-700">1. Khóa đào tạo *</label>
                    <select id="course" value={courseId} onChange={(e) => setCourseId(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        required>
                        <option value="" disabled>-- Chọn khóa đào tạo --</option>
                        {courses?.map(course => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                        ))}
                    </select>
                </div>

                {/* Tên người tạo và loại buổi học */}
                <div>
                     <label className="block text-sm font-medium text-gray-700">2. Người tạo</label>
                     <div className="mt-1 flex items-center gap-4">
                        <input type="text" value={currentUser?.name || 'Đang tải...'} readOnly
                            className="flex-grow px-3 py-2 border border-gray-300 rounded-md bg-gray-100 sm:text-sm" />
                         <div className="flex items-center">
                            <input id="theory" name="sessionType" type="radio" checked={sessionType === 'Lý thuyết'} onChange={() => setSessionType('Lý thuyết')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                            <label htmlFor="theory" className="ml-2 block text-sm text-gray-900">Lý thuyết</label>
                        </div>
                        <div className="flex items-center">
                            <input id="practice" name="sessionType" type="radio" checked={sessionType === 'Thực hành'} onChange={() => setSessionType('Thực hành')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                            <label htmlFor="practice" className="ml-2 block text-sm text-gray-900">Thực hành</label>
                        </div>
                     </div>
                </div>

                {/* Phần còn lại của form giữ nguyên... */}
                 {/* Phương tiện */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">3. Phương tiện</label>
                    <div className="mt-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                        <select
                            value={vehicleName}
                            onChange={(e) => setVehicleName(e.target.value)}
                            className="md:col-span-2 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            <option value="">-- Chọn phương tiện --</option>
                            {equipmentList.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                        </select>
                        {vehicleName === 'Khác' && (
                             <input
                                type="text"
                                placeholder="Nhập tên phương tiện"
                                value={otherVehicleName}
                                onChange={(e) => setOtherVehicleName(e.target.value)}
                                className="md:col-span-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                required
                            />
                        )}
                        <input
                            type="text"
                            placeholder="Số hiệu"
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                            className="md:col-span-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                </div>
                 {/* Nội dung buổi học */}
                 <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700">4. Nội dung buổi học</label>
                    <textarea id="content" rows={2} value={content} onChange={(e) => setContent(e.target.value)}
                        placeholder="Nhập nội dung chính của buổi học..."
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
                {/* Danh sách học viên */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">5. Điểm danh học viên</label>
                    <div className="mt-2 border border-gray-200 rounded-md max-h-56 overflow-y-auto">
                        {filteredStudents.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200">
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredStudents.map((student, index) => (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900">{index + 1}. {student.name}</td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <input type="checkbox" checked={!!attendees[student.id]} onChange={() => handleAttendanceChange(student.id)}
                                                    className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center text-gray-500 py-4">Vui lòng chọn khóa học để hiển thị danh sách học viên.</p>
                        )}
                    </div>
                </div>
                {/* Thời gian */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">6. Thời gian *</label>
                    <div className="mt-1 grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start-time" className="block text-xs font-medium text-gray-500">Bắt đầu</label>
                            <input type="datetime-local" id="start-time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" required />
                        </div>
                        <div>
                            <label htmlFor="end-time" className="block text-xs font-medium text-gray-500">Kết thúc</label>
                            <input type="datetime-local" id="end-time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" required />
                        </div>
                    </div>
                </div>
                {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                {/* Buttons */}
                <div className="flex justify-end gap-4 pt-4">
                     <button type="button" onClick={onClose} disabled={isLoading}
                        className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50">
                        Hủy
                    </button>
                    <button type="submit" disabled={isLoading}
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? 'Đang lưu...' : 'Xác nhận'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateSessionForm;