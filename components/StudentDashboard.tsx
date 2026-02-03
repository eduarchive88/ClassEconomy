
import React, { useState, useEffect } from 'react';
import { 
  Wallet, Landmark, LineChart, ShoppingBag, Map, Send, Search, History, HelpCircle, CheckCircle2, Clock, User, CheckSquare, Square,
  TrendingUp, TrendingDown, ExternalLink, Sparkles, X, ChevronRight, Newspaper, Package
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
  const [marketItems, setMarketItems] = useState<any[]>([]);
  
  // 퀴즈 관련
  const [dailyQuizzes, setDailyQuizzes] = useState<Quiz[]>([]);
  const [solvedQuizIds, setSolvedQuizIds] = useState<string[]>([]);
  
  // 이체 및 송금 관련
  const [transferAmount, setTransferAmount] = useState(0);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 이체 경로 선택 상태
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

  useEffect(() => {
    if (activeTab === 'invest') {
      const loadInvestData = async () => {
        setIsLoading(true);
        try {
          const [m, n] = await Promise.all([getMarketData(), getEconomyNews()]);
          if (m) setMarketData(m);
          if (n) setEconomyNews(n);
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
    const count = settings?.quiz_count_per_day || 0;
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

  const handleBuyItem = async (item: any) => {
    if (!student) return;
    if (item.stock !== undefined && item.stock <= 0) return alert('재고가 없습니다.');
    if (student.balance < item.price) return alert('현금이 부족합니다.');
    if (!confirm(`${item.name}을(를) ${item.price.toLocaleString()}원에 구매하시겠습니까?`)) return;

    setIsLoading(true);
    try {
      if (item.stock !== undefined) {
        await supabase.from('market_items').update({ stock: item.stock - 1 }).eq('id', item.id);
      }
      await supabase.from('students').update({ balance: student.balance - item.price }).eq('id', studentId);
      await supabase.from('transactions').insert({
        session_code: student.session_code, sender_id: studentId, sender_name: student.name,
        receiver_id: 'GOVERNMENT', receiver_name: '상점', amount: item.price, type: 'market',
        description: `상점 구매: ${item.name}`
      });
      alert('구매 완료!');
      fetchStudentData();
    } catch (e) { alert('오류 발생'); }
    finally { setIsLoading(false); }
  };

  const handleAssetTransfer = async (from: string, to: string) => {
    if (!student || transferAmount <= 0) return;
    const currentFromBalance = (student as any)[from];
    if (currentFromBalance < transferAmount) return alert('잔액 부족');
    setIsLoading(true);
    await supabase.from('students').update({ [from]: currentFromBalance - transferAmount, [to]: (student as any)[to] + transferAmount }).eq('id', studentId);
    await supabase.from('transactions').insert({
      session_code: student.session_code, sender_id: studentId, sender_name: student.name,
      receiver_id: studentId, receiver_name: student.name, amount: transferAmount, type: 'transfer',
      description: '계좌 간 이체'
    });
    setTransferAmount(0); fetchStudentData(); setIsLoading(false);
  };

  const handleQuizSolve = async (quiz: Quiz, selectedIdx: number) => {
    if (solvedQuizIds.includes(quiz.id)) return;
    const isCorrect = quiz.answer === selectedIdx;
    const dateStr = new Date().toISOString().split('T')[0];
    await supabase.from('quiz_attempts').insert({ student_id: studentId, quiz_id: quiz.id, attempt_date: dateStr, is_correct: isCorrect });
    if (isCorrect) {
      await supabase.from('students').update({ balance: student!.balance + quiz.reward }).eq('id', studentId);
      await supabase.from('transactions').insert({
        session_code: student!.session_code, sender_id: 'GOVERNMENT', sender_name: '정부',
        receiver_id: studentId, receiver_name: student!.name, amount: quiz.reward, type: 'quiz', description: '퀴즈 정답 보상'
      });
      alert('정답!');
    } else alert('오답');
    fetchStudentData();
  };

  const handleSendMoney = async () => {
    if (!student || transferAmount <= 0 || selectedRecipientIds.length === 0) return;
    const totalAmount = transferAmount * selectedRecipientIds.length;
    if (student.balance < totalAmount) return alert('현금이 부족합니다.');
    
    if (!confirm(`${selectedRecipientIds.length}명에게 각각 ${transferAmount.toLocaleString()}원씩 총 ${totalAmount.toLocaleString()}원을 송금하시겠습니까?`)) return;

    setIsLoading(true);
    try {
      for (const recipientId of selectedRecipientIds) {
        let receiverName = '정부';
        if (recipientId !== 'GOVERNMENT') {
          const friend = friends.find(f => f.id === recipientId);
          if (friend) {
            receiverName = friend.name;
            await supabase.from('students').update({ balance: (friend.balance || 0) + transferAmount }).eq('id', recipientId);
          }
        }
        
        await supabase.from('transactions').insert({
          session_code: student.session_code,
          sender_id: studentId,
          sender_name: student.name,
          receiver_id: recipientId,
          receiver_name: receiverName,
          amount: transferAmount,
          type: 'transfer',
          description: recipientId === 'GOVERNMENT' ? '정부 납부' : '개인 송금'
        });
      }
      
      await supabase.from('students').update({ balance: student.balance - totalAmount }).eq('id', studentId);
      alert('송금 완료!');
      setTransferAmount(0);
      setSelectedRecipientIds([]);
      fetchStudentData();
    } catch (e) {
      console.error(e);
      alert('송금 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
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
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm border-b-4 border-b-amber-500">
            <p className="text-[10px] font-bold text-slate-400 mb-1">증권 (예수금)</p>
            <h3 className="text-2xl font-black text-slate-900">{student.brokerage_balance.toLocaleString()}원</h3>
          </div>
        </div>
      )}

      <nav className="flex bg-white p-1 rounded-2xl border sticky top-20 z-40 overflow-x-auto no-scrollbar">
        {[
          { id: 'transfer', label: '송금', icon: <Send size={16}/> },
          { id: 'bank', label: '은행', icon: <Landmark size={16}/> },
          { id: 'invest', label: '증권', icon: <LineChart size={16}/> },
          { id: 'market', label: '상점', icon: <ShoppingBag size={16}/> },
          { id: 'quiz', label: '일일퀴즈', icon: <HelpCircle size={16}/> },
          { id: 'history', label: '기록', icon: <History size={16}/> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-[80px] py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>
            <span className="flex items-center justify-center gap-2">{tab.icon} {tab.label}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'transfer' && (
        <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
          <div className="text-center mb-8"><h2 className="text-2xl font-black">송금하기</h2></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="grid grid-cols-4 gap-2 h-fit overflow-y-auto max-h-60 p-4 bg-slate-50 rounded-xl">
              <button onClick={()=>setSelectedRecipientIds(p=>p.includes('GOVERNMENT')?p.filter(id=>id!=='GOVERNMENT'):[...p,'GOVERNMENT'])} className={`p-2 rounded-lg text-xs font-bold ${selectedRecipientIds.includes('GOVERNMENT')?'bg-indigo-600 text-white':'bg-white'}`}>정부</button>
              {friends.map(f=>(<button key={f.id} onClick={()=>setSelectedRecipientIds(p=>p.includes(f.id)?p.filter(id=>id!==f.id):[...p,f.id])} className={`p-2 rounded-lg text-xs font-bold truncate ${selectedRecipientIds.includes(f.id)?'bg-indigo-600 text-white':'bg-white'}`}>{f.name}</button>))}
            </div>
            <div className="space-y-4">
              <input type="number" value={transferAmount || ''} onChange={e=>setTransferAmount(Number(e.target.value))} className="w-full p-4 border rounded-xl text-center text-2xl font-black" placeholder="원" />
              <button onClick={handleSendMoney} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg">송금하기</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bank' && (
        <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Landmark className="text-emerald-500"/> 은행 서비스</h3>
              <button onClick={() => setBankPath({from: 'balance', to: 'bank_balance'})} className={`w-full p-4 border rounded-xl text-left font-bold transition-all ${bankPath?.from === 'balance' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'bg-slate-50'}`}>현금 → 은행 입금</button>
              <button onClick={() => setBankPath({from: 'bank_balance', to: 'balance'})} className={`w-full p-4 border rounded-xl text-left font-bold transition-all ${bankPath?.from === 'bank_balance' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'bg-slate-50'}`}>은행 → 현금 출금</button>
            </div>
            <div className="flex-1 space-y-4">
              <label className="text-xs font-bold text-slate-400">이체 금액</label>
              <input type="number" value={transferAmount || ''} onChange={e=>setTransferAmount(Number(e.target.value))} className="w-full p-4 border rounded-xl text-center text-xl font-bold" placeholder="0" />
              <button onClick={()=>bankPath && handleAssetTransfer(bankPath.from, bankPath.to)} disabled={!bankPath || transferAmount <= 0} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50">이체 실행</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invest' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border shadow-sm">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2"><LineChart className="text-amber-500"/> 증권 계좌 이용</h3>
                <button onClick={() => setInvestPath({from: 'balance', to: 'brokerage_balance'})} className={`w-full p-4 border rounded-xl text-left font-bold transition-all ${investPath?.from === 'balance' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'bg-slate-50'}`}>현금 → 증권 입금</button>
                <button onClick={() => setInvestPath({from: 'brokerage_balance', to: 'balance'})} className={`w-full p-4 border rounded-xl text-left font-bold transition-all ${investPath?.from === 'brokerage_balance' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'bg-slate-50'}`}>증권 → 현금 출금</button>
              </div>
              <div className="flex-1 space-y-4">
                <label className="text-xs font-bold text-slate-400">이체 금액</label>
                <input type="number" value={transferAmount || ''} onChange={e=>setTransferAmount(Number(e.target.value))} className="w-full p-4 border rounded-xl text-center text-xl font-bold" placeholder="0" />
                <button onClick={()=>investPath && handleAssetTransfer(investPath.from, investPath.to)} disabled={!investPath || transferAmount <= 0} className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold disabled:opacity-50">이체 실행</button>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2"><TrendingUp className="text-indigo-600"/> 실시간 시장 정보</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketData.stocks.map((s, i) => {
                const isUp = s.change && !s.change.includes('-');
                return (
                  <div key={i} className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col justify-between h-40 hover:border-indigo-200 transition-all">
                    <div><p className="text-[10px] font-black text-indigo-500 mb-1">{s.ticker || 'STOCK'}</p><p className="text-xs font-bold text-slate-400">{s.name}</p></div>
                    <div className="flex justify-between items-end">
                      <h4 className="text-xl font-black">₩{s.price}</h4>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketItems.map(item => (
            <div key={item.id} className="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <Package className="text-indigo-600" size={32}/>
                {item.stock !== undefined && (
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${item.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {item.stock > 0 ? `재고 ${item.stock}개` : '품절'}
                  </span>
                )}
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-1">{item.name}</h4>
              <p className="text-xl font-black text-indigo-600 mb-4">₩{item.price.toLocaleString()}</p>
              <button 
                onClick={() => handleBuyItem(item)}
                disabled={isLoading || (item.stock !== undefined && item.stock <= 0)}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all"
              >
                구매하기
              </button>
            </div>
          ))}
          {marketItems.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 font-bold">판매 중인 물품이 없습니다.</div>}
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dailyQuizzes.map((quiz, i) => {
            const solved = solvedQuizIds.includes(quiz.id);
            return (
              <div key={quiz.id} className={`bg-white p-8 rounded-3xl border shadow-sm transition-all ${solved ? 'bg-slate-50 border-slate-200' : 'border-indigo-100 ring-2 ring-indigo-50'}`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${solved ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white'}`}>{i + 1}</div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">{quiz.question}</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {quiz.options.map((opt, oIdx) => (
                    <button 
                      key={oIdx} 
                      onClick={() => !solved && handleQuizSolve(quiz, oIdx + 1)} 
                      disabled={solved} 
                      className={`w-full p-4 border rounded-2xl text-left font-bold text-sm transition-all ${solved ? 'bg-white border-slate-100 text-slate-300' : 'hover:border-indigo-600 hover:bg-indigo-50 border-slate-100 text-slate-600'}`}
                    >
                      <span className="mr-3 opacity-40">{oIdx + 1}.</span> {opt}
                    </button>
                  ))}
                </div>
                {solved && <div className="mt-6 flex items-center justify-center gap-2 text-emerald-600 font-black bg-emerald-50 py-3 rounded-2xl"><CheckCircle2 size={18}/> 참여 완료</div>}
                {!solved && <div className="mt-6 text-center text-[10px] font-bold text-slate-400 italic">정답 보상: ₩{quiz.reward.toLocaleString()}</div>}
              </div>
            );
          })}
          {dailyQuizzes.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 font-bold">오늘 출제된 퀴즈가 없습니다.</div>}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-3xl border shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-y text-slate-500 font-bold">
                <th className="px-4 py-3">날짜</th><th className="px-4 py-3">구분</th><th className="px-4 py-3">내용</th><th className="px-4 py-3">상대</th><th className="px-4 py-3 text-right">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 text-slate-400 text-xs">{new Date(log.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-4 font-bold">{log.type}</td>
                  <td className="px-4 py-4 text-slate-600">{log.description}</td>
                  <td className="px-4 py-4 font-bold">{log.sender_id === studentId ? log.receiver_name : log.sender_name}</td>
                  <td className={`px-4 py-4 text-right font-black ${log.sender_id === studentId ? 'text-red-500' : 'text-emerald-600'}`}>
                    {log.sender_id === studentId ? '-' : '+'}{log.amount.toLocaleString()}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
