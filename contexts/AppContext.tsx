import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Course, Student, User, Session, UserRole } from '../types'; // Đảm bảo UserRole được import
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
    
    // Session actions - Chú ý: Signature đã thay đổi để tự động hóa
    addSession: (sessionData: Omit<Session, 'id' | 'creatorId' | 'createdBy'>) => Promise<void>;
    updateSession: (session: Session) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;
}

// --- KHỞI TẠO CONTEXT --- //
export const AppContext = createContext<AppContextType | undefined>(undefined);

// Hook tùy chỉnh để sử dụng context dễ dàng hơn
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

// --- COMPONENT: APP PROVIDER --- //
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // === STATE ===
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthLoading, setAuthLoading] = useState<boolean>(true); // State để kiểm tra auth ban đầu
    const [courses, setCourses] = useState<Course[] | null>(null);
    const [students, setStudents] = useState<Student[] | null>(null);
    const [users, setUsers] = useState<User[] | null>(null);
    const [sessions, setSessions] = useState<Session[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    // === XỬ LÝ XÁC THỰC (AUTH) ===
    useEffect(() => {
        // Lắng nghe sự thay đổi trạng thái đăng nhập của người dùng
        const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
            if (userAuth) {
                // Người dùng đã đăng nhập, lấy thông tin chi tiết từ collection 'users'
                try {
                    const userProfile = await getDocument<User>('users', userAuth.uid);
                    if (userProfile) {
                        setCurrentUser({ ...userProfile, id: userAuth.uid });
                        await fetchData(); // Tải dữ liệu chính sau khi đã có user
                    } else {
                        // Trường hợp hiếm: có auth user nhưng không có profile trong DB
                        setCurrentUser(null);
                    }
                } catch (err) {
                    console.error("Lỗi khi lấy thông tin người dùng:", err);
                    setCurrentUser(null);
                }
            } else {
                // Người dùng đã đăng xuất
                setCurrentUser(null);
            }
            setAuthLoading(false); // Hoàn tất kiểm tra auth ban đầu
        });

        return () => unsubscribe(); // Hủy lắng nghe khi component unmount
    }, []);

    const logout = async () => {
        await signOut(auth);
        // Reset tất cả state
        setCurrentUser(null);
        setCourses(null);
        setStudents(null);
        setUsers(null);
        setSessions(null);
    };

    // --- TẢI DỮ LIỆU BAN ĐẦU --- //
    const fetchData = async () => {
        setLoading(true);
        try {
            const [coursesData, studentsData, usersData, sessionsData] = await Promise.all([
                fetchDataFromCollection<Course>('courses'),
                fetchDataFromCollection<Student>('students'),
                fetchDataFromCollection<User>('users'),
                fetchDataFromCollection<Session>('sessions'),
            ]);
            
            setCourses(coursesData);
            setStudents(studentsData);
            setUsers(usersData);
            setSessions(sessionsData);
            setError(null);
        } catch (e: any) {
            console.error("Lỗi khi tải dữ liệu từ Firestore:", e);
            setError(e);
        } finally {
            setLoading(false);
        }
    };
    
    // --- Quản lý Buổi học (Sessions) - ĐÃ CẬP NHẬT --- //
    const addSession = async (sessionData: Omit<Session, 'id' | 'creatorId' | 'createdBy'>) => {
        if (!currentUser) {
            throw new Error("Người dùng chưa đăng nhập. Không thể tạo buổi học.");
        }
        
        // Tự động thêm thông tin người tạo vào buổi học
        const newSessionData: Omit<Session, 'id'> = {
            ...sessionData,
            creatorId: currentUser.id,
            createdBy: currentUser.role === UserRole.TEACHER ? 'teacher' : 'team_leader',
        };

        const newDoc = await addDocument<Session>('sessions', newSessionData);
        // Cập nhật state local để UI phản hồi ngay lập tức
        setSessions(prev => (prev ? [...prev, { ...newSessionData, id: newDoc.id }] : [{ ...newSessionData, id: newDoc.id }]));
    };

    const updateSession = async (session: Session) => {
        await updateDocument<Session>('sessions', session.id, session);
        // Cập nhật state local
        setSessions(prev => prev ? prev.map(s => s.id === session.id ? session : s) : null);
    };

    const deleteSession = async (id: string) => {
        await deleteDocument('sessions', id);
        // Cập nhật state local
        setSessions(prev => prev ? prev.filter(s => s.id !== id) : null);
    };

    // --- CÁC HÀM KHÁC (ĐÃ TỐI ƯU HÓA) --- //
    // ... (Phần còn lại giữ nguyên logic nhưng tối ưu bằng cách cập nhật state local) ...
    // Ví dụ cho addCourse:
    const addCourse = async (course: Omit<Course, 'id'>) => {
        const newDoc = await addDocument<Course>('courses', course);
        setCourses(prev => prev ? [...prev, { ...course, id: newDoc.id }] : [{ ...course, id: newDoc.id }]);
    };
    // ... (Bạn có thể áp dụng tương tự cho các hàm update/delete của Course, Student, User) ...

    // --- CÁC HÀM CŨ CHƯA TỐI ƯU (GIỮ LẠI ĐỂ ĐẢM BẢO TÍNH TOÀN VẸN) --- //
    const updateUser = async (user: Partial<User> & { id: string }) => {
        await updateDocument<User>('users', user.id, user);
        fetchData();
    };
    const deleteUser = async (id: string) => {
        const functions = getFunctions();
        const callDeleteUser = httpsCallable(functions, 'deleteUser');
        try {
            await callDeleteUser({ uid: id });
            await fetchData();
        } catch (error: any) {
             console.error("Lỗi khi gọi Cloud Function 'deleteUser':", error);
            throw new Error(error.message || "Đã có lỗi xảy ra khi xóa người dùng.");
        }
    };
    const updateCourse = async (course: Course) => {
        await updateDocument<Course>('courses', course.id, course);
        fetchData();
    };
    const deleteCourse = async (id: string) => {
        await deleteDocument('courses', id);
        fetchData();
    };
    const addStudent = async (student: Omit<Student, 'id'>) => {
        await addDocument<Student>('students', student);
        fetchData();
    };
    const updateStudent = async (student: Student) => {
        await updateDocument<Student>('students', student.id, student);
        fetchData();
    };
    const deleteStudent = async (id: string) => {
        await deleteDocument('students', id);
        fetchData();
    };
     const addUser = async (user: Omit<User, 'id'>) => {
        const functions = getFunctions();
        const callCreateUser = httpsCallable(functions, 'createUser');
        try {
            const result = await callCreateUser(user);
            await fetchData(); 
            return { success: true, message: (result.data as any).message };
        } catch (error: any) {
            console.error("Lỗi khi gọi Cloud Function 'createUser':", error);
            return { success: false, message: error.message || "Đã có lỗi xảy ra khi tạo người dùng." };
        }
    };
    const batchAddUsers = async (users: Partial<User>[]) => {
        const promises = users.map(user => addUser(user as Omit<User, 'id'>));
        await Promise.all(promises);
        await fetchData();
    };
    const batchAddStudents = async (students: Partial<Student>[]) => {
        const promises = students.map(student => addStudent(student as Omit<Student, 'id'>));
        await Promise.all(promises);
        await fetchData();
    };

    // --- GIÁ TRỊ CONTEXT ĐƯỢC CUNG CẤP --- //
    const value: AppContextType = {
        currentUser,
        isAuthLoading,
        courses,
        students,
        users,
        sessions,
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
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};