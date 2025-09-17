
// =======================================================================
// ENUMS - Định nghĩa các giá trị hằng số để đảm bảo tính nhất quán
// =======================================================================

export enum UserRole {
    ADMIN = 'Admin',
    MANAGER = 'Manager',
    TEACHER = 'Teacher',
    STUDENT = 'Student',
    GROUP_LEADER = 'Nhóm trưởng',
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

export enum SessionType {
    THEORY = 'Lý thuyết',
    PRACTICE = 'Thực hành',
}

export enum Screen {
    OVERVIEW = 'Tổng quan',
    COURSE = 'Khoá học',
    REPORT = 'Báo cáo',
    ADMIN = 'Quản trị',
}

// --- NEW: Enums cho cấu trúc chi phí mới ---
export enum PaymentType {
    RATE = 'rate',      // Theo định mức
    PACKAGE = 'package', // Trọn gói
}

export enum RateUnit {
    HOUR = 'hour',      // Theo giờ
    SESSION = 'session', // Theo buổi
}

export enum FuelType {
    ELECTRIC = 'Điện',
    DIESEL = 'Diesel',
}


// =======================================================================
// INTERFACES - Định nghĩa cấu trúc cho các đối tượng dữ liệu
// =======================================================================

// --- NEW: Cấu trúc lưu trữ thông tin thù lao của giáo viên ---
export interface TeacherPayment {
    type: PaymentType;  // 'rate' hoặc 'package'
    amount: number;     // Số tiền (VNĐ)
    rateUnit?: RateUnit; // 'hour' hoặc 'session' (chỉ áp dụng khi type là 'rate')
}

// --- NEW: Cấu trúc cho phương tiện/thiết bị thực hành ---
export interface Vehicle {
    id: string;
    name: string;
    fuelType: FuelType;
    consumptionRate: number; // Định mức tiêu thụ
    consumptionUnit: string; // Đơn vị của định mức (ví dụ: "kWh/giờ" hoặc "lít/giờ")
}


export interface User {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
    email?: string;
    mustChangePassword?: boolean;
    
    // Các trường dành riêng cho giáo viên
    contractType?: TeacherContractType;
    specialty?: TeacherSpecialty;
    courseIds?: string[];
    
    // --- UPDATED: Thêm thông tin thù lao cho giáo viên ---
    theoryPayment?: TeacherPayment;
    practicePayment?: TeacherPayment;
}

export interface Teacher extends User {
    role: UserRole.TEACHER;
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

    // --- UPDATED: Thêm ID của phương tiện đã sử dụng cho buổi thực hành ---
    vehicleId?: string; 
}

export interface WeeklyPlan {
    id: string;
    date: string;
    timeRange: string;
    content: string;
    type: string;
    instructor: string;
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


// =======================================================================
// APP CONTEXT TYPE - Định nghĩa cấu trúc cho Global State Management
// =======================================================================

export interface AppContextType {
    currentUser: User | null;
    courses: Course[];
    students: Student[];
    sessions: Session[];
    users: User[];
    weeklyPlans: WeeklyPlan[];
    // --- NEW: Thêm 'vehicles' vào context ---
    vehicles: Vehicle[];

    // --- Các hàm xử lý dữ liệu (async) ---
    addCourse: (course: Omit<Course, 'id'>) => Promise<void>;
    updateCourse: (course: Course) => Promise<void>;
    deleteCourse: (courseId: string) => Promise<void>;
    
    addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
    updateStudent: (student: Student) => Promise<void>;
    deleteStudent: (studentId: string) => Promise<void>;
    
    addSession: (session: Omit<Session, 'id'>) => Promise<void>;
    updateSession: (session: Session) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    
    addUser: (user: Omit<User, 'id'>) => Promise<{success: boolean, message: string}>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    
    addWeeklyPlan: (plan: Omit<WeeklyPlan, 'id'>) => Promise<void>;
    updateWeeklyPlan: (plan: WeeklyPlan) => Promise<void>;
    deleteWeeklyPlan: (planId: string) => Promise<void>;

    // --- NEW: Thêm các hàm quản lý phương tiện ---
    addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
    updateVehicle: (vehicle: Vehicle) => Promise<void>;
    deleteVehicle: (vehicleId: string) => Promise<void>;
}
