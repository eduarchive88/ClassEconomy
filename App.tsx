
import React, { useState, useEffect } from 'react';
import { ShieldCheck, GraduationCap, LogOut } from 'lucide-react';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import LoginScreen from './components/LoginScreen';
import SetupGuide from './components/SetupGuide';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [user, setUser] = useState<{ role: 'teacher' | 'student'; id: string } | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // 1. 초기 세션 확인
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({ role: 'teacher', id: session.user.email || session.user.id });
        } else {
          // 학생 로그인은 로컬스토리지 우선 확인
          const savedUser = localStorage.getItem('app_user');
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            if (parsed.role === 'student') setUser(parsed);
          }
        }
      } catch (err) {
        console.error("Session init error:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initSession();

    // 2. Auth 상태 변화 구독 (구글 로그인 완료 후 자동 실행됨)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const newUser = { role: 'teacher' as const, id: session.user.email || session.user.id };
        setUser(newUser);
        localStorage.setItem('app_user', JSON.stringify(newUser));
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('app_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (role: 'teacher' | 'student', id: string) => {
    const newUser = { role, id };
    setUser(newUser);
    localStorage.setItem('app_user', JSON.stringify(newUser));
  };

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      if (user?.role === 'teacher') {
        await supabase.auth.signOut();
      }
      setUser(null);
      localStorage.removeItem('app_user');
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-700 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <p className="font-bold text-lg animate-pulse">클래스 이코노미 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (showSetup) return <SetupGuide onBack={() => setShowSetup(false)} />;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800">
        <div className="mb-10 text-center text-white">
          <div className="inline-block bg-white/20 backdrop-blur-md p-3 rounded-2xl mb-4">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-5xl font-black mb-3 tracking-tight">ClassEconomy</h1>
          <p className="text-indigo-100 text-lg opacity-90 font-medium">우리 교실만의 스마트한 경제 생태계</p>
        </div>
        <LoginScreen onLogin={handleLogin} />
        <button onClick={() => setShowSetup(true)} className="mt-10 text-sm text-indigo-200 font-medium hover:underline">
          초기 설정 가이드 (마지막 단계 확인하기)
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg">
            {user.role === 'teacher' ? <ShieldCheck size={22} /> : <GraduationCap size={22} />}
          </div>
          <span className="font-black text-xl tracking-tight text-slate-800">ClassEconomy</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-700 hidden sm:block">{user.id}</span>
          <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
            <LogOut size={18} className="inline mr-1"/> 로그아웃
          </button>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl mx-auto p-6 w-full">
        {user.role === 'teacher' ? <TeacherDashboard teacherId={user.id} /> : <StudentDashboard studentId={user.id} />}
      </main>
    </div>
  );
};

export default App;
