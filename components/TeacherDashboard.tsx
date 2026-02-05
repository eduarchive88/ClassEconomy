
import React, { useState, useEffect } from 'react';
import { 
  Users, ShoppingBag, Settings, Plus, Trash2, Coins, Layout, 
  ShieldCheck, Key, CheckCircle2, XCircle, RefreshCcw, AlertCircle, Clock, Edit3, UserPlus, Save,
  TrendingUp, Wallet, HandCoins, AlertOctagon, UserCheck
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student, MarketItem, Seat } from '../types';

interface Props { teacherId: string; activeSession: EconomySettings; }

const TeacherDashboard: React.FC<Props> = ({ teacherId, activeSession }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  
  // Selection State for Economy Tab
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // UI States
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '' });
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newSt, setNewSt] = useState({ id: '', name: '', salary: 10000 });
  const [assignTargetSeat, setAssignTargetSeat] = useState<Seat | null>(null);

  // Economy Actions State
  const [economyAction, setEconomyAction] = useState<{ amount: number; description: string }>({ amount: 0, description: '' });

  // Settings State
  const [classInfo, setClassInfo] = useState({
    class_name: activeSession.class_name,
    session_code: activeSession.session_code,
    school_level: activeSession.school_level,
    auto_approve_estate: activeSession.auto_approve_estate
  });

  useEffect(() => { fetchData(); }, [activeTab, activeSession.session_code]);

  const fetchData = async () => {
    const code = activeSession.session_code;
    try {
      if (activeTab === 'students' || activeTab === 'economy') {
        const { data } = await supabase.from('students').select('*').eq('session_code', code).order('id', { ascending: true });
        if (data) setStudents(data);
      } else if (activeTab === 'estate') {
        const { data: sData } = await supabase.from('seats').select('*').eq('session_code', code).order('row_idx', { ascending: true }).order('col_idx', { ascending: true });
        if (sData) setSeats(sData);
        const { data: stData } = await supabase.from('students').select('*').eq('session_code', code);
        if (stData) setStudents(stData || []);
      } else if (activeTab === 'market') {
        const { data } = await supabase.from('market_items').select('*').eq('teacher_id', teacherId);
        if (data) setMarketItems(data);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const handleBulkSalaryUpdate = async () => {
    const amount = Number(prompt('설정할 새로운 일괄 주급 금액을 입력하세요 (원):'));
    if (isNaN(amount) || amount < 0) return alert('유효한 금액을 입력해주세요.');
    
    if (confirm(`모든 학생의 주급을 ${amount.toLocaleString()}원으로 변경하시겠습니까?`)) {
      const { error } = await supabase.from('students').update({ salary: amount }).eq('session_code', activeSession.session_code);
      if (error) alert('수정 실패: ' + error.message);
      else {
        alert('주급이 일괄 수정되었습니다.');
        fetchData();
      }
    }
  };

  const processEconomyAction = async (type: 'reward' | 'fine', target: 'all' | 'selected') => {
    const targetIds = target === 'all' ? students.map(s => s.id) : selectedIds;
    if (targetIds.length === 0) return alert('대상 학생을 선택해주세요.');
    if (economyAction.amount <= 0) return alert('금액을 입력해주세요.');

    const isReward = type === 'reward';
    const finalAmount = isReward ? economyAction.amount : -economyAction.amount;
    const actionLabel = isReward ? '수당 지급' : '범칙금 부과';

    if (!confirm(`${targetIds.length}명의 학생에게 ${economyAction.amount.toLocaleString()}원을 ${actionLabel}하시겠습니까?`)) return;

    try {
      for (const id of targetIds) {
        const student = students.find(s => s.id === id);
        if (!student) continue;

        // Update balance
        await supabase.from('students').update({ balance: student.balance + finalAmount }).eq('id', id);

        // Record transaction
        await supabase.from('transactions').insert({
          session_code: activeSession.session_code,
          sender_id: isReward ? 'GOVERNMENT' : id,
          sender_name: isReward ? '정부' : student.name,
          receiver_id: isReward ? id : 'GOVERNMENT',
          receiver_name: isReward ? student.name : '정부',
          amount: economyAction.amount,
          type: isReward ? 'reward' : 'fine',
          description: economyAction.description || actionLabel
        });
      }
      alert('처리가 완료되었습니다.');
      setEconomyAction({ amount: 0, description: '' });
      setSelectedIds([]);
      fetchData();
    } catch (e: any) {
      alert('오류 발생: ' + e.message);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('students').insert({
      id: newSt.id,
      name: newSt.name,
      salary: newSt.salary,
      balance: 0, bank_balance: 0, brokerage_balance: 0,
      teacher_id: teacherId,
      session_code: activeSession.session_code
    });
    if (error) alert('학생 등록 실패: ' + error.message);
    else {
      setNewSt({ id: '', name: '', salary: 10000 });
      setShowAddStudent(false);
      fetchData();
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('market_items').insert({
      name: newItem.name,
      price: Number(newItem.price),
      quantity: Number(newItem.quantity),
      teacher_id: teacherId
    });
    if (error) alert('물품 등록 실패: (DB에 quantity 컬럼이 있는지 확인해주세요) ' + error.message);
    else {
      setNewItem({ name: '', price: '', quantity: '' });
      setShowItemForm(false);
      fetchData();
    }
  };

  const handleAssignStudent = async (studentId: string) => {
    if (!assignTargetSeat) return;
    const student = students.find(s => s.id === studentId);
    
    const updateData = student 
      ? { owner_id: student.id, owner_name: student.name, status: 'sold', price_at_buy: 0 }
      : { owner_id: null, owner_name: null, status: 'available', price_at_buy: 0 };

    const { error } = await supabase.from('seats').update(updateData).eq('id', assignTargetSeat.id);

    if (error) alert('배치 실패: ' + error.message);
    else {
      setAssignTargetSeat(null);
      fetchData();
    }
  };

  const handleApproveSeat = async (seat: Seat, approve: boolean) => {
    if (approve) {
      await supabase.from('seats').update({ status: 'sold' }).eq('id', seat.id);
    } else {
      if (seat.owner_id && seat.price_at_buy) {
        const { data: st } = await supabase.from('students').select('balance').eq('id', seat.owner_id).single();
        if (st) await supabase.from('students').update({ balance: st.balance + seat.price_at_buy }).eq('id', seat.owner_id);
      }
      await supabase.from('seats').update({ owner_id: null, owner_name: null, status: 'available', price_at_buy: 0 }).eq('id', seat.id);
    }
    fetchData();
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('economy_settings').update(classInfo).eq('id', activeSession.id);
    if (error) alert('설정 저장 실패: ' + error.message);
    else alert('학급 설정이 저장되었습니다.');
  };

  const initializeSeats = async () => {
    if (!confirm('자리를 6x6 그리드로 초기화하시겠습니까? 기존 배치는 삭제됩니다.')) return;
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
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1 space-y-2">
        {[
          { id: 'students', icon: <Users size={18}/>, label: '학생 명단' },
          { id: 'economy', icon: <Wallet size={18}/>, label: '경제 운영' },
          { id: 'estate', icon: <Layout size={18}/>, label: '부동산 배치' },
          { id: 'market', icon: <ShoppingBag size={18}/>, label: '상점 관리' },
          { id: 'settings', icon: <Settings size={18}/>, label: '환경 설정' },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedIds([]); }} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="lg:col-span-4 animate-in fade-in duration-500">
        {/* 학생 명단 */}
        {activeTab === 'students' && (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800">학생 명단 관리</h2>
              <button onClick={() => setShowAddStudent(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-100">
                <UserPlus size={16}/> 학생 추가
              </button>
            </div>

            {showAddStudent && (
              <form onSubmit={handleAddStudent} className="mb-8 p-6 bg-slate-50 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4 border border-slate-100 animate-in slide-in-from-top-2">
                <input type="text" placeholder="학번" value={newSt.id} onChange={e => setNewSt({...newSt, id: e.target.value})} className="bg-white border-none rounded-xl p-3 text-sm font-bold shadow-sm outline-indigo-500" required />
                <input type="text" placeholder="이름" value={newSt.name} onChange={e => setNewSt({...newSt, name: e.target.value})} className="bg-white border-none rounded-xl p-3 text-sm font-bold shadow-sm outline-indigo-500" required />
                <input type="number" placeholder="주급" value={newSt.salary} onChange={e => setNewSt({...newSt, salary: Number(e.target.value)})} className="bg-white border-none rounded-xl p-3 text-sm font-bold shadow-sm outline-indigo-500" required />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-slate-900 text-white rounded-xl text-xs font-black">등록</button>
                  <button type="button" onClick={() => setShowAddStudent(false)} className="px-4 bg-slate-200 text-slate-500 rounded-xl text-xs font-black">취소</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">학번 / 이름</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">자산 현황</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">기본 주급</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <span className="font-black text-slate-800">{s.name}</span>
                        <p className="text-[10px] font-bold text-slate-400">{s.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-600">₩{s.balance.toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-slate-300">| ₩{s.bank_balance.toLocaleString()} | ₩{s.brokerage_balance.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">₩{s.salary.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={async () => { if(confirm('학생을 삭제하시겠습니까?')) { await supabase.from('students').delete().eq('id', s.id); fetchData(); } }} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 경제 운영 */}
        {activeTab === 'economy' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800">학급 경제 운영</h2>
                <button onClick={handleBulkSalaryUpdate} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2">
                  <TrendingUp size={16}/> 일괄 주급 변경
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100 space-y-4">
                  <div className="flex items-center gap-3 text-indigo-600">
                    <HandCoins size={24}/>
                    <h3 className="font-black text-lg">수당 및 범칙금 입력</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <input type="number" value={economyAction.amount || ''} onChange={e => setEconomyAction({...economyAction, amount: Number(e.target.value)})} placeholder="금액 (원)" className="w-full bg-white border-none rounded-xl p-4 text-sm font-bold shadow-sm outline-indigo-500" />
                    <input type="text" value={economyAction.description} onChange={e => setEconomyAction({...economyAction, description: e.target.value})} placeholder="사유 (예: 퀴즈 우승, 교실 청소 불량)" className="w-full bg-white border-none rounded-xl p-4 text-sm font-bold shadow-sm outline-indigo-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => processEconomyAction('reward', 'selected')} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl text-xs font-black shadow-lg shadow-indigo-100">선택 수당 지급</button>
                    <button onClick={() => processEconomyAction('fine', 'selected')} className="flex-1 bg-rose-600 text-white py-4 rounded-xl text-xs font-black shadow-lg shadow-rose-100 flex items-center justify-center gap-1"><AlertOctagon size={14}/> 범칙금 부과</button>
                  </div>
                  <button onClick={() => processEconomyAction('reward', 'all')} className="w-full bg-white text-indigo-600 border border-indigo-200 py-3 rounded-xl text-[10px] font-black">전체 학생 일괄 수당 지급</button>
                </div>

                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col justify-center text-center">
                  <p className="text-slate-400 font-bold text-sm mb-2">선택된 학생</p>
                  <p className="text-4xl font-black text-slate-800 tracking-tighter">{selectedIds.length}<span className="text-xl text-slate-400 ml-1">명</span></p>
                  <button onClick={() => setSelectedIds([])} className="mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest">선택 초기화</button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 w-10">
                        <input type="checkbox" onChange={(e) => e.target.checked ? setSelectedIds(students.map(s => s.id)) : setSelectedIds([])} checked={selectedIds.length === students.length && students.length > 0} className="rounded" />
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">학번 / 이름</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">현재 잔액</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">기본 주급</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map(s => (
                      <tr key={s.id} className={`hover:bg-slate-50/50 cursor-pointer ${selectedIds.includes(s.id) ? 'bg-indigo-50/30' : ''}`} onClick={() => setSelectedIds(prev => prev.includes(s.id) ? prev.filter(i => i !== s.id) : [...prev, s.id])}>
                        <td className="px-6 py-4">
                          <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => {}} className="rounded pointer-events-none" />
                        </td>
                        <td className="px-6 py-4 font-black text-slate-800">{s.name} ({s.id})</td>
                        <td className="px-6 py-4 text-xs font-bold text-indigo-600">₩{s.balance.toLocaleString()}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-400">₩{s.salary.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 부동산 배치 */}
        {activeTab === 'estate' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800">부동산 & 자리 배치</h2>
                <button onClick={initializeSeats} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2">
                  <RefreshCcw size={16}/> 배치도 초기화
                </button>
              </div>

              <div className="grid grid-cols-6 gap-3 max-w-2xl mx-auto p-6 bg-slate-100/50 rounded-[3rem] border-2 border-white shadow-inner mb-10 overflow-hidden">
                {seats.map(seat => (
                  <button 
                    key={seat.id} 
                    onClick={() => setAssignTargetSeat(seat)}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all relative group ${seat.status === 'sold' ? 'bg-white border-indigo-200 shadow-sm' : seat.status === 'pending' ? 'bg-amber-50 border-amber-300 animate-pulse' : 'bg-slate-200/30 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-white'}`}
                  >
                    {seat.status === 'sold' ? (
                      <span className="text-[10px] font-black text-slate-800 truncate px-1">{seat.owner_name}</span>
                    ) : (
                      <Plus size={16} className="text-slate-300 group-hover:text-indigo-500"/>
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-black flex items-center gap-2 px-2"><Clock size={20} className="text-amber-500"/> 거래 대기 요청</h3>
                {seats.filter(s => s.status === 'pending').map(pendingSeat => (
                  <div key={pendingSeat.id} className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl flex justify-between items-center animate-in zoom-in-95">
                    <div>
                      <p className="text-sm font-black text-slate-800">{pendingSeat.owner_name} 학생의 구매 요청</p>
                      <p className="text-[10px] font-bold text-slate-400">위치: ({pendingSeat.row_idx + 1}, {pendingSeat.col_idx + 1})</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveSeat(pendingSeat, true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1"><CheckCircle2 size={14}/> 승인</button>
                      <button onClick={() => handleApproveSeat(pendingSeat, false)} className="bg-white text-rose-500 border border-rose-100 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1"><XCircle size={14}/> 거절</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {assignTargetSeat && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-2xl font-black text-slate-900 mb-2">학생 자리 배치</h3>
                  <p className="text-sm text-slate-400 font-medium mb-8">({assignTargetSeat.row_idx + 1}행, {assignTargetSeat.col_idx + 1}열) 자리에 배정할 학생을 선택하세요.</p>
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-8 pr-2 custom-scrollbar">
                    {students.map(s => (
                      <button key={s.id} onClick={() => handleAssignStudent(s.id)} className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all group">
                        <span className="font-black">{s.name}</span>
                        <span className="text-xs font-bold text-slate-400 group-hover:text-white/70">{s.id}</span>
                      </button>
                    ))}
                    <button onClick={() => handleAssignStudent('')} className="w-full p-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-sm">빈 자리로 설정</button>
                  </div>
                  <button onClick={() => setAssignTargetSeat(null)} className="w-full py-4 text-slate-400 font-black">닫기</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 상점 관리 */}
        {activeTab === 'market' && (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800">학급 상점 관리</h2>
              <button onClick={() => setShowItemForm(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2">
                <Plus size={16}/> 신규 물품 등록
              </button>
            </div>

            {showItemForm && (
              <form onSubmit={handleAddItem} className="mb-8 p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100 shadow-inner animate-in slide-in-from-top-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">물품 이름</label>
                    <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-white border-none rounded-xl p-4 text-sm font-bold shadow-sm outline-indigo-500" placeholder="예: 숙제 면제권" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">판매 가격</label>
                    <input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full bg-white border-none rounded-xl p-4 text-sm font-bold shadow-sm outline-indigo-500" placeholder="단위: 원" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">초기 수량</label>
                    <input type="number" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="w-full bg-white border-none rounded-xl p-4 text-sm font-bold shadow-sm outline-indigo-500" placeholder="개수" required />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" onClick={() => setShowItemForm(false)} className="px-6 py-3 bg-white text-slate-500 rounded-xl text-xs font-black border border-slate-100">취소</button>
                  <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100">물품 등록하기</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketItems.map(item => (
                <div key={item.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center group transition-all hover:bg-white hover:border-indigo-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl text-indigo-600 shadow-sm"><ShoppingBag size={20}/></div>
                    <div>
                      <h4 className="font-black text-slate-800 text-lg">{item.name}</h4>
                      <p className="text-xs text-slate-400 font-bold">가격: {item.price.toLocaleString()}원 | 재고: <span className="text-indigo-600">{item.quantity}</span>개</p>
                    </div>
                  </div>
                  <button onClick={async () => { if(confirm('삭제하시겠습니까?')) { await supabase.from('market_items').delete().eq('id', item.id); fetchData(); } }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={20}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 환경 설정 */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm">
              <h2 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-3">
                <Settings className="text-indigo-600" /> 학급 환경 설정
              </h2>
              
              <form onSubmit={handleUpdateSettings} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">학급 이름</label>
                    <div className="relative">
                      <Edit3 className="absolute left-4 top-4 text-slate-300" size={18}/>
                      <input type="text" value={classInfo.class_name} onChange={e => setClassInfo({...classInfo, class_name: e.target.value})} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">클래스 세션 코드</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-4 text-slate-300" size={18}/>
                      <input type="text" value={classInfo.session_code} onChange={e => setClassInfo({...classInfo, session_code: e.target.value.toUpperCase()})} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl font-black font-mono tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 flex items-center gap-6">
                  <div className="bg-white p-4 rounded-3xl text-indigo-600 shadow-sm"><Lock size={24}/></div>
                  <div className="flex-1">
                    <p className="font-black text-slate-800 text-lg">AI 서비스 관리 (Gemini API)</p>
                    <p className="text-sm text-slate-400 font-bold mt-1 leading-relaxed">
                      API 키는 플랫폼 환경 설정에서 관리됩니다. 현재 **공용 API 키**가 안전하게 연결되어 있습니다. <br/>
                      개인 키 사용을 원하실 경우 관리자에게 문의하세요.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-100 text-emerald-600 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheck size={14}/> Verified & Active
                  </div>
                </div>

                <div className="p-8 bg-slate-50 rounded-[2.5rem] flex items-center justify-between border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl transition-all ${classInfo.auto_approve_estate ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}><Layout size={20}/></div>
                    <div>
                      <p className="font-black text-slate-800">부동산 자동 거래 승인</p>
                      <p className="text-xs text-slate-400 font-bold">학생들이 자리를 살 때 교사 승인 없이 즉시 구매 가능하게 합니다.</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setClassInfo({...classInfo, auto_approve_estate: !classInfo.auto_approve_estate})}
                    className={`w-14 h-8 rounded-full transition-all relative ${classInfo.auto_approve_estate ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${classInfo.auto_approve_estate ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" className="bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all flex items-center gap-2">
                    <Save size={20}/> 모든 설정 저장하기
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
