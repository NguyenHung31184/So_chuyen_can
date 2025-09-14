
import React, { useState, useEffect, useMemo } from 'react';
import { AppContext } from './contexts/AppContext';
import { User, Course, Teacher, Student, Session, UserRole, Screen, AppContextType } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, User as FirebaseUser } from 'firebase/auth';
import { 
    doc, getDoc, setDoc, updateDoc, collection, onSnapshot, 
    addDoc, deleteDoc, Timestamp, where, query, getDocs 
} from 'firebase/firestore';

import LoginScreen from './screens/LoginScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import OverviewScreen from './screens/OverviewScreen';
import CourseScreen from './screens/CourseScreen';
import ReportScreen from './screens/ReportScreen';
import ManagementScreen from './screens/ManagementScreen';
import BottomNav from './components/BottomNav';

const App: React.FC = () => {
    // --- AUTH STATE ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
    const [mustChangePassword, setMustChangePassword] = useState(false);
    
    // --- UI STATE ---
    const [activeScreen, setActiveScreen] = useState<Screen>(Screen.OVERVIEW);
    
    // --- DATA STATE (Now from Firestore) ---
    const [courses, setCourses] = useState<Course[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [users, setUsers] = useState<User[]>([]); // This will be loaded immediately
    const [sessions, setSessions] = useState<Session[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    // --- INITIAL USER DATA FETCH ---
    // Fetch all users immediately for the login process to work.
    useEffect(() => {
        const usersCollectionRef = collection(db, "users");
        const unsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(usersData);
            const teachersData = usersData.filter(user => user.role === UserRole.TEACHER) as Teacher[];
            setTeachers(teachersData);
            console.log("Fetched users for login screen.");
        });
        return () => unsubscribe();
    }, []);


    // --- AUTH LOGIC ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);
            if (fbUser) {
                const userDocRef = doc(db, "users", fbUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data() as User;
                    setCurrentUser({ ...userData, id: userDocSnap.id });
                    setMustChangePassword(!!userData.mustChangePassword);
                } else {
                    console.error(`User document for UID ${fbUser.uid} not found in Firestore. Signing out.`);
                    await signOut(auth);
                }
            } else {
                setCurrentUser(null);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- DETAILED DATA FETCHING LOGIC (RUNS AFTER LOGIN) ---
    useEffect(() => {
        if (!currentUser) {
            // Clear sensitive data on logout, but keep users loaded
            setCourses([]);
            setStudents([]);
            setSessions([]);
            return;
        }

        setDataLoading(true);

        const unsubscribes = [
            // Listener for Courses
            onSnapshot(collection(db, "courses"), (snapshot) => {
                const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
                setCourses(coursesData);
            }),
            // Listener for Students
            onSnapshot(collection(db, "students"), (snapshot) => {
                const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
                setStudents(studentsData);
            }),
            // Listener for Sessions/Schedules
            onSnapshot(collection(db, "schedules"), (snapshot) => {
                const sessionsData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        date: (data.date as Timestamp).toDate().toISOString().split('T')[0],
                    } as Session;
                });
                setSessions(sessionsData);
            }),
        ];
        
        // Mark data as loaded
        setDataLoading(false);

        // Cleanup function to unsubscribe from all listeners on logout/unmount
        return () => unsubscribes.forEach(unsub => unsub());
    }, [currentUser]);


    // --- HANDLERS ---
    const handleLogin = async (phone: string, password: string) => {
        setLoginError(null);
        
        // Now `users` state is already populated
        const user = users.find(u => u.phone === phone);

        if (!user || !user.email) {
            setLoginError("Số điện thoại không tồn tại hoặc không hợp lệ.");
            return;
        }
        
        try {
            await signInWithEmailAndPassword(auth, user.email, password);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setLoginError("Mật khẩu không chính xác.");
            } else {
                console.error("Login Error:", error);
                setLoginError("Đã có lỗi xảy ra. Vui lòng thử lại.");
            }
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        setActiveScreen(Screen.OVERVIEW);
    };

    const handlePasswordChanged = async (newPassword: string) => {
        if (!firebaseUser) {
            setChangePasswordError("Không tìm thấy thông tin người dùng.");
            return;
        }
        setChangePasswordError(null);
        try {
            await updatePassword(firebaseUser, newPassword);
            const userDocRef = doc(db, "users", firebaseUser.uid);
            await updateDoc(userDocRef, { mustChangePassword: false });
            setMustChangePassword(false);
        } catch (error: any) {
            setChangePasswordError(error.code === 'auth/weak-password' ? 'Mật khẩu quá yếu.' : 'Lỗi khi đổi mật khẩu.');
        }
    };

    // --- GENERIC FIRESTORE CRUD HANDLERS ---
    const handleAddDoc = (collectionName: string) => async (data: object) => {
        await addDoc(collection(db, collectionName), data);
    };

    const handleUpdateDoc = (collectionName: string) => async (docData: { id: string } & object) => {
        const { id, ...data } = docData;
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, data);
    };

    const handleDeleteDoc = (collectionName: string) => async (docId: string) => {
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
    };
    
    // --- APP CONTEXT VALUE ---
    const appContextValue: AppContextType = useMemo(() => ({
        currentUser,
        courses,
        teachers,
        students,
        users,
        sessions,
        addSession: async (sessionData) => {
             const dataWithTimestamp = { ...sessionData, date: Timestamp.fromDate(new Date(sessionData.date)) };
             await addDoc(collection(db, "schedules"), dataWithTimestamp);
        },
        updateSession: async (sessionData) => {
            const { id, ...data } = sessionData;
            const docRef = doc(db, "schedules", id);
            const dataWithTimestamp = { ...data, date: Timestamp.fromDate(new Date(data.date))};
            await updateDoc(docRef, dataWithTimestamp);
        },
        deleteSession: handleDeleteDoc("schedules"),
        
        addCourse: handleAddDoc("courses"),
        updateCourse: handleUpdateDoc("courses"),
        deleteCourse: handleDeleteDoc("courses"),
        
        addTeacher: handleAddDoc("users"),
        updateTeacher: handleUpdateDoc("users"),
        deleteTeacher: handleDeleteDoc("users"),

        addStudent: handleAddDoc("students"),
        updateStudent: handleUpdateDoc("students"),
        deleteStudent: handleDeleteDoc("students"),

        addUser: handleAddDoc("users"),
        updateUser: handleUpdateDoc("users"),
        deleteUser: handleDeleteDoc("users"),
    }), [currentUser, sessions, courses, teachers, students, users]);

    // --- RENDER LOGIC ---
    const availableScreens = useMemo(() => {
        if (!currentUser) return [];
        switch (currentUser.role) {
            case UserRole.ADMIN: return [Screen.OVERVIEW, Screen.COURSE, Screen.REPORT, Screen.ADMIN];
            case UserRole.MANAGER: return [Screen.OVERVIEW, Screen.COURSE, Screen.REPORT];
            case UserRole.TEACHER: return [Screen.OVERVIEW, Screen.COURSE];
            case UserRole.STUDENT: return [Screen.COURSE];
            default: return [];
        }
    }, [currentUser]);

    const renderScreen = () => {
        if (availableScreens.length > 0 && !availableScreens.includes(activeScreen)) {
            setActiveScreen(availableScreens[0]);
            return null;
        }
        switch (activeScreen) {
            case Screen.OVERVIEW: return <OverviewScreen />;
            case Screen.COURSE: return <CourseScreen />;
            case Screen.REPORT: return <ReportScreen />;
            case Screen.ADMIN: return <ManagementScreen />;
            default: 
                // If user is logged in but has no available screens (or active screen is invalid), default to first available one
                if(currentUser && availableScreens.length > 0) {
                    return <OverviewScreen />;
                }
                return null;
        }
    };
    
    if (authLoading) {
        return <div className="flex justify-center items-center min-h-screen">Đang khởi động...</div>;
    }

    if (!currentUser) {
        return <LoginScreen onLogin={handleLogin} error={loginError} />;
    }
    
    if (mustChangePassword) {
        return <ChangePasswordScreen onSubmit={handlePasswordChanged} error={changePasswordError} />;
    }
    
    if (dataLoading) {
        return <div className="flex justify-center items-center min-h-screen">Đang tải dữ liệu...</div>;
    }

    return (
        <AppContext.Provider value={appContextValue}>
            <div className="min-h-screen bg-gray-100 font-sans">
                 <header className="bg-primary shadow-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <h1 className="text-xl font-bold text-white">Sổ Theo Dõi Điện Tử</h1>
                        <div>
                            <span className="text-white mr-4">Chào, {currentUser.name}!</span>
                            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </header>

                <main className="pb-16">{renderScreen()}</main>
                
                {availableScreens.length > 0 && 
                    <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} availableScreens={availableScreens} />
                }
            </div>
        </AppContext.Provider>
    );
};

export default App;
