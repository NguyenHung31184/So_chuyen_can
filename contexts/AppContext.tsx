
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { User, Course, Student, Session, AppContextType } from '../types';

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const usersCollection = collection(db, "users");
            const coursesCollection = collection(db, "courses");
            const studentsCollection = collection(db, "students");
            const sessionsCollection = collection(db, "sessions");

            const [userSnap, courseSnap, studentSnap, sessionSnap] = await Promise.all([
                getDocs(usersCollection),
                getDocs(coursesCollection),
                getDocs(studentsCollection),
                getDocs(sessionsCollection)
            ]);

            const allUsers = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            const allCourses = courseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            const allStudents = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
            const allSessions = sessionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));

            setUsers(allUsers);
            setCourses(allCourses);
            setStudents(allStudents);
            setSessions(allSessions);

            setError(null);
        } catch (err) {
            console.error("Lỗi khi tải dữ liệu từ Firestore:", err);
            setError("Không thể tải dữ liệu. Vui lòng kiểm tra kết nối mạng và thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(); 
    }, [fetchData]);

    // --- Quản lý Người dùng (Users - bao gồm cả giáo viên) --- //
    const addUser = async (user: Omit<User, 'id'>) => {
        const functions = getFunctions();
        const callCreateUser = httpsCallable(functions, 'createUser');

        try {
            // Gửi dữ liệu cần thiết đến Cloud Function
            const result = await callCreateUser(user);
            
            // Sau khi function chạy thành công, tải lại toàn bộ dữ liệu để đồng bộ
            await fetchData(); 
    
            // Trả về kết quả thành công từ function
            return { success: true, message: (result.data as any).message };

        } catch (error: any) {
            console.error("Lỗi khi gọi Cloud Function 'createUser':", error);
            // Firebase trả về message lỗi thân thiện với người dùng trong `error.message`
            return { success: false, message: error.message || "Đã có lỗi xảy ra khi tạo người dùng." };
        }
    };

    const updateUser = async (userToUpdate: User) => {
        const userRef = doc(db, 'users', userToUpdate.id);
        await updateDoc(userRef, userToUpdate as Partial<User>);
        setUsers(prev => prev.map(u => u.id === userToUpdate.id ? userToUpdate : u));
    };

    const deleteUser = async (userId: string) => {
        // TODO: Deleting a Firebase Auth user requires admin privileges and should be done via a Cloud Function.
        const batch = writeBatch(db);
        const coursesToUpdate = courses.filter(c => (c.teacherIds || []).includes(userId));

        coursesToUpdate.forEach(course => {
            const courseRef = doc(db, "courses", course.id);
            const updatedTeacherIds = course.teacherIds?.filter(id => id !== userId);
            batch.update(courseRef, { teacherIds: updatedTeacherIds });
        });

        await batch.commit();
        await deleteDoc(doc(db, 'users', userId));
        setUsers(prev => prev.filter(u => u.id !== userId));
        setCourses(prev => prev.map(c => {
            if (coursesToUpdate.some(ctu => ctu.id === c.id)) {
                return { ...c, teacherIds: c.teacherIds?.filter(id => id !== userId) };
            }
            return c;
        }));
    };
    
    // --- Quản lý Khóa học --- //
    const addCourse = async (course: Omit<Course, 'id'>) => {
        const docRef = await addDoc(collection(db, 'courses'), course);
        setCourses(prev => [...prev, { id: docRef.id, ...course }].sort((a,b) => a.courseNumber - b.courseNumber));
    };

    const updateCourse = async (courseToUpdate: Course) => {
        const courseRef = doc(db, 'courses', courseToUpdate.id);
        await updateDoc(courseRef, courseToUpdate as Partial<Course>);
        setCourses(prev => prev.map(c => c.id === courseToUpdate.id ? courseToUpdate : c).sort((a, b) => a.courseNumber - b.courseNumber));
    };

    const deleteCourse = async (courseId: string) => {
        await deleteDoc(doc(db, 'courses', courseId));
        setCourses(prev => prev.filter(c => c.id !== courseId));
    };

    // --- Quản lý Học viên --- //
    const addStudent = async (student: Omit<Student, 'id'>) => {
        const docRef = await addDoc(collection(db, 'students'), student);
        setStudents(prev => [...prev, { id: docRef.id, ...student }]);
    };

    const updateStudent = async (studentToUpdate: Student) => {
        const studentRef = doc(db, 'students', studentToUpdate.id);
        await updateDoc(studentRef, studentToUpdate as Partial<Student>);
        setStudents(prev => prev.map(s => s.id === studentToUpdate.id ? studentToUpdate : s));
    };

    const deleteStudent = async (studentId: string) => {
        await deleteDoc(doc(db, 'students', studentId));
        setStudents(prev => prev.filter(s => s.id !== studentId));
    };

    // --- Quản lý Buổi học --- //
    const addSession = async (session: Omit<Session, 'id'>) => {
        const docRef = await addDoc(collection(db, 'sessions'), session);
        setSessions(prev => [...prev, { id: docRef.id, ...session }]);
    };

    const updateSession = async (sessionToUpdate: Session) => {
        const sessionRef = doc(db, 'sessions', sessionToUpdate.id);
        await updateDoc(sessionRef, sessionToUpdate as Partial<Session>);
        setSessions(prev => prev.map(s => s.id === sessionToUpdate.id ? sessionToUpdate : s));
    };

    const deleteSession = async (sessionId: string) => {
        await deleteDoc(doc(db, 'sessions', sessionId));
        setSessions(prev => prev.filter(s => s.id !== sessionId));
    };
    
    const contextValue = {
        currentUser, setCurrentUser, users, courses, students, sessions, loading, error,
        fetchData, 
        addCourse, updateCourse, deleteCourse, 
        addStudent, updateStudent, deleteStudent, 
        addUser, updateUser, deleteUser, 
        addSession, updateSession, deleteSession
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};
