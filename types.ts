
export enum UserRole {
    ADMIN = 'Admin',
    MANAGER = 'Manager',
    TEACHER = 'Teacher',
    STUDENT = 'Student',
}

export enum TeacherSpecialty {
    THEORY = 'Lý thuyết',
    PRACTICE = 'Thực hành',
    MANAGEMENT = 'Quản lý',
}

export enum TeacherContractType {
    PERMANENT = 'Cơ hữu',
    CONTRACT = 'Hợp đồng',
}

export interface User {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
    email: string;
    mustChangePassword?: boolean;
    // Optional teacher fields - will only exist if role is Teacher
    contractType?: TeacherContractType;
    specialty?: TeacherSpecialty;
    courseIds?: string[];
}

export interface Teacher extends User {
    role: UserRole.TEACHER; // Ensures type safety
}

export enum SessionType {
    THEORY = 'Lý thuyết',
    PRACTICE = 'Thực hành',
}

export interface Session {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    courseId: string;
    teacherId: string;
    studentIds: string[];
    topic: string;
    type: SessionType;
}

export interface Course {
    id: string;
    name: string;
    courseNumber: number;
    startDate: string;
    endDate: string;
}

export interface Student {
    id: string;
    name: string;
    birthDate: string; 
    phone: string;
    group: string;
    courseId: string; 
}

export enum CostReportType {
    TEACHER_THEORY = 'teacher_theory',
    TEACHER_PRACTICE = 'teacher_practice',
    FUEL = 'fuel',
    ELECTRICITY = 'electricity'
}

// All data management functions are now async and return a Promise
export interface AppContextType {
    currentUser: User | null;
    courses: Course[];
    teachers: Teacher[];
    students: Student[];
    sessions: Session[];
    users: User[];
    addCourse: (course: Omit<Course, 'id'>) => Promise<void>;
    updateCourse: (course: Course) => Promise<void>;
    deleteCourse: (courseId: string) => Promise<void>;
    addTeacher: (teacher: Omit<User, 'id' | 'role'>) => Promise<void>;
    updateTeacher: (teacher: User) => Promise<void>;
    deleteTeacher: (teacherId: string) => Promise<void>;
    addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
    updateStudent: (student: Student) => Promise<void>;
    deleteStudent: (studentId: string) => Promise<void>;
    addSession: (session: Omit<Session, 'id'>) => Promise<void>;
    updateSession: (session: Session) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    addUser: (user: Omit<User, 'id'>) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
}

export enum Screen {
    OVERVIEW = 'Tổng quan',
    COURSE = 'Khoá học',
    REPORT = 'Báo cáo',
    ADMIN = 'Quản trị',
}
