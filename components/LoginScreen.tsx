
import React, { useState } from 'react';
import { User, KeyRound, Hash, LogIn } from 'lucide-react';

interface Props {
  onLogin: (role: 'teacher' | 'student', id: string) => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [tab, setTab] = useState<'teacher' | 'student'>('teacher');
  const [studentId, setStudentId] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [password, setPassword] = useState('');

  const handleTeacherLogin = () => {
    // Simulated Google Login - for real implementation, use Supabase Auth
    onLogin('teacher', 'teacher_google_uid_123');
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !sessionCode) {
      alert('학번과 세션코드를 입력해주세요.');
      return;
    }
    // Logic: In real app, verify against Supabase students table
    onLogin('student', studentId);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        <button 
          onClick={() => setTab('teacher')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          교사용
        </button>
        <button 
          onClick={() => setTab('student')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          학생용
        </button>
      </div>

      {tab === 'teacher' ? (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-800">선생님 로그인</h2>
            <p className="text-sm text-slate-500 mt-1">구글 계정으로 쉽고 안전하게 시작하세요</p>
          </div>
          <button 
            onClick={handleTeacherLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 py-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" className="w-6 h-6" />
            Google 계정으로 로그인
          </button>
        </div>
      ) : (
        <form onSubmit={handleStudentLogin} className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">학생 로그인</h2>
            <p className="text-sm text-slate-500 mt-1">학번과 세션 코드를 입력하세요</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">학번</label>
            <div className="relative">
              <Hash className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="예: 60101" 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">세션 코드</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                placeholder="선생님이 알려주신 코드" 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">비밀번호 (설정한 경우에만)</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            로그인하기 <LogIn size={18} />
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginScreen;
