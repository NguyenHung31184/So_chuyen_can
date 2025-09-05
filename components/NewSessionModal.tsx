
import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Session, SessionType } from '../types';
import { VEHICLES } from '../data';

interface NewSessionModalProps {
  onClose: () => void;
  onSave: (session: Session) => void;
}

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const NewSessionModal: React.FC<NewSessionModalProps> = ({ onClose, onSave }) => {
  const context = useContext(AppContext);

  const [sessionType, setSessionType] = useState<SessionType>(SessionType.PRACTICE);
  const [date, setDate] = useState('2025-05-09');
  const [practiceGroup, setPracticeGroup] = useState('');
  const [equipment, setEquipment] = useState('Cần trục giàn cầu tàu QC');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('12:00');

  const teacherName = practiceGroup && context?.teachers.length ? context.teachers[0].name : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!context?.currentUser) return;

    const newSession: Session = {
      id: `ss${Date.now()}`,
      type: sessionType,
      date,
      startTime,
      endTime,
      teacherId: context.currentUser.id,
      groupId: practiceGroup,
      equipment: sessionType === SessionType.PRACTICE ? equipment : undefined,
      classId: context?.courses[0]?.id || 'c1', // Default to first course
      studentIds: [], // Student selection is not part of this modal
    };
    onSave(newSession);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl transform transition-all">
        <header className="p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{ color: '#092d5c' }}>Ghi nhận buổi học mới</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Đóng">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {/* Row 1 */}
            <div>
              <label htmlFor="session-type" className="block text-sm font-medium text-gray-500 mb-1">Loại buổi học</label>
              <select
                id="session-type"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as SessionType)}
                className="w-full p-3 bg-gray-100 border-transparent rounded-md focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
              >
                <option value={SessionType.PRACTICE}>Thực hành</option>
                <option value={SessionType.THEORY}>Lý thuyết</option>
              </select>
            </div>
            <div className="relative">
              <label htmlFor="date" className="block text-sm font-medium text-gray-500 mb-1">Ngày</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 bg-gray-100 border-transparent rounded-md focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
              />
               <div className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center pointer-events-none">
                <CalendarIcon />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="practice-group" className="block text-sm font-medium text-gray-500 mb-1">Nhóm thực hành</label>
              <select
                id="practice-group"
                value={practiceGroup}
                onChange={(e) => setPracticeGroup(e.target.value)}
                className="w-full p-3 bg-gray-100 border-transparent rounded-md focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
              >
                <option value="">Chọn nhóm</option>
                <option value="g1">Nhóm 1</option>
                <option value="g2">Nhóm 2</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="teacher" className="block text-sm font-medium text-gray-500 mb-1">Giảng viên phụ trách</label>
              <input
                id="teacher"
                type="text"
                readOnly
                value={teacherName}
                placeholder="Vui lòng chọn nhóm"
                className="w-full p-3 bg-gray-100 border-transparent rounded-md cursor-not-allowed text-gray-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="equipment" className="block text-sm font-medium text-gray-500 mb-1">Thiết bị</label>
              <select
                id="equipment"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full p-3 bg-gray-100 border-transparent rounded-md focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
              >
                {VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="start-time" className="block text-sm font-medium text-gray-500 mb-1">Giờ bắt đầu</label>
              <input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-3 bg-gray-100 border-transparent rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="end-time" className="block text-sm font-medium text-gray-500 mb-1">Giờ kết thúc</label>
              <input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-3 bg-gray-100 border-transparent rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          
          <footer className="p-6 bg-white flex justify-end gap-3 border-t border-gray-200 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-8 py-2 rounded-md font-semibold text-white transition-colors"
              style={{ backgroundColor: '#092d5c', }}
            >
              Lưu lại
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};


export default NewSessionModal;
