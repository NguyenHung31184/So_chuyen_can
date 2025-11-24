import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Course, Student, User, Session, UserRole, Vehicle } from '../types'; // Đảm bảo UserRole được import
import { fetchDataFromCollection, addDocument, updateDocument, deleteDocument, getDocument } from '../services/firebaseService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../firebase'; // Import auth từ file firebase.ts của bạn
import { onAuthStateChanged, signOut } from 'firebase/auth';

// --- ĐỊNH NGHĨA TYPE CHO CONTEXT --- //
export interface AppContextType {
    // === TRẠNG THÁI NGƯỜI DÙNG HIỆN TẠI ===
    currentUser: User | null; // Lưu thông tin người dùng đang đăng nhập
    isAuthLoading: boolean; // Trạng thái chờ xác thực ban đầu

    // === TRẠNG THÁI DỮ LIỆU ===
    courses: Course[] | null;
    students: Student[] | null;
    users: User[] | null;
    sessions: Session[] | null;
    vehicles: Vehicle[] | null;
    loading: boolean;
    error: Error | null;

    fetchData: () => Promise<void>;
    
    // === HÀM XÁC THỰC ===
    logout: () => Promise<void>;

    // === CÁC HÀM XỬ LÝ DỮ LIỆU (ACTIONS) ===
    // Course actions
    addCourse: (course: Omit<Course, 'id'>) => Promise<void>;
    updateCourse: (course: Course) => Promise<void>;
    deleteCourse: (id: string) => Promise<void>;

    // Student actions
    addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
    updateStudent: (student: Student) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;
    batchAddStudents: (students: Partial<Student>[]) => Promise<void>;

    // User actions
    addUser: (user: Omit<User, 'id'> & { password?: string }) => Promise<{ success: boolean; message: string }>;
    updateUser: (user: Partial<User> & { id: string }) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    batchAddUsers: (users: Partial<User>[]) => Promise<void>;
    
    // Session actions
    addSession: (sessionData: Omit<Session, 'id' | 'creatorId' | 'createdBy'>) => Promise<void>;
    updateSession: (session: Session) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;

    // Vehicle actions
    addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
    updateVehicle: (vehicle: Vehicle) => Promise<void>;
    deleteVehicle: (id: string) => Promise<void>;
}

// --- KHỞI TẠO CONTEXT --- //
export const AppContext = createContext<AppContextType | undefined>(undefined);

// --- COMPONENT: APP PROVIDER --- //
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // === STATE ===
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthLoading, setAuthLoading] = useState<boolean>(true); // State để kiểm tra auth ban đầu
    const [courses, setCourses] = useState<Course[] | null>(null);
    const [students, setStudents] = useState<Student[] | null>(null);
    const [users, setUsers] = useState<User[] | null>(null);
    const [sessions, setSessions] = useState<Session[] | null>(null);
    const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    // === XỬ LÝ XÁC THỰC (AUTH) ===
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
            if (userAuth) {
                try {
                    const userProfile = await getDocument<User>('users', userAuth.uid);
                    if (userProfile) {
                        setCurrentUser({ ...userProfile, id: userAuth.uid });
                        await fetchData();
                    } else {
                        setCurrentUser(null);
                    }
                } catch (err) {
                    console.error("Lỗi khi lấy thông tin người dùng:", err);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await signOut(auth);
        setCurrentUser(null);
        setCourses(null);
        setStudents(null);
        setUsers(null);
        setSessions(null);
        setVehicles(null);
    };

    // --- TẢI DỮ LIỆU BAN ĐẦU --- //
    const fetchData = async () => {
        setLoading(true);
        try {
            const [coursesData, studentsData, usersData, sessionsData, vehiclesData] = await Promise.all([
                fetchDataFromCollection<Course>('courses'),
                fetchDataFromCollection<Student>('students'),
                fetchDataFromCollection<User>('users'),
                fetchDataFromCollection<Session>('sessions'),
                fetchDataFromCollection<Vehicle>('vehicles'),
            ]);
            
            setCourses(coursesData);
            setStudents(studentsData);
            setUsers(usersData);
            setSessions(sessionsData);
            setVehicles(vehiclesData);
            setError(null);
        } catch (e: any) {
            console.error("Lỗi khi tải dữ liệu từ Firestore:", e);
            setError(e);
        } finally {
            setLoading(false);
        }
    };
    
    // --- CRUD Operations --- //

    // Generic function to add a document and update state
    const addDataItem = async <T extends {id: string}>(collection: string, data: Omit<T, 'id'>, setter: React.Dispatch<React.SetStateAction<T[] | null>>) => {
        const newDoc = await addDocument<T>(collection, data);
        const newItem = { ...data, id: newDoc.id } as T;
        setter(prev => (prev ? [...prev, newItem] : [newItem]));
        return newItem;
    };
    
    // Generic function to update a document and update state
    const updateDataItem = async <T extends {id: string}>(collection: string, item: T, setter: React.Dispatch<React.SetStateAction<T[] | null>>) => {
        await updateDocument<T>(collection, item.id, item);
        setter(prev => prev ? prev.map(d => d.id === item.id ? item : d) : null);
    };

    // Generic function to delete a document and update state
    const deleteDataItem = async (collection: string, id: string, setter: React.Dispatch<React.SetStateAction<any[] | null>>) => {
        await deleteDocument(collection, id);
        setter(prev => prev ? prev.filter(d => d.id !== id) : null);
    };

    // Courses
    const addCourse = (course: Omit<Course, 'id'>) => addDataItem('courses', course, setCourses);
    const updateCourse = (course: Course) => updateDataItem('courses', course, setCourses);
    const deleteCourse = (id: string) => deleteDataItem('courses', id, setCourses);

    // Students
    const addStudent = (student: Omit<Student, 'id'>) => addDataItem('students', student, setStudents);
    const updateStudent = (student: Student) => updateDataItem('students', student, setStudents);
    const deleteStudent = (id: string) => deleteDataItem('students', id, setStudents);

    // Vehicles
    const addVehicle = (vehicle: Omit<Vehicle, 'id'>) => addDataItem('vehicles', vehicle, setVehicles);
    const updateVehicle = (vehicle: Vehicle) => updateDataItem('vehicles', vehicle, setVehicles);
    const deleteVehicle = (id: string) => deleteDataItem('vehicles', id, setVehicles);
    
    // Sessions
    const addSession = async (sessionData: Omit<Session, 'id' | 'creatorId' | 'createdBy'>) => {
        if (!currentUser) throw new Error("Người dùng chưa đăng nhập.");
        const newSessionData: Omit<Session, 'id'> = {
            ...sessionData,
            creatorId: currentUser.id,
            createdBy: currentUser.role === UserRole.TEACHER ? 'teacher' : 'team_leader',
        };
        await addDataItem('sessions', newSessionData, setSessions);
    };
    const updateSession = (session: Session) => updateDataItem('sessions', session, setSessions);
    const deleteSession = (id: string) => deleteDataItem('sessions', id, setSessions);
    
    // Users (Special Handling for Firebase Auth)
    const addUser = async (user: Omit<User, 'id'> & { password?: string }) => {
        const functions = getFunctions();
        const callCreateUser = httpsCallable(functions, 'createUser');
        try {
            const result = await callCreateUser(user) as any;
            if (result.data.success && result.data.uid) {
                const newUser = { ...user, id: result.data.uid };
                // Remove password before adding to state
                delete newUser.password;
                setUsers(prev => (prev ? [...prev, newUser as User] : [newUser as User]));
            }
            return { success: result.data.success, message: result.data.message };
        } catch (error: any) {
            console.error("Lỗi khi gọi Cloud Function 'createUser':", error);
            return { success: false, message: error.message || "Đã có lỗi xảy ra khi tạo người dùng." };
        }
    };
    
    const updateUser = async (user: Partial<User> & { id: string }) => {
        await updateDocument<User>('users', user.id, user);
        setUsers(prev => prev ? prev.map(u => u.id === user.id ? { ...u, ...user } : u) : null);
    };

    const deleteUser = async (id: string) => {
        const functions = getFunctions();
        const callDeleteUser = httpsCallable(functions, 'deleteUser');
        try {
            await callDeleteUser({ uid: id });
            setUsers(prev => prev ? prev.filter(u => u.id !== id) : null);
        } catch (error: any) {
             console.error("Lỗi khi gọi Cloud Function 'deleteUser':", error);
            throw new Error(error.message || "Đã có lỗi xảy ra khi xóa người dùng.");
        }
    };

    const batchAddUsers = async (users: Partial<User>[]) => {
        // This could be further optimized with a dedicated backend function
        const promises = users.map(user => addUser(user as Omit<User, 'id'>));
        await Promise.all(promises);
    };

    const batchAddStudents = async (students: Partial<Student>[]) => {
        // This could be further optimized
        const promises = students.map(student => addStudent(student as Omit<Student, 'id'>));
        await Promise.all(promises);
    };

    // --- GIÁ TRỊ CONTEXT ĐƯỢC CUNG CẤP --- //
    const value: AppContextType = {
        currentUser,
        isAuthLoading,
        courses,
        students,
        users,
        sessions,
        vehicles,
        loading,
        error,
        fetchData,
        logout,
        addCourse,
        updateCourse,
        deleteCourse,
        addStudent,
        updateStudent,
        deleteStudent,
        batchAddStudents,
        addUser,
        updateUser,
        deleteUser,
        batchAddUsers,
        addSession,
        updateSession,
        deleteSession,
        addVehicle,
        updateVehicle,
        deleteVehicle
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

// Hook tùy chỉnh để sử dụng context dễ dàng hơn
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
