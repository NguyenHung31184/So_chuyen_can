
import React, { useState, useEffect, useMemo } from 'react';
import { AppContext } from './contexts/AppContext';
import { User, Course, Student, Session, UserRole, Screen, AppContextType, WeeklyPlan } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, User as FirebaseUser } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
    doc, getDoc, setDoc, updateDoc, collection, onSnapshot, 
    addDoc, deleteDoc, Timestamp
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
    
    // --- DATA STATE (From Firestore) ---
    const [courses, setCourses] = useState<Course[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [users, setUsers] = useState<User[]>([]); 
    const [sessions, setSessions] = useState<Session[]>([]);
    const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    // --- AUTH & DATA FETCHING ---
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
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

        // Set up real-time listeners
        const unsubscribers = [
            onSnapshot(collection(db, "users"), snapshot => 
                setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)))),
            onSnapshot(collection(db, "courses"), snapshot => 
                setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)))),
            onSnapshot(collection(db, "students"), snapshot => 
                setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)))),
            onSnapshot(collection(db, "schedules"), snapshot => 
                setSessions(snapshot.docs.map(doc => {
                    const data = doc.data();
                    return { id: doc.id, ...data, date: (data.date as Timestamp).toDate().toISOString().split('T')[0] } as Session;
                }))),
            onSnapshot(collection(db, "weekly_plans"), snapshot => 
                setWeeklyPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyPlan))))
        ];

        setDataLoading(false);

        return () => {
            unsubscribeAuth();
            unsubscribers.forEach(unsub => unsub());
        };
    }, []);

    // --- HANDLERS ---
    const handleLogin = async (phone: string, password: string) => {
        setLoginError(null);
        const email = `${phone}@htts.com`;
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setLoginError("Số điện thoại hoặc mật khẩu không chính xác.");
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
        if (!firebaseUser) return;
        try {
            await updatePassword(firebaseUser, newPassword);
            await updateDoc(doc(db, "users", firebaseUser.uid), { mustChangePassword: false });
            setMustChangePassword(false);
        } catch (error: any) {
            setChangePasswordError(error.code === 'auth/weak-password' ? 'Mật khẩu quá yếu.' : 'Lỗi khi đổi mật khẩu.');
        }
    };

    const functions = getFunctions();
    const createUser = httpsCallable(functions, 'createUser');

    const handleAddUser = async (user: Omit<User, 'id'> & { password?: string }) => {
        if (!user.phone || !user.password) {
            throw new Error("Lỗi: Số điện thoại và mật khẩu là bắt buộc.");
        }
        try {
            const result = await createUser(user);
            return { success: true, message: (result.data as any).message || "Tạo người dùng thành công!" };
        } catch (error: any) {
            console.error("Lỗi khi gọi Cloud Function 'createUser':", error);
            return { success: false, message: error.message || "Đã có lỗi xảy ra khi tạo người dùng." };
        }
    };
    
    const handleAddDoc = (collectionName: string) => async (data: object) => {
        await addDoc(collection(db, collectionName), data);
    };

    const handleUpdateDoc = (collectionName: string) => async (docData: { id: string } & object) => {
        const { id, ...data } = docData;
        await updateDoc(doc(db, collectionName, id), data);
    };

    const handleDeleteDoc = (collectionName: string) => async (docId: string) => {
        await deleteDoc(doc(db, collectionName, docId));
    };

    // --- APP CONTEXT VALUE ---
    const appContextValue: AppContextType = useMemo(() => ({
        currentUser,
        courses,
        students,
        users,
        sessions,
        weeklyPlans,
        addSession: async (sessionData) => {
             await addDoc(collection(db, "schedules"), { ...sessionData, date: Timestamp.fromDate(new Date(sessionData.date)) });
        },
        updateSession: async (sessionData) => {
            const { id, ...data } = sessionData;
            await updateDoc(doc(db, "schedules", id), { ...data, date: Timestamp.fromDate(new Date(data.date))});
        },
        deleteSession: handleDeleteDoc("schedules"),
        addCourse: handleAddDoc("courses"),
        updateCourse: handleUpdateDoc("courses"),
        deleteCourse: handleDeleteDoc("courses"),
        addStudent: handleAddDoc("students"),
        updateStudent: handleUpdateDoc("students"),
        deleteStudent: handleDeleteDoc("students"),
        addUser: handleAddUser,
        updateUser: handleUpdateDoc("users"),
        deleteUser: handleDeleteDoc("users"),
        addWeeklyPlan: handleAddDoc("weekly_plans"),
        updateWeeklyPlan: handleUpdateDoc("weekly_plans"),
        deleteWeeklyPlan: handleDeleteDoc("weekly_plans"),
        teachers: users.filter(u => u.role === UserRole.TEACHER),
    }), [currentUser, sessions, courses, students, users, weeklyPlans]);

    // --- RENDER LOGIC ---
    const availableScreens = useMemo(() => {
        if (!currentUser) return [];
        const baseScreens = [Screen.OVERVIEW, Screen.COURSE];
        if (currentUser.role === UserRole.ADMIN) return [...baseScreens, Screen.REPORT, Screen.ADMIN];
        if (currentUser.role === UserRole.MANAGER) return [...baseScreens, Screen.REPORT];
        return baseScreens;
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
                if(currentUser && availableScreens.length > 0) {
                    setActiveScreen(availableScreens[0]);
                    return <OverviewScreen />;
                }
                return null;
        }
    };
    
    if (authLoading) return <div className="flex justify-center items-center min-h-screen">Đang khởi động...</div>;
    if (!currentUser) return <LoginScreen onLogin={handleLogin} error={loginError} />;
    if (mustChangePassword) return <ChangePasswordScreen onSubmit={handlePasswordChanged} error={changePasswordError} />;
    if (dataLoading) return <div className="flex justify-center items-center min-h-screen">Đang tải dữ liệu...</div>;

    return (
        <AppContext.Provider value={appContextValue}>
            <div className="min-h-screen bg-gray-100 font-sans">
                 <header className="bg-primary shadow-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <h1 className="text-xl font-bold text-white">Sổ Theo Dõi Điện Tử</h1>
                        <div>
                            <span className="text-white mr-4">Chào, {currentUser.name}!</span>
                            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Đăng xuất</button>
                        </div>
                    </div>
                </header>
                <main className="pb-16">{renderScreen()}</main>
                {availableScreens.length > 0 && <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} availableScreens={availableScreens} />}
            </div>
        </AppContext.Provider>
    );
};

export default App;
