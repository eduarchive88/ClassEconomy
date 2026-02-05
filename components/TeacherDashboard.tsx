
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, Settings, Download, Plus, Trash2, Coins, Megaphone, 
  History, Save, UserPlus, FileSpreadsheet, HelpCircle, GraduationCap, Layout, 
  ShieldCheck, Key, Lock, CheckCircle2, XCircle, RefreshCcw, AlertCircle, Clock, Edit3, UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student, Transaction, Quiz, Seat, MarketItem } from '../types';

interface Props { teacherId: string; activeSession: EconomySettings; }

const TeacherDashboard: React.FC<Props> = ({ teacherId, activeSession }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [isAutoApprove, setIsAutoApprove] = useState(activeSession.auto_approve_estate);
  
  // Modals / Forms
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '' });
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newSt, setNewSt] = useState({ id: '', name: '', salary: 10000 });
  const [assignTargetSeat, setAssignTargetSeat] = useState<Seat | null>(null);

  // Settings Form
  const [classInfo, setClassInfo] = useState({
    class_name: activeSession.class_name,
    session_code: activeSession.session_code,
    school_level: activeSession.school_level
  });

  useEffect(() => { fetchData(); }, [activeTab, activeSession.session_code]);

  const fetchData = async () => {
    const code = activeSession.session_code;
    if (activeTab === 'students') {
      const { data } = await supabase.from('students').select('*').eq('session_code', code).order('id', { ascending: true });
      if (data) setStudents(data);
    } else if (activeTab === 'estate') {
      const { data: sData } = await supabase.from('seats').select('*').eq('session_code', code).order('row_idx', { ascending: true }).order('col_idx', { ascending: true });
      if (sData) setSeats(sData);
      const { data: stData } = await supabase.from('students').select('*').eq('session_code', code);
      if (stData) setStudents(stData);
    } else if (activeTab === 'market') {
      const { data } = await supabase.from('market_items').select('*').eq('teacher_id', teacherId);
      if (data) setMarketItems(data);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('students').insert({
      ...newSt,
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
    if (error) alert('물품 등록 실패: ' + error.message);
    else {
      setNewItem({ name: '', price: '', quantity: '' });
      setShowItemForm(false);
      fetchData();
    }
  };

  const handleAssignStudent = async (studentId: string) => {
    if (!assignTargetSeat) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const { error } = await supabase.from('seats').update({
      owner_id: student.id,
      owner_name: student.name,
      status: 'sold',
      price_at_buy: 0
    }).eq('id', assignTargetSeat.id);

    if (error) alert('배치 실패: ' + error.message);
    else {
      setAssignTargetSeat(null);
      fetchData();
    }
  };

  // Add missing handleApproveSeat function to manage pending real estate transactions
  const handleApproveSeat = async (seat: Seat, approve: boolean) => {
    try {
      if (approve) {
        // Approve: Change status to 'sold' (Money was already deducted in StudentDashboard)
        const { error } = await supabase.from('seats').update({ status: 'sold' }).eq('id', seat.id);
        if (error) throw error;

        // Log transaction for approval
        await supabase.from('transactions').insert({
          session_code: activeSession.session_code,
          sender_id: seat.owner_id || '',
          sender_name: seat.owner_name || '',
          receiver_id: 'GOVERNMENT',
          receiver_name: '정부',
          amount: seat.price_at_buy || 0,
          type: 'real_estate',
          description: `좌석 구매 승인 (${seat.row_idx + 1}행, ${seat.col_idx + 1}열)`
        });
        alert('요청을 승인했습니다.');
      } else {
        // Reject: Refund amount to student and reset seat status
        if (seat.owner_id) {
          const { data: st } = await supabase.from('students').select('balance').eq('id', seat.owner_id).single();
          if (st) {
            await supabase.from('students').update({ balance: st.balance + (seat.price_at_buy || 0) }).eq('id', seat.owner_id);
          }
        }
        await supabase.from('seats').update({ 
          owner_id: null, 
          owner_name: null, 
          status: 'available', 
          price_at_buy: 0 
        }).eq('id', seat.id);
        alert('요청을 거절하고 금액을 환불했습니다.');
      }
      fetchData();
    } catch (err: any) {
      alert('처리 중 오류 발생: ' + err.message);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('economy_settings')
      .update(classInfo)
      .eq('id', activeSession.id);
    if (error) alert('설정 수정 실패: ' + error.message);
    else alert('학급 정보가 수정되었습니다. (새로고침 후 반영)');
  };

  const initializeSeats = async () => {
    if (!confirm('자리 배치도를 초기화(6x6)하시겠습니까?')) return;
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
          { id: 'estate', icon: <Layout size={18}/>, label: '부동산 배치' },
          { id: 'market', icon: <ShoppingBag size={18}/>, label: '상점 관리' },
          { id: 'settings', icon: <Settings size={18}/>, label: '환경 설정' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="lg:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* 학생 명단 탭 */}
        {activeTab === 'students' && (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800">학생 명단 관리</h2>
                <p className="text-sm text-slate-400 font-medium">우리 반 학생들의 경제 정보를 확인하세요.</p>
              </div>
              <button onClick={() => setShowAddStudent(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2">
                <UserPlus size={16}/> 학생 추가
              </button>
            </div>

            {showAddStudent && (
              <form onSubmit={handleAddStudent} className="mb-8 p-6 bg-slate-50 rounded-3xl grid grid-cols-4 gap-4 animate-in zoom-in-95 duration-200">
                <input type="text" placeholder="학번" value={newSt.id} onChange={e => setNewSt({...newSt, id: e.target.value})} className="bg-white border-none rounded-xl p-3 text-sm font-bold outline-indigo-500" required />
                <input type="text" placeholder="이름" value={newSt.name} onChange={e => setNewSt({...newSt, name: e.target.value})} className="bg-white border-none rounded-xl p-3 text-sm font-bold outline-indigo-500" required />
                <input type="number" placeholder="주급" value={newSt.salary} onChange={e => setNewSt({...newSt, salary: Number(e.target.value)})} className="bg-white border-none rounded-xl p-3 text-sm font-bold outline-indigo-500" required />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-slate-900 text-white rounded-xl text-xs font-black">등록</button>
                  <button type="button" onClick={() => setShowAddStudent(false)} className="px-4 bg-slate-200 text-slate-500 rounded-xl text-xs font-black">취소</button>
                </div>
              </form>
            )}

            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">학번/이름</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">현금/은행/증권</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">주급</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-800">{s.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{s.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-600">₩{(s.balance).toLocaleString()}</span>
                          <span className="text-xs font-bold text-slate-400">/ ₩{(s.bank_balance).toLocaleString()} / ₩{(s.brokerage_balance).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">₩{s.salary.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={async () => { if(confirm('학생을 삭제하시겠습니까?')) { await supabase.from('students').delete().eq('id', s.id); fetchData(); } }} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {students.length === 0 && <p className="text-center py-20 text-slate-400 font-medium">등록된 학생이 없습니다.</p>}
            </div>
          </div>
        )}

        {/* 상점 관리 탭 */}
        {activeTab === 'market' && (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800">학급 상점 관리</h2>
                <p className="text-sm text-slate-400 font-medium">물품 정보(이름, 가격, 수량)를 한 번에 등록하세요.</p>
              </div>
              <button onClick={() => setShowItemForm(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2">
                <Plus size={16}/> 신규 물품 등록
              </button>
            </div>

            {showItemForm && (
              <form onSubmit={handleAddItem} className="mb-8 p-8 bg-indigo-50 rounded-[2rem] grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">물품 이름</label>
                  <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold outline-indigo-500 shadow-sm" placeholder="예: 숙제 면제권" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">판매 가격</label>
                  <input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold outline-indigo-500 shadow-sm" placeholder="단위: 원" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">초기 수량</label>
                  <input type="number" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold outline-indigo-500 shadow-sm" placeholder="개" required />
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white p-3 rounded-xl text-xs font-black shadow-lg shadow-indigo-200">등록하기</button>
                  <button type="button" onClick={() => setShowItemForm(false)} className="px-4 bg-white text-slate-500 p-3 rounded-xl text-xs font-black border border-slate-100">취소</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketItems.map(item => (
                <div key={item.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl text-indigo-600 shadow-sm"><ShoppingBag size={20}/></div>
                    <div>
                      <h4 className="font-black text-slate-800 text-lg">{item.name}</h4>
                      <p className="text-xs text-slate-400 font-bold">가격: {item.price.toLocaleString()}원 | 남은 수량: <span className="text-indigo-600">{item.quantity}</span>개</p>
                    </div>
                  </div>
                  <button onClick={async () => { if(confirm('삭제하시겠습니까?')) { await supabase.from('market_items').delete().eq('id', item.id); fetchData(); } }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={20}/></button>
                </div>
              ))}
              {marketItems.length === 0 && !showItemForm && <p className="col-span-2 text-center py-20 text-slate-400 font-medium">등록된 상점 물품이 없습니다.</p>}
            </div>
          </div>
        )}

        {/* 부동산 관리 탭 */}
        {activeTab === 'estate' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">부동산 & 자리 배치</h2>
                  <p className="text-sm text-slate-400 font-medium">자리를 클릭하여 학생을 임의로 배치하거나 거래 요청을 승인하세요.</p>
                </div>
                <button onClick={initializeSeats} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2">
                  <RefreshCcw size={16}/> 배치도 초기화
                </button>
              </div>

              <div className="grid grid-cols-6 gap-3 max-w-2xl mx-auto p-6 bg-slate-100/50 rounded-[3rem] border-2 border-white shadow-inner mb-10">
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

              {/* 배치 모달 */}
              {assignTargetSeat && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                  <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                    <h3 className="text-2xl font-black text-slate-900 mb-2">학생 자리 배치</h3>
                    <p className="text-sm text-slate-400 font-medium mb-8">({assignTargetSeat.row_idx + 1}행, {assignTargetSeat.col_idx + 1}열) 위치에 배치할 학생을 선택하세요.</p>
                    <div className="max-h-60 overflow-y-auto space-y-2 mb-8 pr-2 custom-scrollbar">
                      {students.map(s => (
                        <button key={s.id} onClick={() => handleAssignStudent(s.id)} className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all group">
                          <span className="font-black">{s.name}</span>
                          <span className="text-xs font-bold text-slate-400 group-hover:text-white/70">{s.id}</span>
                        </button>
                      ))}
                      <button onClick={() => handleAssignStudent('')} className="w-full p-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-sm">소유자 해제</button>
                    </div>
                    <button onClick={() => setAssignTargetSeat(null)} className="w-full py-4 text-slate-400 font-black">닫기</button>
                  </div>
                </div>
              )}

              {/* 기존 거래 승인 리스트 유지 */}
              <div className="space-y-4">
                <h3 className="text-lg font-black flex items-center gap-2 px-2"><Clock size={20} className="text-amber-500"/> 거래 대기 요청</h3>
                {seats.filter(s => s.status === 'pending').map(pendingSeat => (
                  <div key={pendingSeat.id} className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl flex justify-between items-center">
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
          </div>
        )}

        {/* 환경 설정 탭 */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
              <h2 className="text-2xl font-black text-slate-800 mb-8">학급 환경 설정</h2>
              
              <form onSubmit={handleUpdateSettings} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">학급 이름</label>
                    <div className="relative">
                      <Edit3 className="absolute left-4 top-4 text-slate-300" size={18}/>
                      <input type="text" value={classInfo.class_name} onChange={e => setClassInfo({...classInfo, class_name: e.target.value})} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">클래스 세션 코드 (수정 주의)</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-4 text-slate-300" size={18}/>
                      <input type="text" value={classInfo.session_code} onChange={e => setClassInfo({...classInfo, session_code: e.target.value.toUpperCase()})} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl font-black font-mono tracking-widest outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl flex items-center gap-6">
                  <div className="bg-white p-4 rounded-2xl text-indigo-600 shadow-sm"><Lock size={24}/></div>
                  <div className="flex-1">
                    <p className="font-black text-slate-800">구글 Gemini API 키 설정</p>
                    <p className="text-xs text-slate-400 font-bold mt-1 leading-relaxed">API 키는 환경변수(process.env.API_KEY)를 통해 안전하게 관리됩니다. <br/>Vercel 설정 페이지에서 키를 등록해 주세요.</p>
                  </div>
                  <div className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black">연결됨</div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="submit" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all">설정 저장하기</button>
                </div>
              </form>
            </div>

            <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100">
               <div className="flex items-center gap-3 text-rose-600 mb-4">
                 <AlertCircle size={24}/>
                 <h3 className="text-lg font-black text-rose-900 uppercase tracking-tight">위험 구역</h3>
               </div>
               <p className="text-sm text-rose-700 font-medium mb-6">학급 데이터를 삭제하면 복구할 수 없습니다. 모든 학생 데이터와 거래 기록이 삭제됩니다.</p>
               <button onClick={() => alert('학급 삭제는 현재 관리자에게 문의하세요.')} className="bg-white border border-rose-200 text-rose-500 px-6 py-3 rounded-2xl text-xs font-black hover:bg-rose-500 hover:text-white transition-all">클래스 초기화 및 삭제</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
