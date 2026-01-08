
import React, { useState, useEffect } from 'react';
import { ShieldCheck, GraduationCap, LogOut } from 'lucide-react';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import LoginScreen from './components/LoginScreen';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [user, setUser] = useState<{ role: 'teacher' | 'student'; id: string; name?: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
          setUser({ 
            role: 'teacher', 
            id: session.user.email || session.user.id,
            name: name
          });
        } else {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
        const newUser = { 
          role: 'teacher' as const, 
          id: session.user.email || session.user.id,
          name: name
        };
        setUser(newUser);
        localStorage.setItem('app_user', JSON.stringify(newUser));
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('app_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (role: 'teacher' | 'student', id: string, name?: string) => {
    const newUser = { role, id, name };
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

  const Footer = ({ isDarkBg = false }: { isDarkBg?: boolean }) => (
    <footer className={`mt-auto py-8 text-center text-[11px] w-full ${isDarkBg ? 'text-indigo-100/70' : 'text-slate-500 border-t border-slate-200 bg-white/80 backdrop-blur-md'}`}>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 max-w-7xl mx-auto font-medium">
        <span>만든 사람: 경기도 지구과학 교사 뀨짱</span>
        <span className={`hidden sm:inline ${isDarkBg ? 'text-white/20' : 'text-slate-300'}`}>|</span>
        <span>
          문의: <a href="https://open.kakao.com/o/s7hVU65h" target="_blank" rel="noopener noreferrer" className={`${isDarkBg ? 'text-white underline underline-offset-4' : 'text-indigo-600 hover:text-indigo-800'} font-bold transition-colors`}>카카오톡 오픈채팅</a>
        </span>
        <span className={`hidden sm:inline ${isDarkBg ? 'text-white/20' : 'text-slate-300'}`}>|</span>
        <span>
          블로그: <a href="https://eduarchive.tistory.com/" target="_blank" rel="noopener noreferrer" className={`${isDarkBg ? 'text-white underline underline-offset-4' : 'text-indigo-600 hover:text-indigo-800'} font-bold transition-colors`}>뀨짱쌤의 교육자료 아카이브</a>
        </span>
      </div>
    </footer>
  );

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

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 relative overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-4 w-full z-10">
          <div className="mb-10 text-center text-white">
            <div className="inline-block bg-white/20 backdrop-blur-md p-3 rounded-2xl mb-4 shadow-xl border border-white/10">
              <ShieldCheck size={40} />
            </div>
            <h1 className="text-5xl font-black mb-3 tracking-tight drop-shadow-sm text-white">ClassEconomy</h1>
            <p className="text-indigo-100 text-lg opacity-90 font-medium">우리 교실만의 스마트한 경제 생태계</p>
          </div>
          <LoginScreen onLogin={handleLogin} />
        </div>
        <Footer isDarkBg={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg">
            {user.role === 'teacher' ? <ShieldCheck size={22} /> : <GraduationCap size={22} />}
          </div>
          <span className="font-black text-xl tracking-tight text-slate-800">ClassEconomy</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-700 hidden sm:block">
            {user.role === 'teacher' ? `${user.name || user.id} 선생님` : user.id}
          </span>
          <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <LogOut size={18}/> 로그아웃
          </button>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl mx-auto p-6 w-full">
        {user.role === 'teacher' ? <TeacherDashboard teacherId={user.id} /> : <StudentDashboard studentId={user.id} />}
      </main>
      <Footer isDarkBg={false} />
    </div>
  );
};

export default App;
