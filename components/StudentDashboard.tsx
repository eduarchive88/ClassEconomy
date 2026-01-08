
import React, { useState, useEffect } from 'react';
import { 
  Wallet, Landmark, LineChart, ShoppingBag, Map, BrainCircuit, 
  TrendingUp, RefreshCcw, UserCircle, Send, CheckCircle2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { StockInfo, Student, EconomySettings } from '../types';

interface Props {
  studentId: string;
}

const StudentDashboard: React.FC<Props> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [student, setStudent] = useState<Student | null>(null);
  const [settings, setSettings] = useState<EconomySettings | null>(null);
  const [seatPrice, setSeatPrice] = useState(0);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    const { data: st } = await supabase.from('students').select('*').eq('id', studentId).single();
    if (st) {
      setStudent(st);
      const { data: setv } = await supabase.from('economy_settings').select('*').eq('teacher_id', st.teacher_id).single();
      const { data: allSt } = await supabase.from('students').select('balance, bank_balance, brokerage_balance').eq('teacher_id', st.teacher_id);
      
      if (setv) setSettings(setv);
      if (allSt) {
        const totalAssets = allSt.reduce((sum, s) => sum + s.balance + s.bank_balance + s.brokerage_balance, 0);
        setSeatPrice(Math.floor((totalAssets * 0.6) / allSt.length));
      }
    }
  };

  const [stocks] = useState<StockInfo[]>([
    { code: 'BTC', name: '비트코인', price: 98000000, change: 1.2, type: 'crypto' },
    { code: 'SAM', name: '삼성전자', price: 72000, change: 0.1, type: 'stock' },
    { code: 'TSLA', name: 'Tesla', price: 345000, change: 2.5, type: 'stock' },
    { code: 'NVDA', name: 'NVIDIA', price: 1250000, change: 4.8, type: 'stock' },
  ]);

  return (
    <div className="space-y-6">
      {student && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 mb-1">현금 통장</p>
            <div className="flex items-center justify-between"><h3 className="text-xl font-bold">{student.balance.toLocaleString()}원</h3><Wallet className="text-blue-500" size={20}/></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
            <p className="text-[10px] font-bold text-indigo-400 mb-1">은행 저축 (연 2%)</p>
            <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-indigo-600">{student.bank_balance.toLocaleString()}원</h3><Landmark className="text-indigo-500" size={20}/></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
            <p className="text-[10px] font-bold text-emerald-400 mb-1">증권 예수금</p>
            <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-emerald-600">{student.brokerage_balance.toLocaleString()}원</h3><LineChart className="text-emerald-500" size={20}/></div>
          </div>
        </div>
      )}

      <nav className="flex bg-white p-1 rounded-2xl border overflow-x-auto scrollbar-hide">
        {[
          { id: 'home', icon: <Wallet size={16}/>, label: '내 지갑' },
          { id: 'invest', icon: <TrendingUp size={16}/>, label: '투자' },
          { id: 'quiz', icon: <BrainCircuit size={16}/>, label: '퀴즈' },
          { id: 'market', icon: <ShoppingBag size={16}/>, label: '마켓' },
          { id: 'estate', icon: <Map size={16}/>, label: '부동산' },
          { id: 'profile', icon: <UserCircle size={16}/>, label: '내 정보' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="min-h-[400px]">
        {activeTab === 'home' && (
          <div className="bg-white p-8 rounded-2xl border space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">빠른 송금</h3>
              <Send className="text-slate-300" size={24}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <input type="text" placeholder="받는 학번 (예: 20102)" className="w-full p-4 bg-slate-50 rounded-xl border" />
                <input type="number" placeholder="보낼 금액" className="w-full p-4 bg-slate-50 rounded-xl border" />
                <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-indigo-600 transition-all">돈 보내기</button>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-dashed flex flex-col items-center justify-center text-slate-400">
                <RefreshCcw size={32} className="mb-2 opacity-20"/>
                <p className="text-sm font-medium">최근 거래 내역이 없습니다.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'estate' && (
          <div className="bg-white p-8 rounded-2xl border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2"><Map className="text-indigo-600"/> 교실 부동산 센터</h3>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">현재 실시간 시세</p>
                <p className="text-xl font-bold text-indigo-600">{seatPrice.toLocaleString()}원</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {Array.from({length: 20}).map((_, i) => (
                <div key={i} className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-2 relative group cursor-pointer hover:border-indigo-400 transition-all">
                  <span className="text-[10px] text-slate-400 font-bold">Seat {i+1}</span>
                  <div className="absolute inset-0 bg-indigo-600/90 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs font-bold">구매 요청</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-6 bg-amber-50 rounded-3xl border border-amber-100">
              <h4 className="font-bold text-amber-800 mb-2">부동산 구매 규칙</h4>
              <ul className="text-amber-700 text-xs space-y-1 list-disc ml-4">
                <li>자리 값은 학급 전체 자산의 유동성에 따라 실시간 변동됩니다.</li>
                <li>구매 요청 시 교사의 승인이 필요합니다. (자동 승인 제외)</li>
                <li>거래 대금의 10%는 국세로 차감되며, 90%가 이전 주인에게 전달됩니다.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'invest' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">투자 센터</h3>
                <a href="https://www.google.com/finance" target="_blank" className="text-xs text-indigo-600 font-bold hover:underline">Google Finance 바로가기</a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stocks.map(s => (
                  <div key={s.code} className="p-4 border rounded-2xl hover:shadow-lg transition-all">
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded">{s.type}</span>
                      <span className={`text-xs font-bold ${s.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{s.change}%</span>
                    </div>
                    <p className="font-bold">{s.name}</p>
                    <p className="text-lg font-black">{s.price.toLocaleString()}원</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
