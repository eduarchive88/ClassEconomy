
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
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            if (parsed.role === 'teacher') await fetchClasses(parsed.id);
          }
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
      } else {
        // 선택된 학급이 없으면 항상 Picker를 보여줌
        setShowPicker(true);
      }
    } else {
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
      if (user?.role === 'teacher') await supabase.auth.signOut();
      setUser(null);
      setSelectedClass(null);
      localStorage.removeItem('app_user');
      localStorage.removeItem('last_class_id');
    }
  };

  if (isInitializing) return <div className="min-h-screen flex items-center justify-center bg-indigo-700 text-white font-bold animate-pulse">ClassEconomy Loading...</div>;

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-800 p-4">
      <div className="text-center text-white mb-10">
        <h1 className="text-5xl font-black mb-2 tracking-tighter">ClassEconomy</h1>
        <p className="opacity-80 font-medium">스마트한 우리 반 경제 생태계</p>
      </div>
      <LoginScreen onLogin={(role, id, name) => {
        const u = { role, id, name };
        setUser(u);
        localStorage.setItem('app_user', JSON.stringify(u));
        if (role === 'teacher') fetchClasses(id);
      }} />
    </div>
  );

  // 학급 선택이 필요한 교사인 경우
  if (user.role === 'teacher' && (showPicker || !selectedClass)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-6">
        <nav className="max-w-7xl mx-auto w-full flex justify-between items-center py-4 mb-10">
           <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-100"><ShieldCheck size={20} /></div>
            <span className="font-black text-xl tracking-tight">ClassEconomy</span>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">로그아웃</button>
        </nav>
        <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-center">
          <h2 className="text-4xl font-black text-slate-900 mb-2 text-center">반갑습니다, {user.name} 선생님!</h2>
          <p className="text-slate-500 text-center mb-12 font-medium">관리하실 학급을 선택하거나 새 학급을 만드세요.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {myClasses.map(c => (
              <button 
                key={c.id} 
                onClick={() => handleSelectClass(c)}
                className="bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-600 hover:shadow-2xl hover:-translate-y-1 transition-all text-left group shadow-sm"
              >
                <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <GraduationCap size={24}/>
                </div>
                <h3 className="text-xl font-black text-slate-800">{c.class_name}</h3>
                <p className="text-sm text-slate-400 mt-2 font-mono uppercase font-bold tracking-widest">{c.session_code}</p>
              </button>
            ))}
            <button 
              onClick={async () => {
                const name = prompt('학급 이름을 입력하세요');
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
                if (data) {
                  setMyClasses([...myClasses, data]);
                  handleSelectClass(data);
                }
              }}
              className="bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-emerald-600"
            >
              <PlusCircle size={40} strokeWidth={1.5}/>
              <span className="font-black">새 학급 추가</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => user.role === 'teacher' && setShowPicker(true)}>
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-100"><ShieldCheck size={20} /></div>
            <span className="font-black text-2xl tracking-tighter text-slate-900">ClassEconomy</span>
          </div>
          {user.role === 'teacher' && selectedClass && (
            <button onClick={() => setShowPicker(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl text-xs font-black hover:bg-slate-200 transition-all text-slate-700">
              {selectedClass.class_name} <ChevronDown size={14}/>
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-slate-900 leading-none">
              {user.role === 'teacher' ? `${user.name} 선생님` : `${user.id} ${user.name || ''}`}
            </span>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Authorized</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl mx-auto p-6 w-full animate-in fade-in duration-500">
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
