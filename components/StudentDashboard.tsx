
import React, { useState, useEffect } from 'react';
import { 
  Wallet, Landmark, LineChart, ShoppingBag, Map, Send, Search, History, HelpCircle, CheckCircle2, Clock
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Student, Transaction, Quiz, SavingsRecord } from '../types';

interface Props {
  studentId: string;
}

const StudentDashboard: React.FC<Props> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [student, setStudent] = useState<Student | null>(null);
  const [friends, setFriends] = useState<Student[]>([]);
  const [logs, setLogs] = useState<Transaction[]>([]);
  const [savings, setSavings] = useState<SavingsRecord[]>([]);
  
  // 퀴즈 관련
  const [dailyQuizzes, setDailyQuizzes] = useState<Quiz[]>([]);
  const [solvedQuizIds, setSolvedQuizIds] = useState<string[]>([]);
  
  // 이체 관련
  const [transferAmount, setTransferAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, [studentId, activeTab]);

  const fetchStudentData = async () => {
    const { data: st } = await supabase.from('students').select('*').eq('id', studentId).single();
    if (st) {
      setStudent(st);
      const { data: fr } = await supabase.from('students').select('*').eq('session_code', st.session_code).neq('id', studentId);
      if (fr) setFriends(fr);
      const { data: tx } = await supabase.from('transactions').select('*').or(`sender_id.eq.${studentId},receiver_id.eq.${studentId}`).order('created_at', { ascending: false }).limit(20);
      if (tx) setLogs(tx);
      const { data: sv } = await supabase.from('savings_records').select('*').eq('student_id', studentId);
      if (sv) setSavings(sv);
      
      // 자동 이자 지급 체크
      checkAndApplyAutoInterest(st, tx || []);
      
      if (activeTab === 'quiz') fetchQuizzes(st.session_code);
    }
  };

  const checkAndApplyAutoInterest = async (st: Student, txLogs: Transaction[]) => {
    if (st.bank_balance <= 0) return;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // 1. 최근 1주일 내에 이자(interest) 지급 내역이 있는지 확인
    const lastInterestTx = txLogs.find(tx => tx.type === 'interest');
    const recentlyPaid = lastInterestTx && new Date(lastInterestTx.created_at) > oneWeekAgo;
    
    if (!recentlyPaid) {
      // 2. 은행 저축 기록 중 1주일 이상 된 내역이 있는지 확인 (사용자가 저축한 시점 기준)
      const { data: oldSavings } = await supabase
        .from('savings_records')
        .select('*')
        .eq('student_id', st.id)
        .eq('account_type', 'bank')
        .lt('created_at', oneWeekAgo.toISOString())
        .limit(1);

      if (oldSavings && oldSavings.length > 0) {
        // 주간 이자 계산 (연 2% -> 주 약 0.03846%)
        const weeklyRate = 0.02 / 52;
        const interestAmount = Math.floor(st.bank_balance * weeklyRate);

        if (interestAmount > 0) {
          // 이자 지급 처리
          await supabase.from('students').update({ bank_balance: st.bank_balance + interestAmount }).eq('id', st.id);
          await supabase.from('transactions').insert({
            session_code: st.session_code, sender_id: 'GOVERNMENT', sender_name: '정부',
            receiver_id: st.id, receiver_name: st.name, amount: interestAmount, type: 'interest',
            description: '자동 주간 이자 지급 (연 2%)'
          });
          
          // 데이터 리프레시
          const { data: updatedSt } = await supabase.from('students').select('*').eq('id', studentId).single();
          if (updatedSt) setStudent(updatedSt);
        }
      }
    }
  };

  const fetchQuizzes = async (code: string) => {
    const { data: settings } = await supabase.from('economy_settings').select('quiz_count_per_day').eq('session_code', code).single();
    const count = settings?.quiz_count_per_day || 0;
    
    if (count <= 0) {
      setDailyQuizzes([]);
      return;
    }
    
    const now = new Date();
    if (now.getHours() < 8) now.setDate(now.getDate() - 1);
    const dateStr = now.toISOString().split('T')[0];
    
    const { data: allQuizzes } = await supabase.from('quizzes').select('*').eq('session_code', code);
    if (allQuizzes && allQuizzes.length > 0) {
      const seededRandom = (seed: string) => {
        let h = 0; for(let i=0; i<seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
        return () => { h = Math.imul(h ^ h >>> 16, 0x85ebca6b); h = Math.imul(h ^ h >>> 13, 0xc2b2ae35); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
      };
      const rand = seededRandom(dateStr + code);
      const shuffled = [...allQuizzes].sort(() => rand() - 0.5);
      setDailyQuizzes(shuffled.slice(0, count));
    }

    const { data: attempts } = await supabase.from('quiz_attempts').select('quiz_id').eq('student_id', studentId).eq('attempt_date', dateStr);
    if (attempts) setSolvedQuizIds(attempts.map(a => a.quiz_id));
  };

  const handleAssetTransfer = async (from: string, to: string) => {
    if (!student || transferAmount <= 0) return;
    
    if (from !== 'balance') {
      const mySavings = savings.filter(s => s.account_type === (from === 'bank_balance' ? 'bank' : 'brokerage'));
      const now = new Date();
      const availableAmount = mySavings
        .filter(r => (now.getTime() - new Date(r.created_at).getTime()) >= 7 * 24 * 60 * 60 * 1000)
        .reduce((sum, r) => sum + r.amount, 0);

      if (transferAmount > availableAmount) {
        alert(`출금 가능한 금액이 부족합니다.\n(저축한 지 7일이 지나야 출금 가능합니다.\n현재 출금 가능액: ${availableAmount.toLocaleString()}원)`);
        return;
      }
    }

    const currentFromBalance = (student as any)[from];
    if (currentFromBalance < transferAmount) return alert('잔액이 부족합니다.');

    setIsLoading(true);
    try {
      const updates = { 
        [from]: currentFromBalance - transferAmount,
        [to]: (student as any)[to] + transferAmount 
      };
      await supabase.from('students').update(updates).eq('id', studentId);
      
      if (to !== 'balance') {
        await supabase.from('savings_records').insert({
          student_id: studentId, amount: transferAmount, account_type: to === 'bank_balance' ? 'bank' : 'brokerage'
        });
      }

      await supabase.from('transactions').insert({
        session_code: student.session_code, sender_id: student.id, sender_name: student.name,
        receiver_id: student.id, receiver_name: student.name, amount: transferAmount, type: 'transfer',
        description: `${from === 'balance' ? '현금' : from === 'bank_balance' ? '은행' : '증권'} → ${to === 'balance' ? '현금' : to === 'bank_balance' ? '은행' : '증권'} 이체`
      });

      alert('이체 완료!');
      setTransferAmount(0);
      fetchStudentData();
    } catch (e) { alert('오류 발생'); }
    finally { setIsLoading(false); }
  };

  const handleQuizSolve = async (quiz: Quiz, selectedIdx: number) => {
    if (solvedQuizIds.includes(quiz.id)) return alert('이미 오늘 참여한 퀴즈입니다.');
    
    const isCorrect = quiz.answer === selectedIdx;
    const dateStr = new Date().toISOString().split('T')[0];

    await supabase.from('quiz_attempts').insert({
      student_id: studentId, quiz_id: quiz.id, attempt_date: dateStr, is_correct: isCorrect
    });

    if (isCorrect) {
      alert(`정답입니다! ${quiz.reward.toLocaleString()}원이 지급되었습니다.`);
      await supabase.from('students').update({ balance: student!.balance + quiz.reward }).eq('id', studentId);
      await supabase.from('transactions').insert({
        session_code: student!.session_code, sender_id: 'GOVERNMENT', sender_name: '정부',
        receiver_id: studentId, receiver_name: student!.name, amount: quiz.reward, type: 'quiz', description: `퀴즈 정답 보상: ${quiz.question.substring(0, 10)}...`
      });
    } else {
      alert('아쉽게도 틀렸습니다. 내일 다시 도전하세요!');
    }
    fetchQuizzes(student!.session_code);
    fetchStudentData();
  };

  return (
    <div className="space-y-6 pb-20">
      {student && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border shadow-sm border-b-4 border-b-indigo-500">
            <p className="text-[10px] font-bold text-slate-400 mb-1">나의 현금</p>
            <h3 className="text-2xl font-black text-slate-900">{student.balance.toLocaleString()}원</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm border-b-4 border-b-emerald-500 relative overflow-hidden">
            <p className="text-[10px] font-bold text-slate-400 mb-1">은행 (연 2% 복리)</p>
            <h3 className="text-2xl font-black text-slate-900">{student.bank_balance.toLocaleString()}원</h3>
            <Landmark size={40} className="absolute -right-2 -bottom-2 text-emerald-50 opacity-10" />
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm border-b-4 border-b-amber-500">
            <p className="text-[10px] font-bold text-slate-400 mb-1">증권 (투자용)</p>
            <h3 className="text-2xl font-black text-slate-900">{student.brokerage_balance.toLocaleString()}원</h3>
          </div>
        </div>
      )}

      <nav className="flex bg-white p-1 rounded-2xl border sticky top-20 z-40">
        {['home', 'invest', 'quiz', 'market', 'estate'].map(id => (
          <button key={id} onClick={() => setActiveTab(id)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>
            {id === 'home' && <Wallet size={16}/>}{id === 'invest' && <LineChart size={16}/>}{id === 'quiz' && <HelpCircle size={16}/>}
            <span className="capitalize">{id === 'home' ? '홈' : id === 'invest' ? '투자/저축' : id === 'quiz' ? '일일퀴즈' : id}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'invest' && (
        <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h3 className="text-lg font-bold">1. 자산 이동 경로 선택</h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'b2bank', label: '현금 → 은행', from: 'balance', to: 'bank_balance', desc: '주간 이자 수익 (출금 7일 제한)' },
                  { id: 'b2stock', label: '현금 → 증권', from: 'balance', to: 'brokerage_balance', desc: '투자 예수금 확보 (출금 7일 제한)' },
                  { id: 'bank2b', label: '은행 → 현금', from: 'bank_balance', to: 'balance', desc: '저축액 출금' },
                  { id: 'stock2b', label: '증권 → 현금', from: 'brokerage_balance', to: 'balance', desc: '투자금 회수' },
                ].map(path => (
                  <button key={path.id} onClick={() => {
                    const fromInput = document.getElementById('fromAcc') as HTMLInputElement;
                    const toInput = document.getElementById('toAcc') as HTMLInputElement;
                    if(fromInput && toInput) { fromInput.value = path.from; toInput.value = path.to; }
                  }} className="p-4 border rounded-2xl text-left hover:border-indigo-600 hover:bg-indigo-50 transition-all group">
                    <p className="font-bold text-slate-800">{path.label}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{path.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <h3 className="text-lg font-bold">2. 이체 실행</h3>
              <div className="space-y-4 p-6 bg-slate-50 rounded-3xl">
                <input type="hidden" id="fromAcc" value="balance" />
                <input type="hidden" id="toAcc" value="bank_balance" />
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">이체할 금액</label>
                  <input type="number" value={transferAmount} onChange={(e)=>setTransferAmount(Number(e.target.value))} className="w-full bg-white p-4 rounded-2xl text-2xl font-black text-center outline-none border focus:ring-2 focus:ring-indigo-600" />
                </div>
                <button onClick={() => {
                  const fromVal = (document.getElementById('fromAcc') as HTMLInputElement).value;
                  const toVal = (document.getElementById('toAcc') as HTMLInputElement).value;
                  handleAssetTransfer(fromVal, toVal);
                }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:shadow-indigo-200 transition-all active:scale-95">이체하기</button>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                <Clock className="text-amber-600 shrink-0" size={18} />
                <p className="text-[11px] text-amber-800 leading-relaxed font-bold">은행/증권으로 보낸 돈은 <strong>보낸 날로부터 정확히 7일</strong>이 지나야 다시 현금으로 가져올 수 있습니다.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="space-y-4">
          <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <h2 className="text-xl font-black">오늘의 일일 퀴즈 💡</h2>
            <p className="text-indigo-100 text-xs mt-1">매일 오전 8시에 새로운 퀴즈가 찾아옵니다!</p>
            <HelpCircle size={80} className="absolute -right-4 -bottom-4 opacity-10" />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {dailyQuizzes.map((quiz, qIdx) => {
              const solved = solvedQuizIds.includes(quiz.id);
              return (
                <div key={quiz.id} className={`bg-white p-6 rounded-2xl border shadow-sm transition-all ${solved ? 'opacity-60 grayscale' : 'hover:shadow-md'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold">퀴즈 #{qIdx+1}</span>
                    <span className="text-emerald-600 font-black text-sm">+{quiz.reward.toLocaleString()}원</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-6 leading-tight">{quiz.question}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {quiz.options.map((opt, oIdx) => (
                      <button key={oIdx} onClick={() => !solved && handleQuizSolve(quiz, oIdx + 1)} disabled={solved} className={`w-full p-4 rounded-xl text-left text-sm font-bold transition-all border-2 ${solved ? 'bg-slate-50 border-slate-100' : 'hover:border-indigo-600 hover:bg-indigo-50 border-slate-50'}`}>
                        <span className="text-indigo-600 mr-2">{oIdx + 1}.</span> {opt}
                      </button>
                    ))}
                  </div>
                  {solved && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm">
                      <CheckCircle2 size={16}/> 참여 완료
                    </div>
                  )}
                </div>
              );
            })}
            {dailyQuizzes.length === 0 && (
              <div className="bg-white p-20 rounded-2xl border border-dashed flex flex-col items-center justify-center text-slate-400 gap-3">
                <HelpCircle size={40} className="opacity-20" />
                <p className="font-bold">오늘 준비된 퀴즈가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border shadow-sm mt-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><History size={18}/> 내 통장 기록</h3>
        <div className="space-y-3">
          {logs.map(log => {
            const isIncome = log.receiver_id === studentId;
            return (
              <div key={log.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs">
                <div className="flex gap-3 items-center">
                  <div className={`w-1 h-8 rounded-full ${isIncome ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                  <div><p className="font-bold text-slate-800">{log.description}</p><p className="text-slate-400 text-[10px]">{new Date(log.created_at).toLocaleString()}</p></div>
                </div>
                <p className={`font-black text-sm ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>{isIncome ? '+' : '-'}{log.amount.toLocaleString()}원</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
