
import React, { useState } from 'react';

// Dữ liệu giả lập - sau này sẽ được thay thế bằng dữ liệu thật từ API
const courses = [
    { id: 1, name: 'Khóa bồi dưỡng nghiệp vụ chỉ đạo' },
    { id: 2, name: 'Khóa an toàn lao động' },
    { id: 3, name: 'Khóa kỹ năng bán hàng' },
];

const students = [
    { id: 101, name: 'Nguyễn Văn A' },
    { id: 102, name: 'Trần Thị B' },
    { id: 103, name: 'Lê Văn C' },
    { id: 104, name: 'Phạm Thị D' },
];

const equipmentList = [
    'Cần trục giàn QC, STS',
    'Cần trục giàn RTG',
    'Xe nâng hàng container',
    'Xe nâng hàng Forklift',
    'Cần trục bánh lốp, bánh xích',
    'Xe xúc gạt',
    'Cổng trục, cầu trục',
    'Máy hàn',
    'Xe oto',
    'Khác'
];


const CreateSessionForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [selectedCourse, setSelectedCourse] = useState('');
    const [teacherName, setTeacherName] = useState('Giáo viên A (từ ID)'); // Sẽ được điền tự động
    const [isTheory, setIsTheory] = useState(true);
    const [isPractice, setIsPractice] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState('');
    const [otherEquipment, setOtherEquipment] = useState('');
    const [equipmentId, setEquipmentId] = useState('');
    const [attendance, setAttendance] = useState<Record<number, boolean>>({});
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const handleAttendanceChange = (studentId: number) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: !prev[studentId]
        }));
    };

    const handleReset = () => {
        setSelectedCourse('');
        setIsTheory(true);
        setIsPractice(false);
        setSelectedEquipment('');
        setOtherEquipment('');
        setEquipmentId('');
        setAttendance({});
        setStartTime('');
        setEndTime('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log({
            course: selectedCourse,
            teacher: teacherName,
            type: { theory: isTheory, practice: isPractice },
            equipment: selectedEquipment === 'Khác' ? otherEquipment : selectedEquipment,
            equipmentId,
            attendance,
            startTime,
            endTime
        });
        alert('Buổi học đã được tạo!');
        onClose();
    };


    return (
        <div className="p-8 bg-white rounded-lg shadow-xl max-w-3xl mx-auto my-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Tạo buổi học</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Khóa đào tạo */}
                <div>
                    <label htmlFor="course" className="block text-sm font-medium text-gray-700">1. Khóa đào tạo</label>
                    <select
                        id="course"
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        required
                    >
                        <option value="" disabled>-- Chọn khóa đào tạo --</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.name}>{course.name}</option>
                        ))}
                    </select>
                </div>

                {/* Tên giáo viên và loại buổi học */}
                <div>
                     <label className="block text-sm font-medium text-gray-700">2. Giáo viên</label>
                     <div className="mt-1 flex items-center gap-4">
                        <input
                            type="text"
                            value={teacherName}
                            readOnly
                            className="flex-grow px-3 py-2 border border-gray-300 rounded-md bg-gray-100 sm:text-sm"
                        />
                        <div className="flex items-center">
                            <input id="theory" type="checkbox" checked={isTheory} onChange={(e) => setIsTheory(e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                            <label htmlFor="theory" className="ml-2 block text-sm text-gray-900">Lý thuyết</label>
                        </div>
                        <div className="flex items-center">
                            <input id="practice" type="checkbox" checked={isPractice} onChange={(e) => setIsPractice(e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                            <label htmlFor="practice" className="ml-2 block text-sm text-gray-900">Thực hành</label>
                        </div>
                     </div>
                </div>

                {/* Phương tiện */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">3. Phương tiện</label>
                    <div className="mt-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                        <select
                            value={selectedEquipment}
                            onChange={(e) => setSelectedEquipment(e.target.value)}
                            className="md:col-span-2 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            <option value="" disabled>-- Chọn phương tiện --</option>
                            {equipmentList.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                        </select>
                        {selectedEquipment === 'Khác' && (
                             <input
                                type="text"
                                placeholder="Nhập tên phương tiện"
                                value={otherEquipment}
                                onChange={(e) => setOtherEquipment(e.target.value)}
                                className="md:col-span-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                required
                            />
                        )}
                        <input
                            type="text"
                            placeholder="Số hiệu"
                            value={equipmentId}
                            onChange={(e) => setEquipmentId(e.target.value)}
                            className="md:col-span-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                </div>

                {/* Danh sách học viên */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">4. Điểm danh học viên</label>
                    <div className="mt-2 border border-gray-200 rounded-md max-h-56 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <tbody className="bg-white divide-y divide-gray-200">
                                {students.map((student, index) => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{index + 1}. {student.name}</td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            <input
                                                type="checkbox"
                                                checked={!!attendance[student.id]}
                                                onChange={() => handleAttendanceChange(student.id)}
                                                className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Thời gian */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">5. Thời gian</label>
                    <div className="mt-1 grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start-time" className="block text-xs font-medium text-gray-500">Bắt đầu</label>
                            <input
                                type="datetime-local"
                                id="start-time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="end-time" className="block text-xs font-medium text-gray-500">Kết thúc</label>
                            <input
                                type="datetime-local"
                                id="end-time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                required
                            />
                        </div>
                    </div>
                </div>
                
                {/* Buttons */}
                <div className="flex justify-end gap-4 pt-4">
                     <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                        Sửa lại
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                        Xác nhận
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateSessionForm;
