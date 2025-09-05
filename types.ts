
export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export enum Screen {
    OVERVIEW = 'Tổng quan',
    COURSE = 'Khóa đào tạo',
    REPORT = 'Báo cáo',
    ADMIN = 'Quản lý'
}

export enum TeacherType {
  THEORY = 'Lý thuyết',
  PRACTICE = 'Thực hành'
}

export enum SessionType {
  THEORY = 'Lý thuyết',
  PRACTICE = 'Thực hành'
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
}

export interface Course {
    id: string;
    name: string;
    courseNumber: number;
    totalHours: number;
}

export interface Teacher {
    id: string;
    name: string;
    phone: string;
    type: TeacherType;
}

export interface Student {
    id: string;
    name: string;
    birthYear: number;
    phone: string;
    groupId: string;
}

export interface Session {
    id: string;
    teacherId: string;
    type: SessionType;
    date: string;
    startTime: string;
    endTime: string;
    classId: string;
    equipment?: string;
    groupId?: string;
    studentIds: string[];
}

export interface AppContextType {
    currentUser: User | null;
    courses: Course[];
    teachers: Teacher[];
    students: Student[];
    sessions: Session[];
    addCourse: (course: Course) => void;
    addTeacher: (teacher: Teacher) => void;
    addStudent: (student: Student) => void;
    addSession: (session: Session) => void;
}