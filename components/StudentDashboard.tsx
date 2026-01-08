
import React, { useState, useEffect } from 'react';
import { 
  Wallet, Landmark, LineChart, ShoppingBag, Map, Send, Search, History
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Student, Transaction } from '../types';

interface Props {
  studentId: string;
}

const StudentDashboard: React.FC<Props> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [student, setStudent] = useState<Student | null>(null);
  const [friends, setFriends] = useState<Student[]>([]);
  const [logs, setLogs] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [sendAmount, setSendAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    const { data: st } = await supabase.from('students').select('*').eq('id', studentId).single();
    if (st) {
      setStudent(st);
      const { data: fr } = await supabase.from('students').select('*').eq('session_code', st.session_code).neq('id', studentId);
      if (fr) setFriends(fr);
      const { data: tx } = await supabase.from('transactions').select('*').or(`sender_id.eq.${studentId},receiver_id.eq.${studentId}`).order('created_at', { ascending: false }).limit(20);
      if (tx) setLogs(tx);
    }
  };

  const handleSendMoney = async () => {
    if (!student || selectedFriends.length === 0 || sendAmount <= 0) return alert('대상과 금액을 확인하세요.');
    const totalSend = sendAmount * selectedFriends.length;
    if (student.balance < totalSend) return alert('잔액이 부족합니다.');

    if (!confirm(`${selectedFriends.length}명에게 각각 ${sendAmount.toLocaleString()}원씩 송금하시겠습니까?`)) return;

    setIsLoading(true);
    try {
      await supabase.from('students').update({ balance: student.balance - totalSend }).eq('id', studentId);
      for (const fId of selectedFriends) {
        const friend = friends.find(f => f.id === fId);
        if (friend) {
          await supabase.from('students').update({ balance: friend.balance + sendAmount }).eq('id', fId);
          await supabase.from('transactions').insert({
            session_code: student.session_code, sender_id: student.id, sender_name: student.name,
            receiver_id: fId, receiver_name: friend.name, amount: sendAmount, type: 'transfer', description: '친구 송금'
          });
        }
      }
      alert('송금 완료!');
      setSendAmount(0); setSelectedFriends([]); fetchStudentData();
    } catch (e) { alert('오류 발생'); }
    finally { setIsLoading(false); }
  };

  const TransactionHistory = () => (
    <div className="bg-white p-6 rounded-2xl border shadow-sm mt-8">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><History size={18}/> 내 통장 기록</h3>
      <div className="space-y-3">
        {logs.map(log => {
          const isIncome = log.receiver_id === studentId;
          return (
            <div key={log.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs border border-transparent hover:border-indigo-100 transition-all">
              <div className="flex gap-3 items-center">
                <div className={`w-1 h-8 rounded-full ${isIncome ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                <div>
                  <p className="font-bold text-slate-800">{log.description || '거래 내역'}</p>
                  <p className="text-slate-400 text-[10px]">{new Date(log.created_at).toLocaleString()} • {isIncome ? `보낸 이: ${log.sender_name}` : `받은 이: ${log.receiver_name}`}</p>
                </div>
              </div>
              <p className={`font-black text-sm ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                {isIncome ? '+' : '-'}{log.amount.toLocaleString()}원
              </p>
            </div>
          );
        })}
        {logs.length === 0 && <p className="text-center py-10 text-slate-400">거래 내역이 없습니다.</p>}
      </div>
    </div>
  );

  const filteredFriends = friends.filter(f => f.name.includes(searchQuery) || f.id.includes(searchQuery));

  return (
    <div className="space-y-6">
      {student && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border shadow-sm border-b-4 border-b-indigo-500">
            <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase">현금 통장</p>
            <h3 className="text-2xl font-black text-slate-900">{student.balance.toLocaleString()}원</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm border-b-4 border-b-emerald-500">
            <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase">은행 저축</p>
            <h3 className="text-2xl font-black text-slate-900">{student.bank_balance.toLocaleString()}원</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm border-b-4 border-b-amber-500">
            <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase">증권 예수금</p>
            <h3 className="text-2xl font-black text-slate-900">{student.brokerage_balance.toLocaleString()}원</h3>
          </div>
        </div>
      )}

      <nav className="flex bg-white p-1 rounded-2xl border sticky top-20 z-40">
        {['home', 'invest', 'quiz', 'market', 'estate'].map(id => (
          <button key={id} onClick={() => setActiveTab(id)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>
            {id === 'home' && <Wallet size={16}/>}
            <span className="capitalize">{id}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'home' && (
        <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Send size={18}/> 1. 송금 대상 선택 ({selectedFriends.length}명)</h3>
              <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={16}/><input type="text" placeholder="이름 검색" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-sm" /></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
                {filteredFriends.map(f => (
                  <button key={f.id} onClick={() => setSelectedFriends(p => p.includes(f.id) ? p.filter(id => id !== f.id) : [...p, f.id])} className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${selectedFriends.includes(f.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-slate-50'}`}>
                    {f.name} <span className="block opacity-60 font-mono text-[9px]">{f.id}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2"><Wallet size={18}/> 2. 송금 금액 설정</h3>
              <div className="p-6 bg-slate-900 rounded-3xl text-center shadow-xl">
                <p className="text-slate-400 text-[10px] font-bold mb-2">각 {sendAmount.toLocaleString()}원씩 송금</p>
                <input type="number" value={sendAmount} onChange={(e)=>setSendAmount(Number(e.target.value))} className="bg-transparent text-white text-3xl font-black text-center w-full focus:outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1000, 5000, 10000, 50000].map(amt => <button key={amt} onClick={() => setSendAmount(p => p + amt)} className="py-3 bg-slate-100 rounded-xl text-xs font-bold hover:bg-slate-200">+{amt.toLocaleString()}</button>)}
                <button onClick={() => setSendAmount(0)} className="py-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold col-span-2">초기화</button>
              </div>
              <button onClick={handleSendMoney} disabled={isLoading || selectedFriends.length === 0 || sendAmount <= 0} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? '처리 중...' : '지금 송금하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모든 탭 하단에 공통 로그 노출 */}
      <TransactionHistory />
    </div>
  );
};

export default StudentDashboard;
