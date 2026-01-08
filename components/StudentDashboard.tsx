
import React, { useState, useEffect } from 'react';
import { 
  Wallet, Landmark, LineChart, ShoppingBag, Map, BrainCircuit, 
  TrendingUp, RefreshCcw, UserCircle, Send, CheckCircle2, ShoppingCart
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { StockInfo, Student, EconomySettings, MarketItem, Quiz } from '../types';

interface Props {
  studentId: string;
}

const StudentDashboard: React.FC<Props> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [student, setStudent] = useState<Student | null>(null);
  const [settings, setSettings] = useState<EconomySettings | null>(null);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [seatPrice, setSeatPrice] = useState(0);

  useEffect(() => {
    fetchStudentData();
    if (activeTab === 'market') fetchMarketItems();
  }, [studentId, activeTab]);

  const fetchStudentData = async () => {
    const { data: st } = await supabase.from('students').select('*').eq('id', studentId).single();
    if (st) {
      setStudent(st);
      const { data: setv } = await supabase.from('economy_settings').select('*').eq('teacher_id', st.teacher_id).single();
      const { data: allSt } = await supabase.from('students').select('balance, bank_balance, brokerage_balance').eq('teacher_id', st.teacher_id);
      
      if (setv) setSettings(setv);
      if (allSt) {
        const totalAssets = allSt.reduce((sum, s) => sum + s.balance + s.bank_balance + s.brokerage_balance, 0);
        setSeatPrice(Math.floor((totalAssets * 0.6) / allSt.length) || 1000);
      }
    }
  };

  const fetchMarketItems = async () => {
    if (!student) return;
    const { data } = await supabase.from('market_items').select('*').eq('teacher_id', student.teacher_id);
    if (data) setMarketItems(data);
  };

  const buyItem = async (item: MarketItem) => {
    if (!student || student.balance < item.price) return alert('잔액이 부족합니다.');
    if (!confirm(`${item.name}을(를) ${item.price}원에 구매하시겠습니까?`)) return;
    
    // 학생 잔액 차감
    await supabase.from('students').update({ balance: student.balance - item.price }).eq('id', student.id);
    alert('구매가 완료되었습니다!');
    fetchStudentData();
  };

  const requestSeat = async (seatId: number) => {
    if (!student || student.balance < seatPrice) return alert('잔액이 부족합니다.');
    if (!confirm(`좌석 #${seatId}를 ${seatPrice}원에 구매 신청하시겠습니까? (교사 승인 필요)`)) return;

    await supabase.from('seats').upsert({
      id: seatId,
      teacher_id: student.teacher_id,
      pending_buyer_id: student.id,
      status: 'pending'
    });
    alert('신청되었습니다. 교사의 승인을 기다려주세요.');
  };

  return (
    <div className="space-y-6">
      {student && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">현금 통장</p>
            <div className="flex items-center justify-between"><h3 className="text-xl font-bold">{student.balance.toLocaleString()}원</h3><Wallet className="text-blue-500" size={20}/></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
            <p className="text-[10px] font-bold text-indigo-400 mb-1 uppercase tracking-wider">은행 저축 (연 2%)</p>
            <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-indigo-600">{student.bank_balance.toLocaleString()}원</h3><Landmark className="text-indigo-500" size={20}/></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
            <p className="text-[10px] font-bold text-emerald-400 mb-1 uppercase tracking-wider">증권 예수금</p>
            <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-emerald-600">{student.brokerage_balance.toLocaleString()}원</h3><LineChart className="text-emerald-500" size={20}/></div>
          </div>
        </div>
      )}

      <nav className="flex bg-white p-1 rounded-2xl border overflow-x-auto scrollbar-hide sticky top-20 z-40">
        {[
          { id: 'home', icon: <Wallet size={16}/>, label: '내 지갑' },
          { id: 'invest', icon: <TrendingUp size={16}/>, label: '투자' },
          { id: 'quiz', icon: <BrainCircuit size={16}/>, label: '퀴즈' },
          { id: 'market', icon: <ShoppingBag size={16}/>, label: '마켓' },
          { id: 'estate', icon: <Map size={16}/>, label: '부동산' },
          { id: 'profile', icon: <UserCircle size={16}/>, label: '내 정보' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all text-sm whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="min-h-[400px]">
        {activeTab === 'market' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketItems.map(item => (
              <div key={item.id} className="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4"><ShoppingBag size={24}/></div>
                <h3 className="text-lg font-bold mb-1">{item.name}</h3>
                <p className="text-indigo-600 font-black mb-4">{item.price.toLocaleString()}원</p>
                <button onClick={() => buyItem(item)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors"><ShoppingCart size={18}/> 구매하기</button>
              </div>
            ))}
            {marketItems.length === 0 && <p className="col-span-full text-center py-20 text-slate-400">마켓에 등록된 물건이 없습니다.</p>}
          </div>
        )}

        {activeTab === 'home' && (
          <div className="bg-white p-8 rounded-2xl border space-y-8">
            <h3 className="text-xl font-bold flex items-center gap-2"><Send size={20}/> 친구에게 송금</h3>
            <div className="max-w-md space-y-4">
              <input type="text" placeholder="친구 학번" className="w-full p-4 bg-slate-50 border rounded-2xl" />
              <input type="number" placeholder="보낼 금액" className="w-full p-4 bg-slate-50 border rounded-2xl" />
              <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold">보내기</button>
            </div>
          </div>
        )}

        {activeTab === 'estate' && (
          <div className="bg-white p-8 rounded-2xl border">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold">교실 좌석 배치도</h3>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold">현재 좌석 시세</p>
                <p className="text-xl font-black text-indigo-600">{seatPrice.toLocaleString()}원</p>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {Array.from({length: 32}).map((_, i) => (
                <button key={i} onClick={() => requestSeat(i+1)} className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all">
                  #{i+1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
