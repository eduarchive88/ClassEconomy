
import React, { useState, useEffect } from 'react';
import { 
  Wallet, Landmark, LineChart, ShoppingBag, Send, History, HelpCircle, 
  CheckCircle2, TrendingUp, Package, ArrowRightLeft, Layout, Newspaper, 
  Sparkles, ExternalLink, Lock, Settings, Plus, Clock, AlertCircle
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getMarketData, getEconomyNews, summarizeNews } from '../services/geminiService';
import { Student, Transaction, Quiz, EconomySettings, Seat, MarketItem } from '../types';

interface Props { studentId: string; }

const StudentDashboard: React.FC<Props> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState('transfer'); 
  const [student, setStudent] = useState<Student | null>(null);
  const [friends, setFriends] = useState<Student[]>([]);
  const [sessionSettings, setSessionSettings] = useState<EconomySettings | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [totalEconomyAsset, setTotalEconomyAsset] = useState(0);
  const [news, setNews] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchStudentData(); }, [studentId, activeTab]);

  const fetchStudentData = async () => {
    const { data: st } = await supabase.from('students').select('*').eq('id', studentId).single();
    if (st) {
      setStudent(st);
      const { data: setts } = await supabase.from('economy_settings').select('*').eq('session_code', st.session_code).single();
      if (setts) setSessionSettings(setts);
      
      const { data: allSts } = await supabase.from('students').select('*').eq('session_code', st.session_code);
      if (allSts) {
        setFriends(allSts.filter(f => f.id !== studentId));
        const total = allSts.reduce((acc, curr) => acc + (curr.balance + curr.bank_balance + curr.brokerage_balance), 0);
        setTotalEconomyAsset(total);
      }

      if (activeTab === 'estate') {
        const { data: stData } = await supabase.from('seats').select('*').eq('session_code', st.session_code).order('row_idx').order('col_idx');
        if (stData) setSeats(stData);
      } else if (activeTab === 'market') {
        const { data: mData } = await supabase.from('market_items').select('*').eq('teacher_id', st.teacher_id);
        if (mData) setMarketItems(mData);
      }
    }
  };

  // 부동산 가격 알고리즘: (총 학생 자산 * 60%) / 학생 수
  const currentSeatPrice = Math.floor((totalEconomyAsset * 0.6) / (friends.length + 1) || 5000);

  const handleBuySeat = async (seat: Seat) => {
    if (!student || student.balance < currentSeatPrice) return alert('현금이 부족합니다.');
    if (seat.owner_id === studentId) return alert('이미 본인의 자리입니다.');
    if (seat.status === 'pending') return alert('현재 거래 승인 대기 중인 자리입니다.');
    
    if (!confirm(`이 자리를 ${currentSeatPrice.toLocaleString()}원에 구매하시겠습니까?`)) return;

    setIsLoading(true);
    try {
      const isAuto = sessionSettings?.auto_approve_estate;
      
      if (isAuto) {
        // 즉시 구매 로직: 10% 수수료 환수, 90% 판매자 송금
        const fee = Math.floor(currentSeatPrice * 0.1);
        const sellerAmount = currentSeatPrice - fee;
        const sellerId = seat.owner_id || 'GOVERNMENT';

        // 1. 구매자 잔액 차감
        await supabase.from('students').update({ balance: student.balance - currentSeatPrice }).eq('id', studentId);

        // 2. 판매자 잔액 증액 (주인이 있을 경우만)
        if (seat.owner_id) {
          const { data: seller } = await supabase.from('students').select('balance').eq('id', seat.owner_id).single();
          await supabase.from('students').update({ balance: (seller?.balance || 0) + sellerAmount }).eq('id', seat.owner_id);
        }

        // 3. 자리 정보 업데이트
        await supabase.from('seats').update({ 
          owner_id: studentId, owner_name: student.name, status: 'sold', price_at_buy: currentSeatPrice 
        }).eq('id', seat.id);

        // 4. 트랜잭션 기록
        await supabase.from('transactions').insert({
          session_code: student.session_code, sender_id: studentId, sender_name: student.name,
          receiver_id: sellerId, receiver_name: seat.owner_name || '정부', amount: currentSeatPrice, 
          type: 'real_estate', description: `좌석 구매 (세금 ${fee}원 제외 ${sellerAmount}원 송금)`
        });

        alert('즉시 구매가 완료되었습니다!');
      } else {
        // 승인 대기 로직: 돈은 미리 차감(Escrow)
        await supabase.from('students').update({ balance: student.balance - currentSeatPrice }).eq('id', studentId);
        await supabase.from('seats').update({ 
          owner_id: studentId, owner_name: student.name, status: 'pending', price_at_buy: currentSeatPrice 
        }).eq('id', seat.id);
        alert('구매 요청을 보냈습니다. 선생님의 승인을 기다려 주세요.');
      }
      fetchStudentData();
    } catch (e) { alert('처리 중 오류 발생'); }
    finally { setIsLoading(false); }
  };

  const handleBuyMarketItem = async (item: MarketItem) => {
    if (!student || student.balance < item.price) return alert('현금이 부족합니다.');
    if (item.quantity <= 0) return alert('품절된 물품입니다.');
    
    if (!confirm(`${item.name}을(를) ${item.price.toLocaleString()}원에 구매하시겠습니까?`)) return;

    setIsLoading(true);
    try {
      // 1. 학생 돈 차감
      await supabase.from('students').update({ balance: student.balance - item.price }).eq('id', studentId);
      // 2. 물품 수량 차감
      await supabase.from('market_items').update({ quantity: item.quantity - 1 }).eq('id', item.id);
      // 3. 기록
      await supabase.from('transactions').insert({
        session_code: student.session_code, sender_id: studentId, sender_name: student.name,
        receiver_id: 'MARKET', receiver_name: '학급 상점', amount: item.price, type: 'market', description: `${item.name} 구매`
      });
      alert(`${item.name} 구매 완료!`);
      fetchStudentData();
    } catch (e) { alert('구매 실패'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="space-y-6 pb-20">
      {student && (
        <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-10">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">사용 가능 현금</p>
              <h3 className="text-3xl font-black">{student.balance.toLocaleString()}원</h3>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">총 자산</p>
              <h3 className="text-3xl font-black">{(student.balance + student.bank_balance + student.brokerage_balance).toLocaleString()}원</h3>
            </div>
          </div>
          <div className="bg-white/10 px-6 py-4 rounded-3xl backdrop-blur-md border border-white/20 flex items-center gap-3">
            <TrendingUp size={20} className="text-emerald-400"/>
            <div>
              <p className="text-[10px] font-black uppercase text-indigo-200">현재 좌석 시세</p>
              <p className="text-xl font-black">₩{currentSeatPrice.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex bg-white p-2 rounded-3xl border shadow-sm sticky top-20 z-40 overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'transfer', label: '송금', icon: <Send size={18}/> },
          { id: 'estate', label: '부동산', icon: <Layout size={18}/> },
          { id: 'market', label: '상점', icon: <ShoppingBag size={18}/> },
          { id: 'invest', label: '증권/뉴스', icon: <LineChart size={18}/> },
          { id: 'quiz', label: '일일퀴즈', icon: <HelpCircle size={18}/> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-[100px] py-4 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-1 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      <div className="transition-all duration-300">
        {activeTab === 'market' && (
          <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
             <div className="text-center mb-10">
               <h2 className="text-3xl font-black text-slate-800">학급 상점</h2>
               <p className="text-slate-400 font-medium">선생님이 등록하신 물품을 현금으로 구매할 수 있습니다.</p>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {marketItems.map(item => (
                 <div key={item.id} className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between ${item.quantity > 0 ? 'bg-white border-slate-100 hover:border-indigo-500 hover:shadow-xl' : 'bg-slate-50 border-transparent opacity-60'}`}>
                   <div>
                     <div className="bg-indigo-50 text-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-6"><Package size={24}/></div>
                     <h3 className="text-xl font-black text-slate-800 mb-1">{item.name}</h3>
                     <p className="text-sm font-bold text-indigo-600 mb-4">{item.price.toLocaleString()}원</p>
                   </div>
                   <div>
                     <p className="text-xs font-bold text-slate-400 mb-4">재고: {item.quantity}개</p>
                     <button 
                       disabled={isLoading || item.quantity <= 0}
                       onClick={() => handleBuyMarketItem(item)}
                       className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${item.quantity > 0 ? 'bg-slate-900 text-white hover:bg-indigo-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                     >
                       {item.quantity > 0 ? '구매하기' : '품절'}
                     </button>
                   </div>
                 </div>
               ))}
               {marketItems.length === 0 && <p className="col-span-full text-center py-20 text-slate-400 font-medium">현재 판매 중인 물품이 없습니다.</p>}
             </div>
          </div>
        )}

        {activeTab === 'estate' && (
          <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
             <div className="text-center mb-10">
               <h2 className="text-3xl font-black text-slate-800">좌석 거래소</h2>
               <p className="text-slate-400 font-medium">인플레이션이 반영된 시세로 자리를 사고팔 수 있습니다.</p>
             </div>
             
             <div className="grid grid-cols-6 gap-3 max-w-2xl mx-auto p-8 bg-slate-50 rounded-[3.5rem] border-4 border-white shadow-inner mb-10">
               {seats.map(seat => (
                 <button 
                  key={seat.id} 
                  onClick={() => handleBuySeat(seat)}
                  disabled={isLoading || seat.owner_id === studentId || seat.status === 'pending'}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all group relative ${seat.owner_id === studentId ? 'bg-indigo-600 border-indigo-600' : seat.status === 'pending' ? 'bg-amber-100 border-amber-400 cursor-wait' : 'bg-white border-slate-100 hover:border-indigo-400'}`}
                 >
                   {seat.status === 'pending' ? (
                     <Clock size={16} className="text-amber-600 animate-spin"/>
                   ) : seat.owner_id === studentId ? (
                     <CheckCircle2 size={16} className="text-white"/>
                   ) : seat.owner_name ? (
                     <span className="text-[10px] font-black text-slate-800">{seat.owner_name[0]}</span>
                   ) : (
                     <Plus size={16} className="text-slate-200 group-hover:text-indigo-600"/>
                   )}
                   <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black bg-white px-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                     {seat.owner_name || 'Empty'}
                   </span>
                 </button>
               ))}
             </div>
             
             <div className="max-w-xl mx-auto p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-start gap-4">
               <AlertCircle size={24} className="text-indigo-600 shrink-0 mt-1"/>
               <div className="text-sm leading-relaxed text-indigo-900">
                 <p className="font-black mb-1">부동산 거래 규칙</p>
                 <ul className="list-disc ml-4 space-y-1 font-medium text-xs opacity-80">
                   <li>구매 금액의 <strong>10%는 세금</strong>으로 차감되며, 나머지 90%가 이전 주인에게 송금됩니다.</li>
                   <li>주인이 없는 자리를 구매할 때는 전액 정부로 귀속됩니다.</li>
                   <li>현재 학급은 <strong>{sessionSettings?.auto_approve_estate ? '자동 거래' : '선생님 승인 후 거래'}</strong> 모드입니다.</li>
                 </ul>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
