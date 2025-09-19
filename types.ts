// File: types.ts
// Mô tả: Tập hợp tất cả các định nghĩa kiểu dữ liệu (Enums, Interfaces) cho toàn bộ ứng dụng.

// =======================================================================
// ENUMS - Định nghĩa các giá trị hằng số được sử dụng trong ứng dụng
// =======================================================================

/**
 * Định nghĩa các màn hình chính của ứng dụng để điều hướng.
 */
export enum Screen {
    OVERVIEW = 'Tổng quan',
    COURSES = 'Khóa học',
    REPORTS = 'Báo cáo',
    MANAGEMENT = 'Quản trị',
    RECONCILIATION_REPORT = 'Báo cáo Đối chiếu',
}

/**
 * Vai trò của người dùng trong hệ thống.
 */
export enum UserRole {
    ADMIN = 'Admin',
    MANAGER = 'Quản lý',
    TEAM_LEADER = 'Nhóm trưởng',
    TEACHER = 'Giáo viên',
}

/**
 * Chuyên môn của giáo viên (Lý thuyết hoặc Thực hành).
 */
export enum TeacherSpecialty {
    THEORY = 'Lý thuyết',
    PRACTICE = 'Thực hành',
    GENERAL = 'Tổng hợp',
}

/**
 * Loại hợp đồng của giáo viên.
 */
export enum TeacherContractType {
    FULL_TIME = 'Biên chế',
    CONTRACT = 'Hợp đồng',
}

/**
 * Hình thức thanh toán thù lao cho giáo viên.
 */
export enum PaymentType {
    RATE = 'rate',       // Thanh toán theo định mức (ví dụ: theo giờ, theo buổi)
    PACKAGE = 'package', // Thanh toán trọn gói cho một khóa học/nhiệm vụ
}

/**
 * Đơn vị tính cho hình thức thanh toán theo định mức.
 */
export enum RateUnit {
    HOUR = 'hour',       // Theo giờ
    SESSION = 'session', // Theo buổi học
}

/**
 * Loại nhiên liệu của phương tiện/thiết bị.
 */
export enum FuelType {
    ELECTRIC = 'Điện',
    DIESEL = 'Diesel',
}


// =======================================================================
// INTERFACES - Định nghĩa cấu trúc cho các đối tượng dữ liệu
// =======================================================================

/**
 * Cấu trúc thông tin thanh toán cho một giáo viên.
 */
export interface TeacherPayment {
    type: PaymentType;      // Hình thức thanh toán (theo định mức / trọn gói)
    amount: number;         // Số tiền
    rateUnit?: RateUnit;    // Đơn vị tính (bắt buộc nếu type là 'rate')
}

/**
 * Cấu trúc thông tin cho một phương tiện hoặc thiết bị.
 */
export interface Vehicle {
    id: string;
    name: string;             // Tên xe, ví dụ: "Xe nâng Komatsu"
    fuelType: FuelType;       // Loại nhiên liệu (Điện / Diesel)
    consumptionRate: number;  // Định mức tiêu thụ, ví dụ: 20
    consumptionUnit: string;  // Đơn vị tiêu thụ, ví dụ: "lít/giờ" hoặc "kWh/giờ"
}

/**
 * Cấu trúc thông tin chung cho một người dùng (bao gồm cả giáo viên).
 */
export interface User {
    id: string;
    name: string;
    phone: string;            // Dùng để đăng nhập
    role: UserRole;
    mustChangePassword?: boolean; // Yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên

    // Thuộc tính dành riêng cho giáo viên (role === TEACHER)
    specialty?: TeacherSpecialty;
    contractType?: TeacherContractType;
    courseIds?: string[];     // Danh sách ID các khóa học giáo viên này phụ trách
    payment?: TeacherPayment; // Cấu hình thù lao
}

/**
 * Cấu trúc thông tin cho một học viên.
 */
export interface Student {
    id: string;
    name: string;
    birthDate: string;
    phone: string;
    group: string;            // Nhóm của học viên
    courseId: string;         // ID của khóa học mà học viên đang tham gia
}

/**
 * Cấu trúc thông tin cho một khóa đào tạo.
 */
export interface Course {
    id: string;
    name: string;
    courseNumber: number;
    startDate: string;
    endDate: string;
}

/**
 * Cấu trúc thông tin cho một buổi học.
 */
export interface Session {
    id: string;
    courseId: string;
    startTimestamp: number;   // Dấu thời gian (timestamp) bắt đầu
    endTimestamp: number;     // Dấu thời gian (timestamp) kết thúc
    type: 'Lý thuyết' | 'Thực hành';
    teacherId: string;
    vehicleId?: string;       // ID của phương tiện sử dụng (nếu là buổi thực hành)
    content: string;          // Nội dung buổi học
    attendees: string[];      // Mảng các ID của học viên có mặt
    createdBy: 'teacher' | 'team_leader'; // Ai đã tạo buổi học này
    creatorId: string;        // ID của người tạo
}

/**
 * Cấu trúc cho Kế hoạch tuần (chưa sử dụng chi tiết).
 */
export interface WeeklyPlan {
    id: string;
    // ... các trường khác sẽ được thêm sau
}

/**
 * Cấu trúc cho một mục trong Lịch học dự kiến (chưa sử dụng chi tiết).
 */
export interface TentativeScheduleItem {
    id: string;
    date: string;
    time: string;
    content: string;
    location: string;
    notes: string;
}

/**
 * Cấu trúc dữ liệu cho một dòng trong báo cáo giáo viên.
 */
export interface TeacherReport {
    teacherId: string;
    teacherName: string;
    theoryHours: number;
    practiceHours: number;
    totalHours: number;
}


// =======================================================================
// APP CONTEXT TYPE - Định nghĩa cấu trúc cho Global State của ứng dụng
// =======================================================================

/**
 * Định nghĩa toàn bộ dữ liệu và các hàm hành động có sẵn trong AppContext.
 */
export interface AppContextType {
    // Dữ liệu
    currentUser: User | null;
    courses: Course[];
    students: Student[];
    users: User[];
    sessions: Session[];
    weeklyPlans: WeeklyPlan[];
    vehicles: Vehicle[];
    teachers: User[]; // Một danh sách đã được lọc sẵn để tiện sử dụng

    // Hành động (Functions)
    addSession: (data: Omit<Session, 'id'>) => Promise<void>;
    updateSession: (data: Session) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;

    addCourse: (data: Omit<Course, 'id'>) => Promise<void>;
    updateCourse: (data: Course) => Promise<void>;
    deleteCourse: (id: string) => Promise<void>;

    addStudent: (data: Omit<Student, 'id'>) => Promise<void>;
    updateStudent: (data: Student) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;

    addUser: (user: Omit<User, 'id'> & { password?: string }) => Promise<{ success: boolean; message: string }>;
    updateUser: (data: Partial<User> & { id: string }) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;

    addWeeklyPlan: (data: Omit<WeeklyPlan, 'id'>) => Promise<void>;
    updateWeeklyPlan: (data: WeeklyPlan) => Promise<void>;
    deleteWeeklyPlan: (id: string) => Promise<void>;

    addVehicle: (data: Omit<Vehicle, 'id'>) => Promise<void>;
    updateVehicle: (data: Vehicle) => Promise<void>;
    deleteVehicle: (id: string) => Promise<void>;
}