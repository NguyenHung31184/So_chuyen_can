
import { User, UserRole, Course, Teacher, Student, Session, TeacherType, SessionType } from './types';

export const USERS: User[] = [
    { id: '1', name: 'Admin', phone: '0123456789', role: UserRole.ADMIN },
    { id: '2', name: 'Nguyễn Văn An', phone: '0911111111', role: UserRole.TEACHER },
    { id: '3', name: 'Trần Thị Bình', phone: '0922222222', role: UserRole.TEACHER },
    { id: '4', name: 'Lê Văn Cường', phone: '0933333333', role: UserRole.STUDENT },
    { id: '5', name: 'Phạm Thị Dung', phone: '0944444444', role: UserRole.STUDENT },
];

export const COURSES: Course[] = [
    { id: 'c1', name: 'Lái xe B2', courseNumber: 101, totalHours: 120 },
    { id: 'c2', name: 'Lập trình Web', courseNumber: 202, totalHours: 200 },
];

export const TEACHERS: Teacher[] = [
    { id: 't1', name: 'Nguyễn Văn An', phone: '0911111111', type: TeacherType.PRACTICE },
    { id: 't2', name: 'Trần Thị Bình', phone: '0922222222', type: TeacherType.THEORY },
];

export const STUDENTS: Student[] = [
    { id: 's1', name: 'Lê Văn Cường', birthYear: 2000, phone: '0933333333', groupId: 'g1' },
    { id: 's2', name: 'Phạm Thị Dung', birthYear: 2001, phone: '0944444444', groupId: 'g1' },
    { id: 's3', name: 'Hoàng Văn Em', birthYear: 2000, phone: '0955555555', groupId: 'g2' },
    { id: 's4', name: 'Vũ Thị Gấm', birthYear: 2002, phone: '0966666666', groupId: 'g2' },
];

export const SESSIONS: Session[] = [
    { 
        id: 'ss1', 
        teacherId: 't1', 
        type: SessionType.PRACTICE, 
        date: '2024-07-28', 
        startTime: '08:00', 
        endTime: '10:00',
        classId: 'c1',
        equipment: 'Toyota Vios',
        studentIds: ['s1', 's2']
    },
    { 
        id: 'ss2', 
        teacherId: 't2', 
        type: SessionType.THEORY, 
        date: '2024-07-29', 
        startTime: '14:00', 
        endTime: '16:00',
        classId: 'c2',
        studentIds: ['s3', 's4']
    }
];

export const VEHICLES = ['Cần trục giàn cầu tàu QC', 'Toyota Vios', 'Honda City', 'Ford Ranger', 'Mitsubishi Xpander'];
export const PROFESSIONS = ['Lái xe ô tô', 'Lập trình viên', 'Thiết kế đồ họa', 'Quản trị mạng'];