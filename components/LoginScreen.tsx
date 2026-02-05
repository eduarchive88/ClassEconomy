
import React, { useState } from 'react';
import { KeyRound, Hash, LogIn, Mail, UserPlus, Fingerprint, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Props {
  onLogin: (role: 'teacher' | 'student', id: string, name?: string) => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [tab, setTab] = useState<'teacher' | 'student'>('teacher');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Teacher State
  const [fullName, setFullName] = useState(''); // 이름 필드 추가
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
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
        if (!fullName.trim()) throw new Error('성함을 입력해주세요.');
        
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName // metadata에 이름 저장
            }
          }
        });
        
        if (error) throw error;
        
        alert('회원가입 요청이 전송되었습니다. 이메일 인증이 필요할 수 있습니다.');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (data.user) {
          // profiles 테이블에서 이름을 가져오거나 metadata에서 확인
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.user.id)
            .single();

          const name = profile?.full_name || data.user.user_metadata?.full_name || data.user.email?.split('@')[0];
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
    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100">
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
        <button onClick={() => setTab('teacher')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tab === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>교사용</button>
        <button onClick={() => setTab('student')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tab === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>학생용</button>
      </div>

      {tab === 'teacher' ? (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-800">{isSignUp ? '선생님 회원가입' : '선생님 로그인'}</h2>
            <p className="text-sm text-slate-500 mt-1">학급 경제 생태계를 관리하세요.</p>
          </div>
          
          <form onSubmit={handleTeacherAuth} className="space-y-4">
            {isSignUp && (
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="성함 (예: 홍길동)" 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" 
                  required 
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-400" size={18}/>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="이메일 주소" 
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" 
                required 
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-4 top-3.5 text-slate-400" size={18}/>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="비밀번호" 
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" 
                required 
              />
            </div>
            
            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 shadow-lg flex justify-center gap-2 transition-all active:scale-[0.98]">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                isSignUp ? <UserPlus size={18}/> : <LogIn size={18} />
              )}
              {isSignUp ? '회원가입 완료' : '로그인'}
            </button>

            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setFullName('');
                }} 
                className="text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {isSignUp ? '이미 계정이 있으신가요? 로그인하기' : '처음이신가요? 이메일로 가입하기'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <form onSubmit={handleStudentLogin} className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-black text-slate-800">학생 로그인</h2>
            <p className="text-sm text-slate-500 mt-1">학급 코드를 입력하여 활동을 시작하세요.</p>
          </div>
          <div className="space-y-4">
            <div className="relative"><Hash className="absolute left-4 top-3.5 text-slate-400" size={18}/><input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="학번 (예: 10101)" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" required /></div>
            <div className="relative"><Fingerprint className="absolute left-4 top-3.5 text-slate-400" size={18}/><input type="text" value={sessionCode} onChange={(e) => setSessionCode(e.target.value)} placeholder="세션 코드" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold font-mono tracking-widest uppercase" required /></div>
            <div className="relative"><KeyRound className="absolute left-4 top-3.5 text-slate-400" size={18}/><input type="password" value={studentPw} onChange={(e) => setStudentPw(e.target.value)} placeholder="비밀번호 (설정한 경우)" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" /></div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black hover:bg-emerald-700 shadow-lg flex justify-center gap-2 mt-4 transition-all active:scale-[0.98]">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <LogIn size={18} />} 활동 시작하기
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginScreen;
