
import React, { useState, useEffect } from 'react';
import { 
  Wallet, Landmark, LineChart, ShoppingBag, Map, Send, Search, History, HelpCircle, CheckCircle2, Clock, User, CheckSquare, Square,
  TrendingUp, TrendingDown, ExternalLink, Sparkles, X, ChevronRight, Newspaper
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getMarketData, getEconomyNews, summarizeNews } from '../services/geminiService';
import { Student, Transaction, Quiz, SavingsRecord, EconomySettings } from '../types';

interface Props {
  studentId: string;
}

const StudentDashboard: React.FC<Props> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState('transfer'); 
  const [student, setStudent] = useState<Student | null>(null);
  const [friends, setFriends] = useState<Student[]>([]);
  const [logs, setLogs] = useState<Transaction[]>([]);
  const [savings, setSavings] = useState<SavingsRecord[]>([]);
  const [sessionSettings, setSessionSettings] = useState<EconomySettings | null>(null);
  
  // 퀴즈 관련
  const [dailyQuizzes, setDailyQuizzes] = useState<Quiz[]>([]);
  const [solvedQuizIds, setSolvedQuizIds] = useState<string[]>([]);
  
  // 이체 및 송금 관련
  const [transferAmount, setTransferAmount] = useState(0);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 이체 경로 선택 상태 (은행/투자)
  const [bankPath, setBankPath] = useState<{from: string, to: string} | null>(null);
  const [investPath, setInvestPath] = useState<{from: string, to: string} | null>(null);

  // 투자 및 뉴스 관련
  const [marketData, setMarketData] = useState<{ stocks: any[], coins: any[] }>({ stocks: [], coins: [] });
  const [economyNews, setEconomyNews] = useState<any[]>([]);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [newsSummary, setNewsSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, [studentId, activeTab]);

  // 시장 데이터 및 뉴스 1시간마다 갱신
  useEffect(() => {
    if (activeTab === 'invest') {
      const loadInvestData = async () => {
        setIsLoading(true);
        try {
          const [m, n] = await Promise.all([getMarketData(), getEconomyNews()]);
          setMarketData(m);
          setEconomyNews(n);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
      };
      loadInvestData();
      const timer = setInterval(loadInvestData, 3600000);
      return () => clearInterval(timer);
    }
  }, [activeTab]);

  const fetchStudentData = async () => {
    const { data: st } = await supabase.from('students').select('*').eq('id', studentId).single();
    if (st) {
      setStudent(st);
      const { data: setts } = await supabase.from('economy_settings').select('*').eq('session_code', st.session_code).single();
      if (setts) setSessionSettings(setts);
      
      const { data: fr } = await supabase.from('students').select('*').eq('session_code', st.session_code).neq('id', studentId).order('id', { ascending: true });
      if (fr) setFriends(fr);
      const { data: tx } = await supabase.from('transactions').select('*').or(`sender_id.eq.${studentId},receiver_id.eq.${studentId}`).order('created_at', { ascending: false }).limit(20);
      if (tx) setLogs(tx);
      const { data: sv } = await supabase.from('savings_records').select('*').eq('student_id', studentId);
      if (sv) setSavings(sv);
      
      checkAndApplyAutoInterest(st, tx || []);
      
      if (activeTab === 'quiz') fetchQuizzes(st.session_code);
    }
  };

  const checkAndApplyAutoInterest = async (st: Student, txLogs: Transaction[]) => {
    if (st.bank_balance <= 0) return;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const lastInterestTx = txLogs.find(tx => tx.type === 'interest');
    const recentlyPaid = lastInterestTx && new Date(lastInterestTx.created_at) > oneWeekAgo;
    if (!recentlyPaid) {
      const { data: oldSavings } = await supabase.from('savings_records').select('*').eq('student_id', st.id).eq('account_type', 'bank').lt('created_at', oneWeekAgo.toISOString()).limit(1);
      if (oldSavings && oldSavings.length > 0) {
        const weeklyRate = 0.02 / 52;
        const interestAmount = Math.floor(st.bank_balance * weeklyRate);
        if (interestAmount > 0) {
          await supabase.from('students').update({ bank_balance: st.bank_balance + interestAmount }).eq('id', st.id);
          await supabase.from('transactions').insert({
            session_code: st.session_code, sender_id: 'GOVERNMENT', sender_name: '정부',
            receiver_id: st.id, receiver_name: st.name, amount: interestAmount, type: 'interest',
            description: '자동 주간 이자 지급 (연 2%)'
          });
          const { data: updatedSt } = await supabase.from('students').select('*').eq('id', studentId).single();
          if (updatedSt) setStudent(updatedSt);
        }
      }
    }
  };

  const fetchQuizzes = async (code: string) => {
    const { data: settings } = await supabase.from('economy_settings').select('quiz_count_per_day').eq('session_code', code).single();
    const count = settings?.quiz_count_per_day || 0;
    if (count <= 0) { setDailyQuizzes([]); return; }
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
    if (!student || transferAmount <= 0) return alert('금액을 입력해주세요.');
    if (from === 'bank_balance') {
      const myBankSavings = savings.filter(s => s.account_type === 'bank');
      const now = new Date();
      const availableAmount = myBankSavings
        .filter(r => (now.getTime() - new Date(r.created_at).getTime()) >= 7 * 24 * 60 * 60 * 1000)
        .reduce((sum, r) => sum + r.amount, 0);

      if (transferAmount > availableAmount) {
        alert(`출금 가능한 은행 금액이 부족합니다.\n(저축한 지 7일이 지나야 출금 가능합니다.\n현재 출금 가능액: ${availableAmount.toLocaleString()}원)`);
        return;
      }
    }
    const currentFromBalance = (student as any)[from];
    if (currentFromBalance < transferAmount) return alert('잔액이 부족합니다.');
    setIsLoading(true);
    try {
      const updates = { [from]: currentFromBalance - transferAmount, [to]: (student as any)[to] + transferAmount };
      await supabase.from('students').update(updates).eq('id', studentId);
      if (to !== 'balance') {
        await supabase.from('savings_records').insert({ student_id: studentId, amount: transferAmount, account_type: to === 'bank_balance' ? 'bank' : 'brokerage' });
      }
      await supabase.from('transactions').insert({
        session_code: student.session_code, sender_id: student.id, sender_name: student.name,
        receiver_id: student.id, receiver_name: student.name, amount: transferAmount, type: 'transfer',
        description: `${from === 'balance' ? '현금' : from === 'bank_balance' ? '은행' : '증권'} → ${to === 'balance' ? '현금' : to === 'bank_balance' ? '은행' : '증권'} 이체`
      });
      alert('이체 완료!');
      setTransferAmount(0); setBankPath(null); setInvestPath(null); fetchStudentData();
    } catch (e) { alert('오류 발생'); }
    finally { setIsLoading(false); }
  };

  const handleSendMoney = async () => {
    if (!student || transferAmount <= 0 || selectedRecipientIds.length === 0) return alert('송금 대상과 금액을 확인해주세요.');
    const totalRequired = transferAmount * selectedRecipientIds.length;
    if (student.balance < totalRequired) return alert(`현금이 부족합니다. (필요 금액: ${totalRequired.toLocaleString()}원)`);
    const recipientNames = selectedRecipientIds.map(id => id === 'GOVERNMENT' ? '정부' : friends.find(f => f.id === id)?.name).join(', ');
    if (!confirm(`${recipientNames}님에게 각각 ${transferAmount.toLocaleString()}원씩 송금할까요?`)) return;
    setIsLoading(true);
    try {
      await supabase.from('students').update({ balance: student.balance - totalRequired }).eq('id', studentId);
      for (const rId of selectedRecipientIds) {
        const recipient = rId === 'GOVERNMENT' ? { id: 'GOVERNMENT', name: '정부' } : friends.find(f => f.id === rId);
        if (!recipient) continue;
        if (rId !== 'GOVERNMENT') {
          const { data: rTarget } = await supabase.from('students').select('balance').eq('id', rId).single();
          if (rTarget) await supabase.from('students').update({ balance: rTarget.balance + transferAmount }).eq('id', rId);
        }
        await supabase.from('transactions').insert({
          session_code: student.session_code, sender_id: student.id, sender_name: student.name,
          receiver_id: recipient.id, receiver_name: recipient.name, amount: transferAmount, type: 'transfer',
          description: `${recipient.name}님에게 송금`
        });
      }
      alert('송금 완료!');
      setTransferAmount(0); setSelectedRecipientIds([]); fetchStudentData();
    } catch (e) { alert('송금 중 오류가 발생했습니다.'); }
    finally { setIsLoading(false); }
  };

  const handleQuizSolve = async (quiz: Quiz, selectedIdx: number) => {
    if (solvedQuizIds.includes(quiz.id)) return alert('이미 오늘 참여한 퀴즈입니다.');
    const isCorrect = quiz.answer === selectedIdx;
    const dateStr = new Date().toISOString().split('T')[0];
    await supabase.from('quiz_attempts').insert({ student_id: studentId, quiz_id: quiz.id, attempt_date: dateStr, is_correct: isCorrect });
    if (isCorrect) {
      alert(`정답입니다! ${quiz.reward.toLocaleString()}원이 지급되었습니다.`);
      await supabase.from('students').update({ balance: student!.balance + quiz.reward }).eq('id', studentId);
      await supabase.from('transactions').insert({
        session_code: student!.session_code, sender_id: 'GOVERNMENT', sender_name: '정부',
        receiver_id: studentId, receiver_name: student!.name, amount: quiz.reward, type: 'quiz', description: `퀴즈 정답 보상: ${quiz.question.substring(0, 10)}...`
      });
    } else { alert('아쉽게도 틀렸습니다. 내일 다시 도전하세요!'); }
    fetchQuizzes(student!.session_code);
    fetchStudentData();
  };

  const handleSummarize = async () => {
    if (!selectedNews || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeNews(selectedNews.title, sessionSettings?.school_level || 'elementary');
      setNewsSummary(summary);
    } catch (e) { console.error(e); }
    finally { setIsSummarizing(false); }
  };

  const addAmount = (val: number) => setTransferAmount(p => p + val);

  const getNextUnlockTime = () => {
    const lockedRecords = savings.filter(s => s.account_type === 'bank').map(s => ({ ...s, unlockDate: new Date(new Date(s.created_at).getTime() + 7 * 24 * 60 * 60 * 1000) })).filter(s => s.unlockDate > new Date()).sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime());
    if (lockedRecords.length === 0) return null;
    const diff = lockedRecords[0].unlockDate.getTime() - new Date().getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `D-${days}`;
    return `${hours}h`;
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
            <p className="text-[10px] font-bold text-slate-400 mb-1 flex justify-between items-center">
              은행 (연 2% 복리)
              {getNextUnlockTime() && <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded text-[9px] font-black border border-rose-100 flex items-center gap-1"><Clock size={10}/>{getNextUnlockTime()}</span>}
            </p>
            <h3 className="text-2xl font-black text-slate-900">{student.bank_balance.toLocaleString()}원</h3>
            <Landmark size={40} className="absolute -right-2 -bottom-2 text-emerald-50 opacity-10" />
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm border-b-4 border-b-amber-500">
            <p className="text-[10px] font-bold text-slate-400 mb-1">증권 (투자용)</p>
            <h3 className="text-2xl font-black text-slate-900">{student.brokerage_balance.toLocaleString()}원</h3>
          </div>
        </div>
      )}

      <nav className="flex bg-white p-1 rounded-2xl border sticky top-20 z-40 overflow-x-auto no-scrollbar">
        {[
          { id: 'transfer', label: '송금', icon: <Send size={16}/> },
          { id: 'bank', label: '은행 저축', icon: <Landmark size={16}/> },
          { id: 'invest', label: '증권 투자', icon: <LineChart size={16}/> },
          { id: 'quiz', label: '일일퀴즈', icon: <HelpCircle size={16}/> },
          { id: 'market', label: '상점', icon: <ShoppingBag size={16}/> },
          { id: 'estate', label: '부동산', icon: <Map size={16}/> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            {tab.icon} <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* 송금 탭 - 좌우 배치 레이아웃 */}
      {activeTab === 'transfer' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-800">현금 송금하기 💸</h2>
            <p className="text-sm text-slate-400 mt-1">친구들을 선택하고 송금할 금액을 정하세요.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-slate-500">받는 사람 선택 (복수 선택 가능)</label>
                <button onClick={() => setSelectedRecipientIds(selectedRecipientIds.length === friends.length + 1 ? [] : ['GOVERNMENT', ...friends.map(f => f.id)])} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">전체 선택</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-dashed no-scrollbar">
                <button 
                  onClick={() => setSelectedRecipientIds(p => p.includes('GOVERNMENT') ? p.filter(id => id !== 'GOVERNMENT') : [...p, 'GOVERNMENT'])} 
                  className={`py-3 px-1 rounded-xl border text-[11px] font-bold transition-all truncate ${selectedRecipientIds.includes('GOVERNMENT') ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-95' : 'bg-white text-slate-600 hover:border-indigo-200'}`}
                >
                  정부
                </button>
                {friends.map(f => (
                  <button 
                    key={f.id} 
                    onClick={() => setSelectedRecipientIds(p => p.includes(f.id) ? p.filter(id => id !== f.id) : [...p, f.id])} 
                    className={`py-3 px-1 rounded-xl border text-[11px] font-bold transition-all truncate ${selectedRecipientIds.includes(f.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-95' : 'bg-white text-slate-600 hover:border-indigo-200'}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6 flex flex-col justify-center bg-slate-50/50 p-6 rounded-2xl border">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">송금할 금액 (1인당 기준)</label>
                <div className="relative">
                  <input type="number" value={transferAmount} onChange={(e)=>setTransferAmount(Math.max(0, Number(e.target.value)))} className="w-full p-5 bg-white border rounded-2xl text-2xl font-black text-center outline-none focus:ring-2 focus:ring-indigo-600" />
                  <span className="absolute right-6 top-6 font-bold text-slate-400">원</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[100000, 50000, 10000, 5000, 1000].map(val => (
                    <button key={val} onClick={() => addAmount(val)} className="py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-indigo-200 transition-all">+{val.toLocaleString()}</button>
                  ))}
                  <button onClick={() => setTransferAmount(0)} className="py-2 bg-red-50 border border-red-100 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-100 transition-all">초기화</button>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-indigo-100 flex flex-col gap-1 shadow-sm">
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>선택 인원</span> <span>{selectedRecipientIds.length}명</span>
                </div>
                <div className="flex justify-between text-lg font-black text-indigo-600 border-t border-slate-100 pt-2 mt-1">
                  <span>총 송금액</span> <span>{(transferAmount * selectedRecipientIds.length).toLocaleString()}원</span>
                </div>
              </div>

              <button onClick={handleSendMoney} disabled={isLoading || selectedRecipientIds.length === 0} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50">
                {isLoading ? '송금 처리 중...' : '송금 실행하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 증권 투자 탭 - 실시간 정보 및 뉴스 */}
      {activeTab === 'invest' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 좌측: 실시간 시세 */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black flex items-center gap-2"><TrendingUp className="text-indigo-600"/> 실시간 시장 정보</h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <Clock size={12}/> 1시간 단위 자동 갱신
                  </div>
                </div>
                
                {isLoading && marketData.stocks.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-400">구글 금융에서 정보를 가져오는 중...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">주요 주식 종목</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {marketData.stocks.map((s, i) => {
                          const isUp = s.change.includes('+') || !s.change.includes('-');
                          return (
                            <div key={i} className="p-4 bg-slate-50 rounded-2xl border hover:border-indigo-200 transition-all cursor-default">
                              <p className="text-[10px] font-bold text-slate-400 mb-1">{s.name}</p>
                              <p className="text-sm font-black text-slate-800">{s.price}</p>
                              <p className={`text-[10px] font-bold mt-1 flex items-center gap-0.5 ${isUp ? 'text-rose-500' : 'text-blue-500'}`}>
                                {isUp ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {s.change}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">가상자산</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {marketData.coins.map((c, i) => {
                          const isUp = c.change.includes('+') || !c.change.includes('-');
                          return (
                            <div key={i} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 hover:border-indigo-300 transition-all">
                              <p className="text-[10px] font-bold text-indigo-400 mb-1">{c.name}</p>
                              <p className="text-sm font-black text-slate-800">{c.price}</p>
                              <p className={`text-[10px] font-bold mt-1 flex items-center gap-0.5 ${isUp ? 'text-rose-500' : 'text-blue-500'}`}>
                                {isUp ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {c.change}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 우측: 경제 뉴스 */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border shadow-sm h-full">
                <h3 className="text-xl font-black flex items-center gap-2 mb-6"><Newspaper className="text-amber-500"/> 오늘의 경제 뉴스</h3>
                <div className="space-y-4">
                  {economyNews.map((news, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setSelectedNews(news); setNewsSummary(''); }}
                      className="w-full text-left p-4 rounded-2xl border border-transparent hover:border-amber-200 hover:bg-amber-50 transition-all group"
                    >
                      <h4 className="text-sm font-bold text-slate-800 leading-snug mb-2 group-hover:text-amber-900 line-clamp-2">{news.title}</h4>
                      <div className="flex items-center text-[10px] font-bold text-slate-400 group-hover:text-amber-600">
                        자세히 보기 <ChevronRight size={12}/>
                      </div>
                    </button>
                  ))}
                  {economyNews.length === 0 && !isLoading && (
                    <div className="py-20 text-center text-slate-400">
                      <p className="text-xs font-bold">최신 뉴스가 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 뉴스 상세 모달 (요약 기능 포함) */}
      {selectedNews && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-start">
              <h3 className="text-xl font-black text-slate-800 pr-8">{selectedNews.title}</h3>
              <button onClick={() => setSelectedNews(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                <X size={20}/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex gap-3">
                <button 
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {isSummarizing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Sparkles size={20}/>
                  )}
                  {isSummarizing ? 'AI 분석 중...' : 'AI 뉴스 요약 정리'}
                </button>
                <a 
                  href={selectedNews.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                >
                  <ExternalLink size={20}/> 원본 보기
                </a>
              </div>

              {newsSummary && (
                <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                  <h4 className="text-xs font-black text-indigo-400 mb-3 flex items-center gap-2 uppercase tracking-widest">
                    <Sparkles size={12}/> AI 요약 결과 ({sessionSettings?.school_level === 'elementary' ? '초등' : sessionSettings?.school_level === 'middle' ? '중등' : '고등'} 수준)
                  </h4>
                  <p className="text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">{newsSummary}</p>
                </div>
              )}
              
              {!newsSummary && !isSummarizing && (
                <div className="py-10 text-center text-slate-400">
                  <p className="text-sm font-bold">위 버튼을 눌러 AI 요약본을 확인해보세요!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 은행/증권 탭 (기존과 동일하되 증권은 락업 없음 문구 강화) */}
      {activeTab === 'bank' && (
        <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Landmark size={20} className="text-emerald-500"/> 은행 이용하기</h3>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => setBankPath({from: 'balance', to: 'bank_balance'})} className={`p-5 border rounded-2xl text-left transition-all border-l-8 ${bankPath?.from === 'balance' ? 'bg-emerald-50 border-emerald-600 shadow-md ring-2 ring-emerald-200 scale-102 border-l-emerald-600' : 'bg-white hover:bg-slate-50 border-l-indigo-400'}`}>
                  <p className="font-bold text-slate-800">현금 → 은행 (입금)</p>
                  <p className="text-[11px] text-slate-400 mt-1">주간 이자가 발생합니다. (7일 락업 적용)</p>
                </button>
                <button onClick={() => setBankPath({from: 'bank_balance', to: 'balance'})} className={`p-5 border rounded-2xl text-left transition-all border-l-8 ${bankPath?.from === 'bank_balance' ? 'bg-emerald-50 border-emerald-600 shadow-md ring-2 ring-emerald-200 scale-102 border-l-emerald-600' : 'bg-white hover:bg-slate-50 border-l-emerald-400'}`}>
                  <p className="font-bold text-slate-800">은행 → 현금 (출금)</p>
                  <p className="text-[11px] text-slate-400 mt-1">은행 잔고에서 현금으로 이동합니다.</p>
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <h3 className="text-lg font-bold">이체 실행</h3>
              <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-dashed">
                <div className="space-y-2">
                  <input type="number" value={transferAmount} onChange={(e)=>setTransferAmount(Math.max(0, Number(e.target.value)))} className="w-full bg-white p-4 rounded-2xl text-2xl font-black text-center outline-none border focus:ring-2 focus:ring-emerald-600" placeholder="금액 입력" />
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[50000, 10000, 5000].map(val => (
                      <button key={val} onClick={() => addAmount(val)} className="py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-all">+{val.toLocaleString()}</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => bankPath ? handleAssetTransfer(bankPath.from, bankPath.to) : alert('이체 방향을 선택해주세요.')} className={`w-full py-4 rounded-2xl font-black shadow-lg transition-all ${bankPath ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                  {bankPath ? `${bankPath.from === 'balance' ? '입금' : '출금'} 실행하기` : '방향을 먼저 선택하세요'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 일일 퀴즈 탭 */}
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
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border shadow-sm mt-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><History size={18}/> 최근 활동 내역</h3>
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
