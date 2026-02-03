
import React, { useState } from 'react';
import { KeyRound, Hash, LogIn, Mail, UserPlus, Fingerprint, ShieldCheck, GraduationCap, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Props {
  onLogin: (role: 'teacher' | 'student', id: string, name?: string) => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [tab, setTab] = useState<'teacher' | 'student'>('teacher');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Teacher State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teacherName, setTeacherName] = useState('');
  
  // Student State
  const [studentId, setStudentId] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [studentPw, setStudentPw] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  const handleTeacherAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        if (!teacherName) throw new Error('성함을 입력해 주세요.');
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: teacherName,
            }
          }
        });
        if (error) throw error;
        alert('가입 확인 이메일이 발송되었습니다. 이메일을 확인하고 로그인을 진행해 주세요!');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0];
          onLogin('teacher', data.user.email || data.user.id, name);
        }
      }
    } catch (error: any) {
      alert(`인증 오류: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: settings, error: sError } = await supabase
        .from('economy_settings')
        .select('teacher_id')
        .eq('session_code', sessionCode)
        .single();

      if (sError || !settings) throw new Error('올바른 세션 코드가 아닙니다.');

      const { data: student, error: stError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .eq('teacher_id', settings.teacher_id)
        .single();

      if (stError || !student) throw new Error('등록되지 않은 학번입니다.');

      if (student.password && student.password !== '' && student.password !== studentPw) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }

      onLogin('student', student.id, student.name);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100">
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-10">
        <button onClick={() => setTab('teacher')} className={`flex-1 py-3.5 rounded-xl text-sm font-black transition-all ${tab === 'teacher' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>교사용</button>
        <button onClick={() => setTab('student')} className={`flex-1 py-3.5 rounded-xl text-sm font-black transition-all ${tab === 'student' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>학생용</button>
      </div>

      {tab === 'teacher' ? (
        <div className="space-y-8">
          <div className="text-center">
            <div className="inline-flex p-4 bg-indigo-50 rounded-3xl text-indigo-600 mb-4">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{isSignUp ? '선생님 가입' : '선생님 로그인'}</h2>
            <p className="text-sm text-slate-400 mt-2 font-medium">이메일 계정으로 학급 경제를 관리하세요.</p>
          </div>
          
          <form onSubmit={handleTeacherAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Teacher Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-4 text-slate-400" size={18}/>
                  <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="성함을 입력하세요" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" required={isSignUp} />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 text-slate-400" size={18}/>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@school.com" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-4 text-slate-400" size={18}/>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" required />
              </div>
            </div>
            
            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black hover:bg-slate-800 shadow-xl shadow-slate-200 flex justify-center items-center gap-2 mt-4 transition-all hover:scale-[1.02] active:scale-[0.98]">
              {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isSignUp ? <UserPlus size={20}/> : <LogIn size={20} />)}
              {isSignUp ? '가입하고 시작하기' : '선생님 로그인'}
            </button>
            
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full py-2 text-xs font-black text-indigo-600 hover:text-indigo-700 transition-colors">
              {isSignUp ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 이메일로 가입하기'}
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleStudentLogin} className="space-y-8">
          <div className="text-center">
            <div className="inline-flex p-4 bg-emerald-50 rounded-3xl text-emerald-600 mb-4">
              <GraduationCap size={32} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">학생 로그인</h2>
            <p className="text-sm text-slate-400 mt-2 font-medium">우리 반 세션 코드와 학번이 필요합니다.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Student ID</label>
              <div className="relative"><Hash className="absolute left-4 top-4 text-slate-400" size={18}/><input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="학번 (예: 20101)" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" required /></div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Session Code</label>
              <div className="relative"><Fingerprint className="absolute left-4 top-4 text-slate-400" size={18}/><input type="text" value={sessionCode} onChange={(e) => setSessionCode(e.target.value.toUpperCase())} placeholder="세션 코드" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-black font-mono tracking-widest" required /></div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Optional Password</label>
              <div className="relative"><KeyRound className="absolute left-4 top-4 text-slate-400" size={18}/><input type="password" value={studentPw} onChange={(e) => setStudentPw(e.target.value)} placeholder="비밀번호" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" /></div>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black hover:bg-emerald-700 shadow-xl shadow-emerald-100 flex justify-center gap-2 mt-4 transition-all hover:scale-[1.02] active:scale-[0.98]">
            {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <LogIn size={20} />} 학급 활동 참여하기
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginScreen;
