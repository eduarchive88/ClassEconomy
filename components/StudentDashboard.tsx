
import React, { useState, useEffect } from 'react';
import { 
  Wallet, Landmark, LineChart, ShoppingBag, Send, History, HelpCircle, CheckCircle2, TrendingUp, Package, ArrowRightLeft
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getMarketData } from '../services/geminiService';
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
  const [marketItems, setMarketItems] = useState<any[]>([]);
  
  const [dailyQuizzes, setDailyQuizzes] = useState<Quiz[]>([]);
  const [solvedQuizIds, setSolvedQuizIds] = useState<string[]>([]);
  
  const [transferAmount, setTransferAmount] = useState(0);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [bankPath, setBankPath] = useState<{from: string, to: string} | null>(null);
  const [investPath, setInvestPath] = useState<{from: string, to: string} | null>(null);

  const [marketData, setMarketData] = useState<{ stocks: any[], coins: any[] }>({ stocks: [], coins: [] });

  useEffect(() => {
    fetchStudentData();
  }, [studentId, activeTab]);

  useEffect(() => {
    if (activeTab === 'invest') {
      const loadInvestData = async () => {
        setIsLoading(true);
        try {
          const m = await getMarketData();
          if (m) setMarketData(m);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
      };
      loadInvestData();
    } else if (activeTab === 'market') {
      const fetchMarket = async () => {
        if (!student) return;
        const { data } = await supabase.from('market_items').select('*').eq('teacher_id', student.teacher_id);
        if (data) setMarketItems(data);
      };
      fetchMarket();
    }
  }, [activeTab]);

  const fetchStudentData = async () => {
    const { data: st } = await supabase.from('students').select('*').eq('id', studentId).single();
    if (st) {
      setStudent(st);
      const { data: setts } = await supabase.from('economy_settings').select('*').eq('session_code', st.session_code).single();
      if (setts) setSessionSettings(setts);
      const { data: fr } = await supabase.from('students').select('*').eq('session_code', st.session_code).neq('id', studentId);
      if (fr) setFriends(fr);
      const { data: tx } = await supabase.from('transactions').select('*').or(`sender_id.eq.${studentId},receiver_id.eq.${studentId}`).order('created_at', { ascending: false }).limit(20);
      if (tx) setLogs(tx);
      const { data: sv } = await supabase.from('savings_records').select('*').eq('student_id', studentId);
      if (sv) setSavings(sv);
      if (activeTab === 'quiz') fetchQuizzes(st.session_code);
    }
  };

  const fetchQuizzes = async (code: string) => {
    const { data: settings } = await supabase.from('economy_settings').select('quiz_count_per_day').eq('session_code', code).single();
    const count = settings?.quiz_count_per_day || 1;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const { data: allQuizzes } = await supabase.from('quizzes').select('*').eq('session_code', code);
    
    if (allQuizzes && allQuizzes.length > 0) {
      const seededRandom = (seed: string) => {
        let h = 0; for(let i=0; i<seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
        return () => { h = Math.imul(h ^ h >>> 16, 0x85ebca6b); h = Math.imul(h ^ h >>> 13, 0xc2b2ae35); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
      };
      const rand = seededRandom(dateStr + code);
      const sorted = [...allQuizzes].sort((a,b) => (a.usage_count||0) - (b.usage_count||0) || rand() - 0.5);
      setDailyQuizzes(sorted.slice(0, count));
    }
    const { data: attempts } = await supabase.from('quiz_attempts').select('quiz_id').eq('student_id', studentId).eq('attempt_date', dateStr);
    if (attempts) setSolvedQuizIds(attempts.map(a => a.quiz_id));
  };

  const handleAssetTransfer = async (from: string, to: string) => {
    if (!student || transferAmount <= 0) return;
    const currentFromBalance = (student as any)[from];
    if (currentFromBalance < transferAmount) return alert('잔액 부족');
    setIsLoading(true);
    try {
      await supabase.from('students').update({ [from]: currentFromBalance - transferAmount, [to]: (student as any)[to] + transferAmount }).eq('id', studentId);
      await supabase.from('transactions').insert({
        session_code: student.session_code, sender_id: studentId, sender_name: student.name,
        receiver_id: studentId, receiver_name: student.name, amount: transferAmount, type: 'transfer',
        description: '계좌 간 이체'
      });
      setTransferAmount(0); fetchStudentData();
    } catch(e) { alert('이체 중 오류 발생'); }
    finally { setIsLoading(false); }
  };

  const handleQuizSolve = async (quiz: Quiz, selectedIdx: number) => {
    if (solvedQuizIds.includes(quiz.id)) return;
    const isCorrect = quiz.answer === selectedIdx;
    const dateStr = new Date().toISOString().split('T')[0];
    
    setIsLoading(true);
    try {
      // 결과와 관계없이 문제를 풀었다는 사실을 DB에 먼저 기록
      await supabase.from('quiz_attempts').insert({ student_id: studentId, quiz_id: quiz.id, attempt_date: dateStr, is_correct: isCorrect });
      setSolvedQuizIds(prev => [...prev, quiz.id]);

      if (isCorrect) {
        await supabase.from('students').update({ balance: student!.balance + quiz.reward }).eq('id', studentId);
        await supabase.from('transactions').insert({
          session_code: student!.session_code, sender_id: 'GOVERNMENT', sender_name: '정부',
          receiver_id: studentId, receiver_name: student!.name, amount: quiz.reward, type: 'quiz', description: '퀴즈 정답 보상'
        });
        alert('정답입니다! 보상이 지급되었습니다.');
      } else {
        alert('아쉽지만 오답입니다. 이 문제는 오늘 더 이상 풀 수 없습니다.');
      }
      fetchStudentData();
    } catch (e) {
      alert('퀴즈 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMoney = async () => {
    if (!student || transferAmount <= 0 || selectedRecipientIds.length === 0) return;
    const totalAmount = transferAmount * selectedRecipientIds.length;
    if (student.balance < totalAmount) return alert('현금이 부족합니다.');
    if (!confirm(`${selectedRecipientIds.length}명에게 각 ${transferAmount.toLocaleString()}원씩 송금하시겠습니까?`)) return;

    setIsLoading(true);
    try {
      for (const recipientId of selectedRecipientIds) {
        let receiverName = '정부';
        if (recipientId !== 'GOVERNMENT') {
          const friend = friends.find(f => f.id === recipientId);
          if (friend) {
            receiverName = friend.name;
            const { data: currentFriend } = await supabase.from('students').select('balance').eq('id', recipientId).single();
            await supabase.from('students').update({ balance: (currentFriend?.balance || 0) + transferAmount }).eq('id', recipientId);
          }
        }
        await supabase.from('transactions').insert({
          session_code: student.session_code, sender_id: studentId, sender_name: student.name,
          receiver_id: recipientId, receiver_name: receiverName, amount: transferAmount, type: 'transfer',
          description: recipientId === 'GOVERNMENT' ? '정부 납부' : '송금'
        });
      }
      await supabase.from('students').update({ balance: student.balance - totalAmount }).eq('id', studentId);
      alert('송금 완료!');
      setTransferAmount(0); setSelectedRecipientIds([]); fetchStudentData();
    } catch (e) { alert('오류 발생'); }
    finally { setIsLoading(false); }
  };

  // Fixed: handleBuyItem implemented to process market purchases
  const handleBuyItem = async (item: any) => {
    if (!student || student.balance < item.price) return alert('현금이 부족합니다.');
    if (item.stock !== undefined && item.stock <= 0) return alert('품절된 상품입니다.');
    if (!confirm(`${item.name}을(를) ${item.price.toLocaleString()}원에 구매하시겠습니까?`)) return;

    setIsLoading(true);
    try {
      // 1. Deduct balance from student
      const { error: balanceError } = await supabase
        .from('students')
        .update({ balance: student.balance - item.price })
        .eq('id', studentId);
      
      if (balanceError) throw balanceError;

      // 2. Reduce stock of the item
      if (item.stock !== undefined) {
        await supabase
          .from('market_items')
          .update({ stock: item.stock - 1 })
          .eq('id', item.id);
      }

      // 3. Record the transaction
      await supabase.from('transactions').insert({
        session_code: student.session_code,
        sender_id: studentId,
        sender_name: student.name,
        receiver_id: 'MARKET',
        receiver_name: '상점',
        amount: item.price,
        type: 'market',
        description: `상점 물품 구매: ${item.name}`
      });

      alert('구매가 완료되었습니다!');
      await fetchStudentData();
      
      // Re-fetch market items to update UI stock counts
      const { data } = await supabase.from('market_items').select('*').eq('teacher_id', student.teacher_id);
      if (data) setMarketItems(data);
    } catch (e) {
      console.error(e);
      alert('구매 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {student && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm transition-all hover:border-indigo-200">
            <p className="text-[10px] font-black text-indigo-500 mb-1 uppercase tracking-wider">나의 현금</p>
            <h3 className="text-3xl font-black text-slate-900">{student.balance.toLocaleString()}원</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm transition-all hover:border-emerald-200">
            <p className="text-[10px] font-black text-emerald-500 mb-1 uppercase tracking-wider">은행 자산</p>
            <h3 className="text-3xl font-black text-slate-900">{student.bank_balance.toLocaleString()}원</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm transition-all hover:border-amber-200">
            <p className="text-[10px] font-black text-amber-500 mb-1 uppercase tracking-wider">증권 예수금</p>
            <h3 className="text-3xl font-black text-slate-900">{student.brokerage_balance.toLocaleString()}원</h3>
          </div>
        </div>
      )}

      <nav className="flex bg-white p-2 rounded-3xl border shadow-sm sticky top-20 z-40 overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'transfer', label: '송금', icon: <Send size={18}/> },
          { id: 'bank', label: '은행', icon: <Landmark size={18}/> },
          { id: 'invest', label: '증권', icon: <LineChart size={18}/> },
          { id: 'market', label: '상점', icon: <ShoppingBag size={18}/> },
          { id: 'quiz', label: '일일퀴즈', icon: <HelpCircle size={18}/> },
          { id: 'history', label: '기록', icon: <History size={18}/> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-[100px] py-4 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-1 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      <div className="transition-all duration-300">
        {activeTab === 'transfer' && (
          <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-8">
            <div className="flex items-center gap-3"><div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Send size={24}/></div><h2 className="text-2xl font-black">친구에게 송금하기</h2></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-4">
                <p className="text-xs font-black text-slate-400 ml-1">받는 사람 선택</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 h-fit overflow-y-auto max-h-60 p-4 bg-slate-50 rounded-3xl">
                  <button onClick={()=>setSelectedRecipientIds(p=>p.includes('GOVERNMENT')?p.filter(id=>id!=='GOVERNMENT'):[...p,'GOVERNMENT'])} className={`p-3 rounded-xl text-xs font-bold transition-all ${selectedRecipientIds.includes('GOVERNMENT')?'bg-indigo-600 text-white':'bg-white hover:bg-slate-100 text-slate-600'}`}>정부</button>
                  {friends.map(f=>(<button key={f.id} onClick={()=>setSelectedRecipientIds(p=>p.includes(f.id)?p.filter(id=>id!==f.id):[...p,f.id])} className={`p-3 rounded-xl text-xs font-bold truncate transition-all ${selectedRecipientIds.includes(f.id)?'bg-indigo-600 text-white':'bg-white hover:bg-slate-100 text-slate-600'}`}>{f.name}</button>))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 ml-1">송금할 금액</p>
                  <input type="number" value={transferAmount || ''} onChange={e=>setTransferAmount(Number(e.target.value))} className="w-full p-6 bg-slate-50 border-none rounded-3xl text-center text-4xl font-black focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
                </div>
                <button onClick={handleSendMoney} className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">송금 실행하기</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="bg-white p-10 rounded-3xl border shadow-sm space-y-10">
            <div className="flex items-center gap-3"><div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><Landmark size={24}/></div><h2 className="text-2xl font-black">은행 자산 이동</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <button onClick={() => setBankPath({from: 'balance', to: 'bank_balance'})} className={`w-full p-6 rounded-3xl text-left font-black transition-all flex items-center justify-between border-2 ${bankPath?.from === 'balance' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                  현금 → 은행 입금 <ArrowRightLeft size={20}/>
                </button>
                <button onClick={() => setBankPath({from: 'bank_balance', to: 'balance'})} className={`w-full p-6 rounded-3xl text-left font-black transition-all flex items-center justify-between border-2 ${bankPath?.from === 'bank_balance' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                  은행 → 현금 출금 <ArrowRightLeft size={20}/>
                </button>
              </div>
              <div className="space-y-6">
                <input type="number" value={transferAmount || ''} onChange={e=>setTransferAmount(Number(e.target.value))} className="w-full p-6 bg-slate-50 border-none rounded-3xl text-center text-3xl font-black focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                <button onClick={()=>bankPath && handleAssetTransfer(bankPath.from, bankPath.to)} disabled={!bankPath || transferAmount <= 0} className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black text-lg disabled:opacity-30 shadow-lg shadow-emerald-100">이체 실행</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invest' && (
          <div className="space-y-6">
            <div className="bg-white p-10 rounded-3xl border shadow-sm">
              <div className="flex items-center gap-3 mb-8"><div className="p-3 bg-amber-50 rounded-2xl text-amber-600"><LineChart size={24}/></div><h2 className="text-2xl font-black">증권 자금 이동</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <button onClick={() => setInvestPath({from: 'balance', to: 'brokerage_balance'})} className={`w-full p-6 rounded-3xl text-left font-black transition-all flex items-center justify-between border-2 ${investPath?.from === 'balance' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                    현금 → 증권 입금 <ArrowRightLeft size={20}/>
                  </button>
                  <button onClick={() => setInvestPath({from: 'brokerage_balance', to: 'balance'})} className={`w-full p-6 rounded-3xl text-left font-black transition-all flex items-center justify-between border-2 ${investPath?.from === 'brokerage_balance' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                    증권 → 현금 출금 <ArrowRightLeft size={20}/>
                  </button>
                </div>
                <div className="space-y-6">
                  <input type="number" value={transferAmount || ''} onChange={e=>setTransferAmount(Number(e.target.value))} className="w-full p-6 bg-slate-50 border-none rounded-3xl text-center text-3xl font-black focus:ring-2 focus:ring-amber-500 outline-none" placeholder="0" />
                  <button onClick={()=>investPath && handleAssetTransfer(investPath.from, investPath.to)} disabled={!investPath || transferAmount <= 0} className="w-full py-5 bg-amber-500 text-white rounded-3xl font-black text-lg disabled:opacity-30 shadow-lg shadow-amber-100">이체 실행</button>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl border shadow-sm">
              <h3 className="text-xl font-black mb-8 flex items-center gap-2"><TrendingUp className="text-indigo-600"/> 실시간 시장 정보</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketData.stocks.map((s, i) => {
                  const isUp = s.change && !s.change.includes('-');
                  return (
                    <div key={i} className="bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm flex flex-col justify-between h-40 hover:border-indigo-100 transition-all">
                      <div><p className="text-[10px] font-black text-indigo-500 mb-1">{s.ticker || 'STOCK'}</p><p className="text-sm font-bold text-slate-500 truncate">{s.name}</p></div>
                      <div className="flex justify-between items-end">
                        <h4 className="text-2xl font-black">₩{s.price}</h4>
                        <div className={`text-sm font-black ${isUp ? 'text-rose-500' : 'text-blue-500'}`}>{s.change}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'market' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketItems.map(item => (
              <div key={item.id} className="bg-white p-8 rounded-3xl border shadow-sm hover:shadow-xl transition-all border-b-8 border-b-slate-100">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600"><Package size={32}/></div>
                  {item.stock !== undefined && (
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${item.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {item.stock > 0 ? `In Stock: ${item.stock}` : 'Sold Out'}
                    </span>
                  )}
                </div>
                <h4 className="text-xl font-black text-slate-800 mb-1">{item.name}</h4>
                <p className="text-2xl font-black text-indigo-600 mb-6">₩{item.price.toLocaleString()}</p>
                <button onClick={() => handleBuyItem(item)} disabled={isLoading || (item.stock !== undefined && item.stock <= 0)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 disabled:opacity-30 shadow-lg shadow-slate-100">구매하기</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {dailyQuizzes.map((quiz, i) => {
              const solved = solvedQuizIds.includes(quiz.id);
              return (
                <div key={quiz.id} className={`bg-white p-10 rounded-[2.5rem] border-2 transition-all ${solved ? 'bg-slate-50 border-slate-100 opacity-70 cursor-default shadow-inner' : 'border-indigo-100 shadow-xl shadow-indigo-50 ring-4 ring-indigo-50/50'}`}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${solved ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white'}`}>{i + 1}</div>
                    <h3 className="text-xl font-black text-slate-800 leading-tight">{quiz.question}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {quiz.options.map((opt, oIdx) => (
                      <button key={oIdx} onClick={() => !solved && handleQuizSolve(quiz, oIdx + 1)} disabled={solved || isLoading} className={`w-full p-5 border-2 rounded-2xl text-left font-black text-sm transition-all ${solved ? 'bg-white border-slate-50 text-slate-300 cursor-not-allowed' : 'hover:border-indigo-600 hover:bg-indigo-50 border-slate-100 text-slate-600 shadow-sm hover:shadow-md'}`}>
                        <span className="mr-4 text-indigo-300">0{oIdx + 1}</span> {opt}
                      </button>
                    ))}
                  </div>
                  {solved && <div className="mt-8 flex items-center justify-center gap-2 text-emerald-600 font-black bg-emerald-50 py-4 rounded-3xl border border-emerald-100"><CheckCircle2 size={24}/> 오늘의 참여를 완료했습니다</div>}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white p-8 rounded-3xl border shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-y text-slate-500 font-black tracking-widest uppercase text-[10px]">
                  <th className="px-6 py-4 text-center">Date</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Description</th><th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5 text-slate-400 text-xs text-center">{new Date(log.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-5 font-black uppercase text-[10px] text-indigo-500">{log.type}</td>
                    <td className="px-6 py-5 text-slate-700 font-bold">{log.description}</td>
                    <td className={`px-6 py-5 text-right font-black text-lg ${log.sender_id === studentId ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {log.sender_id === studentId ? '-' : '+'}{log.amount.toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
