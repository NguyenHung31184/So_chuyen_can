// File: App.tsx

import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AppContext } from './contexts/AppContext';
import { User, Course, Student, Session, UserRole, Screen, AppContextType, WeeklyPlan, Vehicle } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, User as FirebaseUser } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
    doc, getDoc, updateDoc, collection, onSnapshot, 
    addDoc, deleteDoc
} from 'firebase/firestore';

import LoginScreen from './screens/LoginScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import OverviewScreen from './screens/OverviewScreen';
import CourseScreen from './screens/CourseScreen';
import ReportScreen from './screens/ReportScreen';
import ManagementScreen from './screens/ManagementScreen';
import BottomNav from './components/BottomNav';
import ReconciliationReportScreen from './screens/ReconciliationReportScreen';

// Icons
import { FiLogOut, FiUser } from "react-icons/fi";

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
    const [mustChangePassword, setMustChangePassword] = useState(false);
    
    const [activeScreen, setActiveScreen] = useState<Screen>(Screen.OVERVIEW);
    
    const [courses, setCourses] = useState<Course[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [users, setUsers] = useState<User[]>([]); 
    const [sessions, setSessions] = useState<Session[]>([]);
    const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

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

        const unsubscribers = [
            onSnapshot(collection(db, "users"), snapshot => 
                setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)))),
            onSnapshot(collection(db, "courses"), snapshot => 
                setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)))),
            onSnapshot(collection(db, "students"), snapshot => 
                setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)))),
            onSnapshot(collection(db, "schedules"), snapshot => 
                setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)))),
            onSnapshot(collection(db, "weekly_plans"), snapshot => 
                setWeeklyPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyPlan)))),
            onSnapshot(collection(db, "vehicles"), snapshot => 
                setVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle))))
        ];

        setDataLoading(false);

        return () => {
            unsubscribeAuth();
            unsubscribers.forEach(unsub => unsub());
        };
    }, []);

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

    const appContextValue: AppContextType | null = useMemo(() => {
        if (dataLoading) return null;
        return {
            currentUser,
            courses,
            students,
            users,
            sessions,
            weeklyPlans,
            vehicles,
            addSession: handleAddDoc("schedules"),
            updateSession: handleUpdateDoc("schedules"),
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
            addVehicle: handleAddDoc("vehicles"),
            updateVehicle: handleUpdateDoc("vehicles"),
            deleteVehicle: handleDeleteDoc("vehicles"),
            teachers: users.filter(u => u.role === UserRole.TEACHER),
        }
    }, [currentUser, sessions, courses, students, users, weeklyPlans, vehicles, dataLoading]);
    
    const availableScreens = useMemo(() => {
        if (!currentUser) return [];
        const baseScreens = [Screen.OVERVIEW, Screen.COURSES]; 
        if (currentUser.role === UserRole.ADMIN) return [...baseScreens, Screen.REPORTS, Screen.MANAGEMENT];
        if (currentUser.role === UserRole.MANAGER) return [...baseScreens, Screen.REPORTS];
        if (currentUser.role === UserRole.TEAM_LEADER) return [Screen.COURSES];
        return baseScreens;
    }, [currentUser]);

    const renderScreen = () => {
        if (availableScreens.length > 0 && !availableScreens.includes(activeScreen)) {
            setActiveScreen(availableScreens[0]);
            return null;
        }
        switch (activeScreen) {
            case Screen.OVERVIEW: return <OverviewScreen />;
            case Screen.COURSES: return <CourseScreen />;
            case Screen.REPORTS: return <ReportScreen />;
            case Screen.MANAGEMENT: return <ManagementScreen setActiveScreen={setActiveScreen} />;
            case Screen.RECONCILIATION_REPORT: return <ReconciliationReportScreen />;
            default: 
                if(currentUser && availableScreens.length > 0) {
                    setActiveScreen(availableScreens[0]);
                    return <OverviewScreen />;
                }
                return null;
        }
    };
    
    if (authLoading) return <div className="flex justify-center items-center min-h-screen font-sans">Đang khởi động...</div>;
    if (!currentUser) return <LoginScreen onLogin={handleLogin} error={loginError} />;
    if (mustChangePassword) return <ChangePasswordScreen onSubmit={handlePasswordChanged} error={changePasswordError} />;
    if (dataLoading || !appContextValue) return <div className="flex justify-center items-center min-h-screen font-sans">Đang tải dữ liệu...</div>;

    return (
        <AppContext.Provider value={appContextValue}>
            <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
                 <header className="bg-white shadow-sm sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-600 p-1.5 rounded-lg">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </div>
                            <h1 className="text-lg font-bold text-gray-800 tracking-tight">Sổ Theo Dõi</h1>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-gray-800 leading-none">{currentUser.name}</span>
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{currentUser.role}</span>
                            </div>
                            <div className="h-8 w-[1px] bg-gray-200 mx-1"></div>
                            <button 
                                onClick={handleLogout} 
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                title="Đăng xuất"
                            >
                                <FiLogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>
                <main className="pb-20">{renderScreen()}</main>
                {availableScreens.length > 0 && <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} availableScreens={availableScreens} />}
            </div>
        </AppContext.Provider>
    );
};

export default App;