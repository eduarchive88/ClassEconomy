
import React, { useState, useEffect } from 'react';
import { 
  Wallet, Landmark, LineChart, ShoppingBag, Send, History, HelpCircle, 
  CheckCircle2, TrendingUp, Package, ArrowRightLeft, Layout, Newspaper, 
  Sparkles, ExternalLink, Lock, Settings, Plus
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getMarketData, getEconomyNews, summarizeNews } from '../services/geminiService';
import { Student, Transaction, Quiz, EconomySettings, Seat } from '../types';

interface Props { studentId: string; }

const StudentDashboard: React.FC<Props> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState('transfer'); 
  const [student, setStudent] = useState<Student | null>(null);
  const [friends, setFriends] = useState<Student[]>([]);
  const [sessionSettings, setSessionSettings] = useState<EconomySettings | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [totalEconomyAsset, setTotalEconomyAsset] = useState(0);
  const [news, setNews] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ [key: string]: string }>({});
  const [marketData, setMarketData] = useState<{ stocks: any[], coins: any[] }>({ stocks: [], coins: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchStudentData(); }, [studentId, activeTab]);

  useEffect(() => {
    if (activeTab === 'invest') {
      getMarketData().then(setMarketData);
      getEconomyNews().then(setNews);
    }
  }, [activeTab]);

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
      }
    }
  };

  const currentSeatPrice = Math.floor((totalEconomyAsset * 0.6) / (friends.length + 1) || 5000);

  const handleBuySeat = async (seat: Seat) => {
    if (!student || student.balance < currentSeatPrice) return alert('현금이 부족합니다.');
    if (seat.owner_id === studentId) return alert('이미 본인의 자리입니다.');
    
    const label = seat.owner_name ? `${seat.owner_name}님의 자리를 ${currentSeatPrice.toLocaleString()}원에 구매하시겠습니까?` : `빈 자리를 ${currentSeatPrice.toLocaleString()}원에 구매하시겠습니까?`;
    if (!confirm(label)) return;

    setIsLoading(true);
    try {
      if (sessionSettings?.auto_approve_estate) {
        // 즉시 구매 로직
        const sellerId = seat.owner_id || 'GOVERNMENT';
        const fee = Math.floor(currentSeatPrice * 0.1);
        const profit = currentSeatPrice - fee;

        await supabase.from('students').update({ balance: student.balance - currentSeatPrice }).eq('id', studentId);
        if (seat.owner_id) {
          const { data: seller } = await supabase.from('students').select('balance').eq('id', seat.owner_id).single();
          await supabase.from('students').update({ balance: (seller?.balance || 0) + profit }).eq('id', seat.owner_id);
        }

        await supabase.from('seats').update({ owner_id: studentId, owner_name: student.name, status: 'sold', price_at_buy: currentSeatPrice }).eq('id', seat.id);
        await supabase.from('transactions').insert({
          session_code: student.session_code, sender_id: studentId, sender_name: student.name,
          receiver_id: sellerId, receiver_name: seat.owner_name || '정부', amount: currentSeatPrice, type: 'real_estate', description: '자리(부동산) 구매'
        });

        // fetchData -> fetchStudentData 로 수정
        alert('자리 구매가 완료되었습니다!'); fetchStudentData();
      } else {
        alert('이 학급은 교사 승인이 필요합니다. (데모 버전에서는 자동 승인 모드를 추천합니다)');
      }
    } catch (e) { alert('구매 중 오류'); }
    finally { setIsLoading(false); }
  };

  const handleSummarize = async (item: any) => {
    if (!sessionSettings) return;
    setIsLoading(true);
    const text = await summarizeNews(item.title, sessionSettings.school_level);
    setSummary(prev => ({ ...prev, [item.title]: text }));
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {student && (
        <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-10">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">내 지갑(현금)</p>
              <h3 className="text-3xl font-black">{student.balance.toLocaleString()}원</h3>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">은행 잔고</p>
              <h3 className="text-3xl font-black">{student.bank_balance.toLocaleString()}원</h3>
            </div>
          </div>
          <div className="bg-white/10 px-6 py-4 rounded-3xl backdrop-blur-md border border-white/20">
            <p className="text-[10px] font-black uppercase text-indigo-200 mb-1">오늘의 부동산 시세</p>
            <p className="text-xl font-black">₩{currentSeatPrice.toLocaleString()}</p>
          </div>
        </div>
      )}

      <nav className="flex bg-white p-2 rounded-3xl border shadow-sm sticky top-20 z-40 overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'transfer', label: '송금', icon: <Send size={18}/> },
          { id: 'estate', label: '부동산', icon: <Layout size={18}/> },
          { id: 'invest', label: '증권/뉴스', icon: <LineChart size={18}/> },
          { id: 'market', label: '상점', icon: <ShoppingBag size={18}/> },
          { id: 'quiz', label: '일일퀴즈', icon: <HelpCircle size={18}/> },
          { id: 'settings', label: '설정', icon: <Settings size={18}/> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-[100px] py-4 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-1 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      <div className="transition-all duration-300">
        {activeTab === 'estate' && (
          <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
             <div className="text-center mb-10">
               <h2 className="text-3xl font-black text-slate-800">교실 부동산 시장</h2>
               <p className="text-slate-400 font-medium">우리 반 자산 가치에 따라 좌석 가격이 실시간으로 변동됩니다.</p>
             </div>
             
             <div className="grid grid-cols-6 gap-4 max-w-4xl mx-auto p-8 bg-slate-50 rounded-[3.5rem] border-4 border-white shadow-inner">
               {seats.map(seat => (
                 <button 
                  key={seat.id} 
                  onClick={() => handleBuySeat(seat)}
                  disabled={isLoading || seat.owner_id === studentId}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all group relative overflow-hidden ${seat.owner_id === studentId ? 'bg-indigo-600 border-indigo-600 shadow-xl' : seat.status === 'sold' ? 'bg-white border-slate-100 hover:border-indigo-400' : 'bg-white/50 border-dashed border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'}`}
                 >
                   {seat.owner_id === studentId ? (
                     <>
                       <div className="bg-white/20 p-2 rounded-xl text-white mb-1"><CheckCircle2 size={16}/></div>
                       <span className="text-[10px] font-black text-white">나의 자리</span>
                     </>
                   ) : seat.owner_name ? (
                     <>
                       <div className="bg-slate-100 text-slate-400 p-2 rounded-xl mb-1 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors"><Layout size={16}/></div>
                       <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600">{seat.owner_name}</span>
                     </>
                   ) : (
                     <Plus size={20} className="text-slate-200 group-hover:text-emerald-500 transition-colors"/>
                   )}
                   <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                 </button>
               ))}
             </div>
             
             <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">현재 시장가</p>
                  <p className="text-2xl font-black text-indigo-600">₩{currentSeatPrice.toLocaleString()}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">시장 참여자</p>
                  <p className="text-2xl font-black text-slate-800">{friends.length + 1}명</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">총 통화량</p>
                  <p className="text-2xl font-black text-emerald-600">₩{totalEconomyAsset.toLocaleString()}</p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'invest' && (
          <div className="space-y-6">
            <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
              <div className="flex items-center gap-3 mb-8"><Newspaper className="text-indigo-600"/><h2 className="text-2xl font-black">오늘의 경제 브리핑</h2></div>
              <div className="space-y-4">
                {news.map((item, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all space-y-3">
                    <h4 className="text-lg font-black text-slate-800">{item.title}</h4>
                    {summary[item.title] ? (
                      <div className="p-5 bg-indigo-50/50 rounded-2xl text-sm text-indigo-900 leading-relaxed font-medium border border-indigo-100">
                        <Sparkles size={16} className="text-indigo-600 mb-2"/>
                        {summary[item.title]}
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <button onClick={() => handleSummarize(item)} disabled={isLoading} className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm border border-indigo-50 hover:bg-indigo-50 transition-all flex items-center gap-2">
                        {isLoading ? '분석 중...' : <><Sparkles size={14}/> AI 요약 보기</>}
                      </button>
                      <a href={item.url} target="_blank" rel="noreferrer" className="bg-white text-slate-400 px-4 py-2 rounded-xl text-xs font-black shadow-sm border border-slate-100 hover:text-slate-600 transition-all flex items-center gap-2">
                        <ExternalLink size={14}/> 원본 뉴스
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-10 rounded-[3rem] border shadow-sm max-w-2xl mx-auto text-center space-y-10">
            <div className="p-6 bg-rose-50 text-rose-600 rounded-[2.5rem] w-fit mx-auto shadow-xl shadow-rose-50"><Lock size={48}/></div>
            <h2 className="text-3xl font-black text-slate-800">계정 보안 설정</h2>
            <p className="text-slate-400 font-medium">자신의 비밀번호를 설정하여 자산을 안전하게 보호하세요.</p>
            
            <div className="space-y-4 text-left max-w-sm mx-auto">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1">New Password</label>
                 <input type="password" id="new_pw" placeholder="새 비밀번호 입력" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-center" />
               </div>
               <button onClick={async () => {
                 const el = document.getElementById('new_pw') as HTMLInputElement;
                 if(!el.value) return;
                 await supabase.from('students').update({ password: el.value }).eq('id', studentId);
                 alert('비밀번호가 변경되었습니다.'); el.value = '';
               }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-100">비밀번호 변경 완료</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
