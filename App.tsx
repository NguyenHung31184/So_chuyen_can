
import React, { useState, useMemo } from 'react';
import { User, Screen, UserRole } from './types';
import { USERS, COURSES, TEACHERS, STUDENTS, SESSIONS } from './data';
import LoginScreen from './screens/LoginScreen';
import OverviewScreen from './screens/OverviewScreen';
import CourseScreen from './screens/CourseScreen';
import ReportScreen from './screens/ReportScreen';
import AdminScreen from './screens/AdminScreen';
import BottomNav from './components/BottomNav';
import { Course, Teacher, Student, Session } from './types';
import { AppContext } from './contexts/AppContext';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.OVERVIEW);
  
  // Mock database state
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [teachers, setTeachers] = useState<Teacher[]>(TEACHERS);
  const [students, setStudents] = useState<Student[]>(STUDENTS);
  const [sessions, setSessions] = useState<Session[]>(SESSIONS);

  const handleLogin = (phone: string) => {
    const user = USERS.find(u => u.phone === phone);
    if (user) {
      setCurrentUser(user);
    } else {
      alert('Số điện thoại không hợp lệ!');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveScreen(Screen.OVERVIEW);
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case Screen.OVERVIEW:
        return <OverviewScreen />;
      case Screen.COURSE:
        return <CourseScreen />;
      case Screen.REPORT:
        return <ReportScreen />;
      case Screen.ADMIN:
        return <AdminScreen />;
      default:
        return <OverviewScreen />;
    }
  };

  const appContextValue = useMemo(() => ({
    currentUser,
    courses,
    teachers,
    students,
    sessions,
    addCourse: (course: Course) => setCourses(prev => [...prev, course]),
    addTeacher: (teacher: Teacher) => setTeachers(prev => [...prev, teacher]),
    addStudent: (student: Student) => setStudents(prev => [...prev, student]),
    addSession: (session: Session) => setSessions(prev => [...prev, session]),
  }), [currentUser, courses, teachers, students, sessions]);


  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
        <header className="bg-primary text-white p-4 shadow-md flex justify-between items-center">
          <h1 className="text-xl font-bold">Sổ Theo Dõi Điện Tử</h1>
          <button onClick={handleLogout} className="text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-lg">
            Đăng xuất
          </button>
        </header>

        <main className="flex-grow p-4 pb-20">
          {renderScreen()}
        </main>
        
        <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
      </div>
    </AppContext.Provider>
  );
};

export default App;
