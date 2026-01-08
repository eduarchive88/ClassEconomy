
import React, { useState } from 'react';
import { KeyRound, Hash, LogIn, Mail, UserPlus, Fingerprint } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Props {
  // Fix: Added optional name parameter to match the callback signature in App.tsx
  onLogin: (role: 'teacher' | 'student', id: string, name?: string) => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [tab, setTab] = useState<'teacher' | 'student'>('teacher');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Teacher State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Student State
  const [studentId, setStudentId] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [studentPw, setStudentPw] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (error: any) {
      alert(`구글 로그인 오류: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleTeacherAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('가입 확인 이메일을 확인해주세요!');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Fix: Extract user name and pass it to onLogin
        if (data.user) {
          const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0];
          onLogin('teacher', data.user.email || data.user.id, name);
        }
      }
    } catch (error: any) {
      alert(`오류: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 1. 세션 코드로 교사 찾기
      const { data: settings, error: sError } = await supabase
        .from('economy_settings')
        .select('teacher_id')
        .eq('session_code', sessionCode)
        .single();

      if (sError || !settings) throw new Error('올바른 세션 코드가 아닙니다.');

      // 2. 해당 교사의 학생 명단에서 학번 및 비번 확인
      const { data: student, error: stError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .eq('teacher_id', settings.teacher_id)
        .single();

      if (stError || !student) throw new Error('등록되지 않은 학번입니다.');

      // 비밀번호 체크 (설정된 경우에만)
      if (student.password && student.password !== '' && student.password !== studentPw) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }

      // Fix: Pass the student name as the third argument
      onLogin('student', student.id, student.name);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100">
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
        <button onClick={() => setTab('teacher')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tab === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>교사용</button>
        <button onClick={() => setTab('student')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tab === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>학생용</button>
      </div>

      {tab === 'teacher' ? (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">선생님 접속</h2>
            <p className="text-sm text-slate-500 mt-1">학급 경제를 관리하세요.</p>
          </div>
          <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-3.5 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" /> Google 로그인
          </button>
          <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">또는 이메일</span></div></div>
          <form onSubmit={handleTeacherAuth} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" required />
            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 shadow-lg flex justify-center gap-2">
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isSignUp ? <UserPlus size={18}/> : <LogIn size={18} />)}
              {isSignUp ? '회원가입' : '로그인'}
            </button>
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full text-xs font-bold text-slate-400 hover:text-indigo-600">
              {isSignUp ? '이미 계정이 있나요?' : '이메일 가입하기'}
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleStudentLogin} className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800">학생 로그인</h2>
            <p className="text-sm text-slate-500 mt-1">교사가 제공한 세션 코드가 필요합니다.</p>
          </div>
          <div className="space-y-4">
            <div className="relative"><Hash className="absolute left-4 top-3.5 text-slate-400" size={18}/><input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="학번 (예: 20101)" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" required /></div>
            <div className="relative"><Fingerprint className="absolute left-4 top-3.5 text-slate-400" size={18}/><input type="text" value={sessionCode} onChange={(e) => setSessionCode(e.target.value)} placeholder="세션 코드" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" required /></div>
            <div className="relative"><KeyRound className="absolute left-4 top-3.5 text-slate-400" size={18}/><input type="password" value={studentPw} onChange={(e) => setStudentPw(e.target.value)} placeholder="비밀번호 (설정한 경우에만)" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" /></div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 shadow-lg flex justify-center gap-2 mt-4">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <LogIn size={18} />} 활동 시작하기
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginScreen;
