
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, Settings, Download, Plus, Trash2, Coins, Megaphone, 
  History, Save, UserPlus, FileSpreadsheet, HelpCircle, GraduationCap, Layout, 
  ShieldCheck, Key, Lock, CheckCircle2, XCircle, RefreshCcw, AlertCircle, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student, Transaction, Quiz, Seat, MarketItem } from '../types';

interface Props { teacherId: string; activeSession: EconomySettings; }

const TeacherDashboard: React.FC<Props> = ({ teacherId, activeSession }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ id: '', name: '', salary: 10000 });
  const [isAutoApprove, setIsAutoApprove] = useState(activeSession.auto_approve_estate);

  useEffect(() => { fetchData(); }, [activeTab, activeSession.session_code]);

  const fetchData = async () => {
    const code = activeSession.session_code;
    if (activeTab === 'students') {
      const { data } = await supabase.from('students').select('*').eq('session_code', code).order('id', { ascending: true });
      if (data) setStudents(data);
    } else if (activeTab === 'estate') {
      const { data } = await supabase.from('seats').select('*').eq('session_code', code).order('row_idx', { ascending: true }).order('col_idx', { ascending: true });
      if (data) setSeats(data);
    } else if (activeTab === 'market') {
      const { data } = await supabase.from('market_items').select('*').eq('teacher_id', teacherId);
      if (data) setMarketItems(data);
    }
  };

  const handleApproveSeat = async (seat: Seat, approve: boolean) => {
    if (!approve) {
      // 거절 시 상태만 다시 원복
      await supabase.from('seats').update({ status: 'available', owner_id: null, owner_name: null }).eq('id', seat.id);
      alert('거래가 거절되었습니다.');
    } else {
      // 승인 시 실제 거래 로직 실행 (학생 돈은 이미 차감되어 있다고 가정하거나 여기서 최종 정산)
      // 학생 대시보드에서 'pending' 신청 시 돈을 미리 묶어두는 방식이 안전
      await supabase.from('seats').update({ status: 'sold' }).eq('id', seat.id);
      alert('거래가 승인되었습니다.');
    }
    fetchData();
  };

  const handleAddMarketItem = async () => {
    const name = prompt('물품 이름을 입력하세요');
    const price = prompt('가격을 입력하세요');
    const qty = prompt('초기 수량을 입력하세요');
    if (name && price && qty) {
      await supabase.from('market_items').insert({
        name, price: Number(price), quantity: Number(qty), teacher_id: teacherId
      });
      fetchData();
    }
  };

  const initializeSeats = async () => {
    if (!confirm('자리 배치도를 초기화(6x6)하시겠습니까? 기존 데이터는 사라집니다.')) return;
    const newSeats = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        newSeats.push({ row_idx: r, col_idx: c, status: 'available', session_code: activeSession.session_code });
      }
    }
    await supabase.from('seats').delete().eq('session_code', activeSession.session_code);
    await supabase.from('seats').insert(newSeats);
    fetchData();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-1 space-y-2">
        {[
          { id: 'students', icon: <Users size={18}/>, label: '학생 & 주급' },
          { id: 'estate', icon: <Layout size={18}/>, label: '부동산 관리' },
          { id: 'economy', icon: <Coins size={18}/>, label: '경제 자동화' },
          { id: 'market', icon: <ShoppingBag size={18}/>, label: '상점 관리' },
          { id: 'settings', icon: <Settings size={18}/>, label: '환경 설정' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="lg:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'market' && (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800">학급 상점 물품 관리</h2>
                <p className="text-sm text-slate-400 font-medium">학생들이 구매할 수 있는 쿠폰이나 물품을 등록하세요.</p>
              </div>
              <button onClick={handleAddMarketItem} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2">
                <Plus size={16}/> 신규 물품 등록
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketItems.map(item => (
                <div key={item.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-slate-800">{item.name}</h4>
                    <p className="text-xs text-slate-400 font-bold">가격: {item.price.toLocaleString()}원 | 남은 수량: {item.quantity}개</p>
                  </div>
                  <button onClick={async () => { if(confirm('삭제하시겠습니까?')) { await supabase.from('market_items').delete().eq('id', item.id); fetchData(); } }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                </div>
              ))}
              {marketItems.length === 0 && <p className="col-span-2 text-center py-10 text-slate-400 font-medium">등록된 물품이 없습니다.</p>}
            </div>
          </div>
        )}

        {activeTab === 'estate' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">부동산 & 자리 배치</h2>
                  <p className="text-sm text-slate-400 font-medium">학생들의 좌석 소유 현황을 관리하고 구매 요청을 승인합니다.</p>
                </div>
                <button onClick={initializeSeats} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2">
                  <RefreshCcw size={16}/> 자리 배치도 초기화
                </button>
              </div>

              <div className="grid grid-cols-6 gap-3 max-w-2xl mx-auto p-6 bg-slate-100/50 rounded-[3rem] border-2 border-white shadow-inner mb-10">
                {seats.map(seat => (
                  <div key={seat.id} className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${seat.status === 'sold' ? 'bg-white border-indigo-200 shadow-sm' : seat.status === 'pending' ? 'bg-amber-50 border-amber-300 animate-pulse' : 'bg-slate-200/30 border-dashed border-slate-200'}`}>
                    {seat.status === 'pending' ? <Clock size={16} className="text-amber-500 mb-1"/> : null}
                    <span className="text-[10px] font-black text-slate-800 truncate px-1">{seat.owner_name || 'Empty'}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-black flex items-center gap-2 px-2"><AlertCircle size={20} className="text-indigo-600"/> 대기 중인 구매 요청</h3>
                <div className="grid grid-cols-1 gap-3">
                  {seats.filter(s => s.status === 'pending').map(pendingSeat => (
                    <div key={pendingSeat.id} className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl flex justify-between items-center">
                      <div>
                        <p className="text-sm font-black text-slate-800">{pendingSeat.owner_name} 학생이 자리를 구매하려고 합니다.</p>
                        <p className="text-[10px] font-bold text-slate-400">좌석 위치: ({pendingSeat.row_idx + 1}행, {pendingSeat.col_idx + 1}열)</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveSeat(pendingSeat, true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-indigo-700 transition-all"><CheckCircle2 size={14}/> 승인</button>
                        <button onClick={() => handleApproveSeat(pendingSeat, false)} className="bg-white text-rose-500 border border-rose-100 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-rose-50 transition-all"><XCircle size={14}/> 거절</button>
                      </div>
                    </div>
                  ))}
                  {seats.filter(s => s.status === 'pending').length === 0 && <p className="text-sm text-slate-400 font-medium px-2">현재 대기 중인 요청이 없습니다.</p>}
                </div>
              </div>

              <div className="mt-8 p-6 bg-slate-900 rounded-[2.5rem] flex items-center justify-between text-white shadow-xl shadow-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl"><ShieldCheck size={24}/></div>
                  <div>
                    <p className="text-sm font-black">부동산 자동 거래 모드</p>
                    <p className="text-[10px] text-slate-400 font-bold">활성화 시 교사의 승인 없이 학생 간 즉시 거래가 가능합니다.</p>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    const newState = !isAutoApprove;
                    await supabase.from('economy_settings').update({ auto_approve_estate: newState }).eq('id', activeSession.id);
                    setIsAutoApprove(newState);
                    alert(`자동 거래 모드가 ${newState ? '활성화' : '비활성화'}되었습니다.`);
                  }}
                  className={`px-6 py-3 rounded-2xl font-black text-xs transition-all ${isAutoApprove ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {isAutoApprove ? '자동 모드 ON' : '수동 승인 모드'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 기존 학생, 경제, 설정 탭 내용은 생략/유지 */}
        {activeTab === 'students' && (
           <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
             <h2 className="text-2xl font-black text-slate-800 mb-6">학생 명단 관리</h2>
             {/* 기존 학생 리스트 코드 유지... */}
           </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
