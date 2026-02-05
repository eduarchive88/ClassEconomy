
import React, { useState, useEffect } from 'react';
import { ShieldCheck, GraduationCap, LogOut, ChevronDown, PlusCircle, LayoutGrid, CheckCircle2 } from 'lucide-react';
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
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
          const teacher = { role: 'teacher' as const, id: session.user.email || session.user.id, name };
          setUser(teacher);
          await fetchClasses(teacher.id);
        } else {
          const savedUser = localStorage.getItem('app_user');
          if (savedUser) setUser(JSON.parse(savedUser));
        }
      } catch (err) { console.error(err); }
      finally { setIsInitializing(false); }
    };
    initSession();
  }, []);

  const fetchClasses = async (tId: string) => {
    const { data } = await supabase.from('economy_settings').select('*').eq('teacher_id', tId);
    if (data) {
      setMyClasses(data);
      const savedClassId = localStorage.getItem('last_class_id');
      const found = data.find(c => c.id === savedClassId);
      if (found) {
        setSelectedClass(found);
        setShowPicker(false);
      } else if (data.length > 0) {
        setShowPicker(true);
      }
    }
  };

  const handleSelectClass = (cls: EconomySettings) => {
    setSelectedClass(cls);
    localStorage.setItem('last_class_id', cls.id);
    setShowPicker(false);
  };

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      if (user?.role === 'teacher') await supabase.auth.signOut();
      setUser(null);
      setSelectedClass(null);
      localStorage.removeItem('app_user');
      localStorage.removeItem('last_class_id');
    }
  };

  if (isInitializing) return <div className="min-h-screen flex items-center justify-center bg-indigo-700 text-white font-bold">ClassEconomy Loading...</div>;

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-800 p-4">
      <div className="text-center text-white mb-10">
        <h1 className="text-5xl font-black mb-2">ClassEconomy</h1>
        <p className="opacity-80">스마트한 우리 반 경제 생태계</p>
      </div>
      <LoginScreen onLogin={(role, id, name) => {
        const u = { role, id, name };
        setUser(u);
        localStorage.setItem('app_user', JSON.stringify(u));
        if (role === 'teacher') fetchClasses(id);
      }} />
    </div>
  );

  if (user.role === 'teacher' && showPicker) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <h2 className="text-3xl font-black text-slate-800 mb-8 text-center flex items-center justify-center gap-3">
            <LayoutGrid className="text-indigo-600" /> 관리할 학급을 선택하세요
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {myClasses.map(c => (
              <button 
                key={c.id} 
                onClick={() => handleSelectClass(c)}
                className="bg-white p-8 rounded-3xl border-2 border-transparent hover:border-indigo-600 hover:shadow-xl transition-all text-left group"
              >
                <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <ShieldCheck size={24}/>
                </div>
                <h3 className="text-xl font-bold text-slate-800">{c.class_name}</h3>
                <p className="text-sm text-slate-400 mt-1 font-mono uppercase">{c.session_code}</p>
              </button>
            ))}
            <button 
              onClick={async () => {
                const name = prompt('학급 이름을 입력하세요');
                if (!name) return;
                const newSession = {
                  teacher_id: user.id, class_name: name,
                  session_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                  school_level: 'elementary', auto_approve_estate: false, quiz_count_per_day: 1
                };
                const { data } = await supabase.from('economy_settings').insert(newSession).select().single();
                if (data) setMyClasses([...myClasses, data]);
              }}
              className="bg-slate-100 p-8 rounded-3xl border-2 border-dashed border-slate-300 hover:bg-white hover:border-emerald-500 transition-all flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-emerald-600"
            >
              <PlusCircle size={32}/>
              <span className="font-bold">새 학급 추가</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => user.role === 'teacher' && setShowPicker(true)}>
            <div className="bg-indigo-600 p-2 rounded-lg text-white"><ShieldCheck size={20} /></div>
            <span className="font-black text-lg tracking-tight">ClassEconomy</span>
          </div>
          {user.role === 'teacher' && selectedClass && (
            <button onClick={() => setShowPicker(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200">
              {selectedClass.class_name} <ChevronDown size={14}/>
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-slate-800">
              {user.role === 'teacher' ? `${user.name || user.id} 선생님` : `${user.id} ${user.name || ''}`}
            </span>
            <span className="text-[10px] font-bold text-indigo-500">환영해요!</span>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">로그아웃</button>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl mx-auto p-6 w-full">
        {user.role === 'teacher' ? (
          selectedClass && <TeacherDashboard teacherId={user.id} activeSession={selectedClass} />
        ) : (
          <StudentDashboard studentId={user.id} />
        )}
      </main>
    </div>
  );
};

export default App;
