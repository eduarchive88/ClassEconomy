
import React, { useState, useEffect } from 'react';
import { LogIn, ShieldCheck, GraduationCap, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import LoginScreen from './components/LoginScreen';
import SetupGuide from './components/SetupGuide';

const App: React.FC = () => {
  const [user, setUser] = useState<{ role: 'teacher' | 'student'; id: string } | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  // Persistence (Simulated)
  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogin = (role: 'teacher' | 'student', id: string) => {
    const newUser = { role, id };
    setUser(newUser);
    localStorage.setItem('app_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
  };

  if (showSetup) return <SetupGuide onBack={() => setShowSetup(false)} />;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="mb-8 text-center text-white">
          <h1 className="text-4xl font-bold mb-2">ClassEconomy</h1>
          <p className="text-indigo-100">학생들의 경제 관념을 키우는 클래스 이코노미</p>
        </div>
        
        <LoginScreen onLogin={handleLogin} />

        <button 
          onClick={() => setShowSetup(true)}
          className="mt-8 text-sm text-indigo-200 underline hover:text-white transition-colors"
        >
          초기 설정 가이드 (Supabase & Vercel)
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            {user.role === 'teacher' ? <ShieldCheck size={20} /> : <GraduationCap size={20} />}
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">
            {user.role === 'teacher' ? '교사 페이지' : '나의 경제'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">
            ID: {user.id}
          </span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
          >
            <LogOut size={18} /> 로그아웃
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {user.role === 'teacher' ? (
          <TeacherDashboard teacherId={user.id} />
        ) : (
          <StudentDashboard studentId={user.id} />
        )}
      </main>
    </div>
  );
};

export default App;
