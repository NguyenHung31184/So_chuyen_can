export enum Screen {
    OVERVIEW = 'Tổng quan',
    SCHEDULE = 'Lịch tuần',
    COURSES = 'Khóa học',
    REPORTS = 'Báo cáo',
    MANAGEMENT = 'Quản trị',
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
    GENERAL = 'Tổng hợp',
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


// =======================================================================
// INTERFACES - Định nghĩa cấu trúc cho các đối tượng dữ liệu
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
}

export interface User {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
    mustChangePassword?: boolean;
    // Dành riêng cho giáo viên
    specialty?: TeacherSpecialty;
    contractType?: TeacherContractType;
    courseIds?: string[];
    payment?: TeacherPayment;
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

    // === TỐI ƯU HÓA QUAN TRỌNG ===
    // Thay thế 'date', 'startTime', 'endTime' bằng timestamp (number)
    // Giúp việc truy vấn, so sánh và ghép cặp để đối chiếu dễ dàng và chính xác hơn.
    startTimestamp: number; // Lưu thời gian bắt đầu dưới dạng một con số (Unix Timestamp)
    endTimestamp: number;   // Lưu thời gian kết thúc dưới dạng một con số (Unix Timestamp)

    type: 'Lý thuyết' | 'Thực hành';
    teacherId: string;
    vehicleId?: string;
    content: string;
    
    // === CÁC TRƯỜNG PHỤC VỤ KIỂM TRA CHÉO (GIỮ NGUYÊN) ===
    attendees: string[]; // Mảng chứa ID của học viên có mặt
    createdBy: 'teacher' | 'team_leader'; // Xác định ai đã tạo bản ghi này
    creatorId: string; // ID của giáo viên hoặc nhóm trưởng đã tạo
}

// Dùng cho lịch học dự kiến
export interface TentativeScheduleItem {
    id: string;
    date: string;
    time: string;
    content: string;
    location: string;
    notes: string;
}

// Dùng cho báo cáo
export interface TeacherReport {
    teacherId: string;
    teacherName: string;
    theoryHours: number;
    practiceHours: number;
    totalHours: number;
}
// Dùng cho báo cáo đối chiếu
export enum Screen {
    OVERVIEW = 'Tổng quan',
    // Giữ nguyên các screen cũ
    COURSES = 'Khóa học',
    REPORTS = 'Báo cáo',
    MANAGEMENT = 'Quản trị',

    // === THÊM DÒNG NÀY VÀO ===
    RECONCILIATION_REPORT = 'Báo cáo Đối chiếu', 