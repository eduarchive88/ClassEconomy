
import React, { useState, useEffect } from 'react';
import { 
  Wallet, Landmark, LineChart, ShoppingBag, Map, BrainCircuit, 
  TrendingUp, UserCircle, Send, ShoppingCart, Search, CheckCircle2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Student, EconomySettings, MarketItem } from '../types';

interface Props {
  studentId: string;
}

const StudentDashboard: React.FC<Props> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [student, setStudent] = useState<Student | null>(null);
  const [friends, setFriends] = useState<Student[]>([]);
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
    }
  };

  const handleSendMoney = async () => {
    if (!student || selectedFriends.length === 0 || sendAmount <= 0) return alert('대상과 금액을 확인하세요.');
    const totalSend = sendAmount * selectedFriends.length;
    if (student.balance < totalSend) return alert('잔액이 부족합니다.');

    if (!confirm(`${selectedFriends.length}명에게 각각 ${sendAmount.toLocaleString()}원씩(총 ${totalSend.toLocaleString()}원)을 보낼까요?`)) return;

    setIsLoading(true);
    try {
      // 1. 내 잔액 차감
      await supabase.from('students').update({ balance: student.balance - totalSend }).eq('id', studentId);
      
      // 2. 친구들 잔액 증액
      for (const fId of selectedFriends) {
        const friend = friends.find(f => f.id === fId);
        if (friend) {
          await supabase.from('students').update({ balance: friend.balance + sendAmount }).eq('id', fId);
        }
      }
      alert('송금이 완료되었습니다!');
      setSendAmount(0);
      setSelectedFriends([]);
      fetchStudentData();
    } catch (e) { alert('오류 발생'); }
    finally { setIsLoading(false); }
  };

  const filteredFriends = friends.filter(f => f.name.includes(searchQuery) || f.id.includes(searchQuery));

  return (
    <div className="space-y-6">
      {student && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">현금 통장</p>
            <h3 className="text-xl font-bold">{student.balance.toLocaleString()}원</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
            <p className="text-[10px] font-bold text-indigo-400 mb-1 uppercase tracking-wider">은행 저축</p>
            <h3 className="text-xl font-bold text-indigo-600">{student.bank_balance.toLocaleString()}원</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
            <p className="text-[10px] font-bold text-emerald-400 mb-1 uppercase tracking-wider">증권 예수금</p>
            <h3 className="text-xl font-bold text-emerald-600">{student.brokerage_balance.toLocaleString()}원</h3>
          </div>
        </div>
      )}

      <nav className="flex bg-white p-1 rounded-2xl border sticky top-20 z-40">
        {['home', 'invest', 'quiz', 'market', 'estate'].map(id => (
          <button key={id} onClick={() => setActiveTab(id)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === id ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
            {id === 'home' && <Wallet size={16}/>}
            {id === 'invest' && <TrendingUp size={16}/>}
            {id === 'market' && <ShoppingBag size={16}/>}
            {id === 'estate' && <Map size={16}/>}
            <span className="capitalize">{id}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'home' && (
        <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Send size={18}/> 1. 송금 대상 선택 ({selectedFriends.length}명)</h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                <input type="text" placeholder="이름 또는 학번 검색" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
                {filteredFriends.map(f => (
                  <button 
                    key={f.id} 
                    onClick={() => setSelectedFriends(prev => prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id])}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${selectedFriends.includes(f.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {f.name} <span className="block opacity-60 font-mono">{f.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2"><Wallet size={18}/> 2. 송금 금액 설정</h3>
              <div className="p-6 bg-slate-900 rounded-3xl text-center shadow-xl">
                <p className="text-slate-400 text-xs font-bold mb-2">총 송금액: {(sendAmount * selectedFriends.length).toLocaleString()}원</p>
                <div className="flex items-center justify-center gap-3">
                  <input type="number" value={sendAmount} onChange={(e)=>setSendAmount(Number(e.target.value))} className="bg-transparent text-white text-3xl font-black text-center w-full focus:outline-none" />
                  <span className="text-indigo-400 text-2xl font-black">원</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1000, 5000, 10000, 30000, 50000, 100000].map(amt => (
                  <button key={amt} onClick={() => setSendAmount(prev => prev + amt)} className="py-3 bg-slate-100 rounded-xl text-xs font-bold hover:bg-slate-200">+{amt.toLocaleString()}</button>
                ))}
                <button onClick={() => setSendAmount(0)} className="py-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 col-span-3">초기화</button>
              </div>
              <button 
                onClick={handleSendMoney}
                disabled={isLoading || selectedFriends.length === 0 || sendAmount <= 0}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? '송금 중...' : <><Send size={20}/> 지금 송금하기</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
