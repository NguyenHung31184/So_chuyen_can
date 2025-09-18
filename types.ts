// File: types.ts

// =======================================================================
// ENUMS - Định nghĩa các hằng số
// =======================================================================

export enum Screen {
    OVERVIEW = 'Tổng quan',
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
                                                                                                                                                                                                            startTimestamp: number;
                                                                                                                                                                                                                endTimestamp: number;
                                                                                                                                                                                                                    type: 'Lý thuyết' | 'Thực hành';
                                                                                                                                                                                                                        teacherId: string;
                                                                                                                                                                                                                            vehicleId?: string;
                                                                                                                                                                                                                                content: string;
                                                                                                                                                                                                                                    attendees: string[];
                                                                                                                                                                                                                                        createdBy: 'teacher' | 'team_leader';
                                                                                                                                                                                                                                            creatorId: string;
                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                            export interface WeeklyPlan {
                                                                                                                                                                                                                                                id: string;
                                                                                                                                                                                                                                                    // Thêm các trường khác cho WeeklyPlan nếu có
                                                                                                                                                                                                                                                        // Ví dụ: title: string; content: string;
                                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                                        export interface TentativeScheduleItem {
                                                                                                                                                                                                                                                            id: string;
                                                                                                                                                                                                                                                                date: string;
                                                                                                                                                                                                                                                                    time: string;
                                                                                                                                                                                                                                                                        content: string;
                                                                                                                                                                                                                                                                            location: string;
                                                                                                                                                                                                                                                                                notes: string;
                                                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                                                export interface TeacherReport {
                                                                                                                                                                                                                                                                                    teacherId: string;
                                                                                                                                                                                                                                                                                        teacherName: string;
                                                                                                                                                                                                                                                                                            theoryHours: number;
                                                                                                                                                                                                                                                                                                practiceHours: number;
                                                                                                                                                                                                                                                                                                    totalHours: number;
                                                                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                                                                    // Định nghĩa Type cho AppContext để sử dụng trong App.tsx
                                                                                                                                                                                                                                                                                                    export interface AppContextType {
                                                                                                                                                                                                                                                                                                        currentUser: User | null;
                                                                                                                                                                                                                                                                                                            courses: Course[];
                                                                                                                                                                                                                                                                                                                students: Student[];
                                                                                                                                                                                                                                                                                                                    users: User[];
                                                                                                                                                                                                                                                                                                                        sessions: Session[];
                                                                                                                                                                                                                                                                                                                            weeklyPlans: WeeklyPlan[];
                                                                                                                                                                                                                                                                                                                                vehicles: Vehicle[];
                                                                                                                                                                                                                                                                                                                                    teachers: User[];
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