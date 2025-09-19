// =======================================================================
// ENUMS
// =======================================================================

export enum Screen {
    OVERVIEW = 'Tổng quan',
    SCHEDULE = 'Lịch tuần',
    COURSES = 'Khóa học',
    REPORTS = 'Báo cáo',
    MANAGEMENT = 'Quản trị',
    RECONCILIATION_REPORT = 'Báo cáo Đối chiếu',
}

export enum UserRole {
    ADMIN = 'Admin',
    MANAGER = 'Quản lý',
    TEAM_LEADER = 'Nhóm trưởng',
    TEACHER = 'Giáo viên',
}

export enum TeacherSpecialty {
    THEORY = 'Lý thuyết',
    PRACTICE = 'Thực hành',
}

export enum TeacherContractType {
    FULL_TIME = 'Biên chế',
    CONTRACT = 'Hợp đồng',
}

export enum PaymentType {
    RATE = 'rate',
    PACKAGE = 'package',
}

export enum RateUnit {
    HOUR = 'hour',
    SESSION = 'session',
}

export enum FuelType {
    ELECTRIC = 'Điện',
    DIESEL = 'Diesel',
}

export enum SessionType {
    THEORY = 'Lý thuyết',
    PRACTICE = 'Thực hành',
}

// =======================================================================
// INTERFACES
// =======================================================================

export interface TeacherPayment {
    type: PaymentType;
    amount: number;
    rateUnit?: RateUnit;
}

export interface Vehicle {
    id: string;
    name: string;
    fuelType: FuelType;
    consumptionRate: number;
    consumptionUnit: string;
    licensePlate?: string; // Bổ sung
}

export interface User {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
    mustChangePassword?: boolean;
    specialty?: TeacherSpecialty;
    contractType?: TeacherContractType;
    courseIds?: string[];
    payment?: TeacherPayment;
    theoryPayment?: TeacherPayment;
    practicePayment?: TeacherPayment;
}

export interface Student {
    id: string;
    name: string;
    birthDate: string;
    phone: string;
    group: string;
    courseId: string;
}

export interface Course {
    id: string;
    name: string;
    courseNumber: number;
    startDate: string;
    endDate: string;
}

export interface Session {
    id: string;
    courseId: string;
    startTimestamp: number;
    endTimestamp: number;
    type: SessionType;
    teacherId: string;
    vehicleId?: string;
    content: string;
    studentIds: string[]; // Đổi tên từ attendees
    createdBy: 'teacher' | 'team_leader';
    creatorId: string;
}

// --- FIXED: Bổ sung đầy đủ các trường cho WeeklyPlan ---
export interface WeeklyPlan {
    id: string;
    date: string;
    timeRange: string;
    content: string;
    type: string;
    instructor: string;
}
