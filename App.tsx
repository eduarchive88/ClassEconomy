
import React, { useState, useEffect } from 'react';
import { ShieldCheck, GraduationCap, LogOut, ChevronDown, PlusCircle, AlertTriangle, RefreshCcw } from 'lucide-react';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import LoginScreen from './components/LoginScreen';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { EconomySettings } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<{ role: 'teacher' | 'student'; id: string; name?: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [myClasses, setMyClasses] = useState<EconomySettings[]>([]);
  const [selectedClass, setSelectedClass] = useState<EconomySettings | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsInitializing(false);
      return;
    }

    const initSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
          const teacher = { role: 'teacher' as const, id: session.user.id, name };
          setUser(teacher);
          await fetchClasses(teacher.id);
        } else {
          const savedUser = localStorage.getItem('app_user');
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            if (parsed.role === 'teacher') await fetchClasses(parsed.id);
          }
        }
      } catch (err: any) {
        console.error("Initialization Error:", err);
        setError(err.message === 'Failed to fetch' ? '데이터베이스 서버에 연결할 수 없습니다. URL 설정을 확인해 주세요.' : err.message);
      } finally {
        setIsInitializing(false);
      }
    };
    initSession();
  }, []);

  const fetchClasses = async (tId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('economy_settings')
        .select('*')
        .eq('teacher_id', tId);
      
      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setMyClasses(data);
        const savedClassId = localStorage.getItem('last_class_id');
        const found = data.find(c => c.id === savedClassId);
        if (found) {
          setSelectedClass(found);
          setShowPicker(false);
        } else {
          setShowPicker(true);
        }
      } else {
        setMyClasses([]);
        setShowPicker(true);
      }
    } catch (err: any) {
      console.error("Fetch Classes Error:", err);
      setError("학급 정보를 불러오는 중 오류가 발생했습니다.");
      setShowPicker(true);
    }
  };

  const handleSelectClass = (cls: EconomySettings) => {
    setSelectedClass(cls);
    localStorage.setItem('last_class_id', cls.id);
    setShowPicker(false);
  };

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      try {
        if (user?.role === 'teacher') await supabase.auth.signOut();
      } catch (e) {}
      setUser(null);
      setSelectedClass(null);
      localStorage.removeItem('app_user');
      localStorage.removeItem('last_class_id');
    }
  };

  // 1. Supabase 설정 누락 시 에러 화면
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-8 text-center">
        <div className="bg-rose-500/10 p-6 rounded-[3rem] text-rose-500 mb-8 border border-rose-500/20">
          <AlertTriangle size={64} />
        </div>
        <h1 className="text-3xl font-black text-white mb-4 tracking-tighter">데이터베이스 설정이 필요합니다</h1>
        <p className="text-slate-400 max-w-md leading-relaxed mb-10 font-medium">
          애플리케이션을 실행하려면 Supabase 환경 변수(<code className="text-rose-400">VITE_SUPABASE_URL</code>, <code className="text-rose-400">VITE_SUPABASE_ANON_KEY</code>) 설정이 필요합니다.
        </p>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black hover:bg-slate-100 transition-all">
          <RefreshCcw size={20} /> 설정 후 다시 시도
        </button>
      </div>
    );
  }

  // 2. 초기화 중 화면
  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-700">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
        <p className="text-white font-black text-xl tracking-tighter animate-pulse">ClassEconomy 연결 중...</p>
      </div>
    );
  }

  // 3. 에러 발생 시 화면
  if (error && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertTriangle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-900 mb-2">연결 오류 발생</h2>
        <p className="text-slate-500 mb-8 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black">새로고침</button>
      </div>
    );
  }

  // 4. 로그인 화면
  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-800 p-4">
      <div className="text-center text-white mb-10">
        <h1 className="text-6xl font-black mb-2 tracking-tighter">ClassEconomy</h1>
        <p className="opacity-80 font-bold text-lg uppercase tracking-[0.2em]">Smart Classroom Ecosystem</p>
      </div>
      <LoginScreen onLogin={(role, id, name) => {
        const u = { role, id, name };
        setUser(u);
        localStorage.setItem('app_user', JSON.stringify(u));
        if (role === 'teacher') fetchClasses(id);
      }} />
    </div>
  );

  // 5. 교사 학급 선택 화면 (Picker)
  if (user.role === 'teacher' && (showPicker || !selectedClass)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-6 animate-in fade-in duration-500">
        <nav className="max-w-7xl mx-auto w-full flex justify-between items-center py-6 mb-12">
           <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-xl shadow-indigo-100"><ShieldCheck size={24} /></div>
            <span className="font-black text-2xl tracking-tighter text-slate-900">ClassEconomy</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-slate-400">{user.name} 선생님</span>
            <button onClick={handleLogout} className="text-xs font-black text-slate-400 hover:text-rose-500 transition-all bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">로그아웃</button>
          </div>
        </nav>
        <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col justify-center pb-20">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">반갑습니다, {user.name} 선생님!</h2>
            <p className="text-xl text-slate-400 font-medium">관리하실 학급을 선택하거나 새 학급을 생성하여 경제 활동을 시작하세요.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {myClasses.map(c => (
              <button 
                key={c.id} 
                onClick={() => handleSelectClass(c)}
                className="bg-white p-10 rounded-[3rem] border-2 border-transparent hover:border-indigo-600 hover:shadow-2xl hover:-translate-y-2 transition-all text-left group shadow-xl shadow-slate-200/50 flex flex-col h-64 justify-between"
              >
                <div className="bg-indigo-50 w-16 h-16 rounded-3xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <GraduationCap size={32}/>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{c.class_name}</h3>
                  <p className="text-xs text-slate-400 mt-2 font-mono uppercase font-black tracking-[0.2em]">{c.session_code}</p>
                </div>
              </button>
            ))}
            <button 
              onClick={async () => {
                const name = prompt('학급 이름을 입력하세요 (예: 6학년 1반)');
                if (!name) return;
                const newSession = {
                  teacher_id: user.id, 
                  class_name: name,
                  session_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                  school_level: 'elementary', 
                  auto_approve_estate: false, 
                  quiz_count_per_day: 1
                };
                try {
                  const { data, error: insertError } = await supabase.from('economy_settings').insert(newSession).select().single();
                  if (insertError) throw insertError;
                  if (data) {
                    setMyClasses([...myClasses, data]);
                    handleSelectClass(data);
                  }
                } catch (e: any) {
                  alert("학급 생성 중 오류: " + e.message);
                }
              }}
              className="bg-white p-10 rounded-[3rem] border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center gap-6 text-slate-300 hover:text-emerald-600 h-64"
            >
              <PlusCircle size={56} strokeWidth={1}/>
              <span className="font-black text-lg">새 학급 추가</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 6. 메인 대시보드 화면
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-100 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/80">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => user.role === 'teacher' && setShowPicker(true)}>
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-xl shadow-indigo-100 group-hover:scale-110 transition-transform"><ShieldCheck size={22} /></div>
            <span className="font-black text-2xl tracking-tighter text-slate-900">ClassEconomy</span>
          </div>
          {user.role === 'teacher' && selectedClass && (
            <button onClick={() => setShowPicker(true)} className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black hover:bg-slate-100 transition-all text-slate-700 shadow-sm">
              <GraduationCap size={18} className="text-indigo-500" />
              {selectedClass.class_name} 
              <ChevronDown size={16} className="text-slate-400"/>
            </button>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-base font-black text-slate-900 leading-none">
              {user.role === 'teacher' ? `${user.name} 선생님` : `${user.id} ${user.name || ''}`}
            </span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${user.role === 'teacher' ? 'bg-indigo-500' : 'bg-emerald-500'} animate-pulse`}></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Session</span>
            </div>
          </div>
          <div className="h-10 w-[1px] bg-slate-100 mx-2"></div>
          <button onClick={handleLogout} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100">
            <LogOut size={22} />
          </button>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl mx-auto p-8 w-full animate-in fade-in duration-700">
        {user.role === 'teacher' ? (
          selectedClass ? <TeacherDashboard teacherId={user.id} activeSession={selectedClass} /> : null
        ) : (
          <StudentDashboard studentId={user.id} />
        )}
      </main>
    </div>
  );
};

export default App;
