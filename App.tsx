
import React, { useState, useEffect } from 'react';
import { ShieldCheck, GraduationCap, LogOut, ChevronDown, PlusCircle } from 'lucide-react';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import LoginScreen from './components/LoginScreen';
import { supabase } from './services/supabaseClient';
import { EconomySettings } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<{ role: 'teacher' | 'student'; id: string; name?: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [myClasses, setMyClasses] = useState<EconomySettings[]>([]);
  const [selectedClass, setSelectedClass] = useState<EconomySettings | null>(null);
  const [showClassMenu, setShowClassMenu] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
          setUser({ role: 'teacher', id: session.user.email || session.user.id, name });
          await fetchClasses(session.user.email || session.user.id);
        } else {
          const savedUser = localStorage.getItem('app_user');
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
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
        const name = session.user.user_metadata?.full_name || session.user.email || session.user.id;
        const newUser = { role: 'teacher' as const, id: session.user.email || session.user.id, name: session.user.user_metadata?.full_name || name };
        setUser(newUser);
        fetchClasses(newUser.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setMyClasses([]);
        setSelectedClass(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchClasses = async (tId: string) => {
    const { data } = await supabase.from('economy_settings').select('*').eq('teacher_id', tId);
    if (data && data.length > 0) {
      setMyClasses(data);
      setSelectedClass(data[0]);
    }
  };

  const addNewClass = async () => {
    if (!user) return;
    const name = prompt('새로운 학급 이름을 입력하세요 (예: 6학년 1반)');
    if (!name) return;

    const newSession = {
      teacher_id: user.id,
      class_name: name,
      session_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      school_level: 'elementary',
      auto_approve_estate: false,
      quiz_count_per_day: 1
    };

    const { data, error } = await supabase.from('economy_settings').insert(newSession).select().single();
    if (error) alert('학급 추가 실패');
    else if (data) {
      setMyClasses([...myClasses, data]);
      setSelectedClass(data);
      alert(`'${name}' 학급이 생성되었습니다!`);
    }
  };

  const handleLogin = (role: 'teacher' | 'student', id: string, name?: string) => {
    const newUser = { role, id, name };
    setUser(newUser);
    localStorage.setItem('app_user', JSON.stringify(newUser));
  };

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      if (user?.role === 'teacher') await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('app_user');
    }
  };

  const Footer = ({ isDarkBg = false }: { isDarkBg?: boolean }) => (
    <footer className={`mt-auto py-8 text-center text-[11px] w-full ${isDarkBg ? 'text-indigo-100/70' : 'text-slate-500 border-t border-slate-200 bg-white/80 backdrop-blur-md'}`}>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 max-w-7xl mx-auto font-medium">
        <span>만든 사람: 경기도 지구과학 교사 뀨짱</span>
        <span className={`hidden sm:inline ${isDarkBg ? 'text-white/20' : 'text-slate-300'}`}>|</span>
        <span>문의: <a href="https://open.kakao.com/o/s7hVU65h" target="_blank" rel="noopener noreferrer" className={`${isDarkBg ? 'text-white underline underline-offset-4' : 'text-indigo-600 hover:text-indigo-800'} font-bold transition-colors`}>오픈채팅</a></span>
        <span className={`hidden sm:inline ${isDarkBg ? 'text-white/20' : 'text-slate-300'}`}>|</span>
        <span>블로그: <a href="https://eduarchive.tistory.com/" target="_blank" rel="noopener noreferrer" className={`${isDarkBg ? 'text-white underline underline-offset-4' : 'text-indigo-600 hover:text-indigo-800'} font-bold transition-colors`}>아카이브</a></span>
      </div>
    </footer>
  );

  if (isInitializing) return <div className="min-h-screen flex items-center justify-center bg-indigo-700 text-white font-bold animate-pulse">ClassEconomy Loading...</div>;

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-800 relative">
      <div className="z-10 text-center text-white mb-10">
        <h1 className="text-5xl font-black mb-2">ClassEconomy</h1>
        <p className="opacity-80">스마트한 우리 반 경제 생태계</p>
      </div>
      <LoginScreen onLogin={handleLogin} />
      <Footer isDarkBg={true} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white"><ShieldCheck size={20} /></div>
            <span className="font-black text-lg tracking-tight">ClassEconomy</span>
          </div>

          {user.role === 'teacher' && (
            <div className="relative">
              <button 
                onClick={() => setShowClassMenu(!showClassMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-all"
              >
                {selectedClass?.class_name || '학급 선택'} <ChevronDown size={14} />
              </button>
              {showClassMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border rounded-2xl shadow-xl p-2 z-[60]">
                  {myClasses.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => { setSelectedClass(c); setShowClassMenu(false); }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-50 ${selectedClass?.id === c.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                    >
                      {c.class_name}
                    </button>
                  ))}
                  <div className="border-t my-2"></div>
                  <button onClick={() => { addNewClass(); setShowClassMenu(false); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
                    <PlusCircle size={14}/> 학급 추가
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-700">
            {user.role === 'teacher' ? `${user.name || user.id} 선생님` : `${user.id} ${user.name || ''} 환영해요!`}
          </span>
          <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg">로그아웃</button>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl mx-auto p-6 w-full">
        {user.role === 'teacher' ? (
          selectedClass ? <TeacherDashboard teacherId={user.id} key={selectedClass.id} activeSession={selectedClass} /> : <div className="text-center py-20 font-bold text-slate-400">상단에서 학급을 선택하거나 추가해주세요.</div>
        ) : (
          <StudentDashboard studentId={user.id} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
