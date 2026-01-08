
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, BookOpen, Settings,
  TrendingUp, Map, Download, Plus, Save, Key, RefreshCw,
  Trash2, Check, X, Coins, Megaphone
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student, Quiz, MarketItem, Seat } from '../types';

interface Props {
  teacherId: string;
}

const TeacherDashboard: React.FC<Props> = ({ teacherId }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [pendingSeats, setPendingSeats] = useState<(Seat & { owner_name?: string, buyer_name?: string })[]>([]);
  const [settings, setSettings] = useState<EconomySettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 수정용 상태
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, [teacherId, activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'students') {
        const { data } = await supabase.from('students').select('*').eq('teacher_id', teacherId).order('id', { ascending: true });
        if (data) setStudents(data);
      } else if (activeTab === 'quiz') {
        const { data } = await supabase.from('quizzes').select('*').eq('teacher_id', teacherId);
        if (data) setQuizzes(data);
      } else if (activeTab === 'market') {
        const { data } = await supabase.from('market_items').select('*').eq('teacher_id', teacherId);
        if (data) setMarketItems(data);
      } else if (activeTab === 'estate') {
        const { data } = await supabase.from('seats').select('*, students!owner_id(name)').eq('teacher_id', teacherId).eq('status', 'pending');
        if (data) setPendingSeats(data as any);
      }
      
      const { data: setv } = await supabase.from('economy_settings').select('*').eq('teacher_id', teacherId).single();
      if (setv) setSettings(setv);
      else {
        const initial = { teacher_id: teacherId, session_code: Math.random().toString(36).substring(2, 8).toUpperCase(), school_level: 'elementary', auto_approve_estate: false, quiz_count_per_day: 1 };
        await supabase.from('economy_settings').insert(initial);
        setSettings(initial as any);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  // Fix: implement missing updateSettings function
  const updateSettings = async (updates: Partial<EconomySettings>) => {
    if (!settings) return;
    try {
      const { error } = await supabase
        .from('economy_settings')
        .update(updates)
        .eq('teacher_id', teacherId);
      
      if (error) throw error;
      setSettings({ ...settings, ...updates });
    } catch (err) {
      console.error('Failed to update settings:', err);
      alert('설정 업데이트에 실패했습니다.');
    }
  };

  // 학생 정보 수정
  const updateStudentSalary = async (id: string) => {
    await supabase.from('students').update({ salary: editValue }).eq('id', id);
    setEditingStudent(null);
    fetchData();
  };

  // 단체 수당/세금
  const handleMassTransaction = async (amount: number, isTax: boolean) => {
    if (!confirm(`${isTax ? '세금 징수' : '수당 지급'}를 진행할까요? 대상: ${students.length}명, 금액: ${amount}원`)) return;
    for (const s of students) {
      const newBalance = isTax ? s.balance - amount : s.balance + amount;
      await supabase.from('students').update({ balance: Math.max(0, newBalance) }).eq('id', s.id);
    }
    alert('완료되었습니다.');
    fetchData();
  };

  // 마켓 아이템 추가
  const addMarketItem = async () => {
    const name = prompt('물품 이름을 입력하세요');
    const price = Number(prompt('가격을 입력하세요'));
    if (name && price) {
      await supabase.from('market_items').insert({ name, price, teacher_id: teacherId });
      fetchData();
    }
  };

  // 부동산 승인/거절
  const handleSeatApproval = async (seatId: number, approve: boolean) => {
    if (approve) {
      // 실제 소유권 이전 로직 필요 (여기선 단순 상태 변경)
      await supabase.from('seats').update({ status: 'sold', owner_id: pendingSeats.find(s=>s.id === seatId)?.pending_buyer_id, pending_buyer_id: null }).eq('id', seatId).eq('teacher_id', teacherId);
    } else {
      await supabase.from('seats').update({ status: 'available', pending_buyer_id: null }).eq('id', seatId).eq('teacher_id', teacherId);
    }
    fetchData();
  };

  const handleDownloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["학년", "반", "번호", "성명", "주급"],
      [6, 1, 1, "홍길동", 5000],
      [6, 1, 2, "김철수", 4500]
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "학생명단양식");
    XLSX.writeFile(wb, "ClassEconomy_학생양식.xlsx");
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
      const studentData = rows.slice(1).filter(row => row[3]).map(row => ({
        grade: String(row[0]), class: String(row[1]), number: String(row[2]), name: String(row[3]),
        id: `${row[0]}${row[1]}${String(row[2]).padStart(2, '0')}`,
        salary: Number(row[4] || 0), balance: 0, bank_balance: 0, brokerage_balance: 0, teacher_id: teacherId, password: '' 
      }));
      await supabase.from('students').upsert(studentData);
      alert(`${studentData.length}명 등록 완료!`);
      fetchData();
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-1 h-fit sticky top-24">
        {[
          { id: 'students', icon: <Users size={18}/>, label: '학생 관리' },
          { id: 'economy', icon: <Landmark size={18}/>, label: '경제 운영' },
          { id: 'quiz', icon: <BookOpen size={18}/>, label: '퀴즈 관리' },
          { id: 'market', icon: <ShoppingBag size={18}/>, label: '마켓 관리' },
          { id: 'estate', icon: <Map size={18}/>, label: '부동산 승인' },
          { id: 'settings', icon: <Settings size={18}/>, label: '환경 설정' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div className="md:col-span-3 space-y-6">
        {activeTab === 'students' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-800">학생 명단 ({students.length}명)</h2>
              <div className="flex gap-2">
                <button onClick={handleDownloadSample} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><Download size={14}/> 양식 다운</button>
                <label className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors"><Plus size={14}/> 엑셀 업로드 <input type="file" className="hidden" onChange={handleBulkUpload} accept=".xlsx,.xls,.csv" /></label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-slate-50 border-y"><th className="px-4 py-3 font-bold text-slate-500">학번/이름</th><th className="px-4 py-3 font-bold text-slate-500">주급</th><th className="px-4 py-3 font-bold text-slate-500">비밀번호</th><th className="px-4 py-3 font-bold text-slate-500">총 자산</th></tr></thead>
                <tbody className="divide-y">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 font-bold">{s.id} {s.name}</td>
                      <td className="px-4 py-4">
                        {editingStudent === s.id ? (
                          <div className="flex gap-1 items-center">
                            <input type="number" value={editValue} onChange={(e)=>setEditValue(Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
                            <button onClick={()=>updateStudentSalary(s.id)} className="text-blue-500"><Check size={16}/></button>
                            <button onClick={()=>setEditingStudent(null)} className="text-red-500"><X size={16}/></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group cursor-pointer" onClick={()=>{setEditingStudent(s.id); setEditValue(s.salary)}}>
                            {s.salary.toLocaleString()}원 <Settings size={12} className="opacity-0 group-hover:opacity-100"/>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-400 font-mono">{s.password || '(미설정)'}</td>
                      <td className="px-4 py-4 font-bold text-indigo-600">{(s.balance + s.bank_balance + s.brokerage_balance).toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'economy' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold">전체 경제 제어</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2"><Megaphone size={18}/> 일괄 수당 지급</h3>
                <div className="flex gap-2">
                  <input type="number" id="massReward" placeholder="지급 금액" className="flex-1 p-3 border rounded-xl" />
                  <button onClick={() => handleMassTransaction(Number((document.getElementById('massReward') as HTMLInputElement).value), false)} className="bg-emerald-600 text-white px-6 rounded-xl font-bold">지급</button>
                </div>
              </div>
              <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2"><Coins size={18}/> 일괄 세금 징수</h3>
                <div className="flex gap-2">
                  <input type="number" id="massTax" placeholder="징수 금액" className="flex-1 p-3 border rounded-xl" />
                  <button onClick={() => handleMassTransaction(Number((document.getElementById('massTax') as HTMLInputElement).value), true)} className="bg-red-600 text-white px-6 rounded-xl font-bold">징수</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'market' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">마켓 아이템 관리</h2>
              <button onClick={addMarketItem} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Plus size={18}/> 아이템 추가</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketItems.map(item => (
                <div key={item.id} className="p-4 border rounded-2xl flex justify-between items-center bg-slate-50">
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-sm text-indigo-600 font-bold">{item.price.toLocaleString()}원</p>
                  </div>
                  <button onClick={async () => { await supabase.from('market_items').delete().eq('id', item.id); fetchData(); }} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                </div>
              ))}
              {marketItems.length === 0 && <p className="col-span-full text-center py-10 text-slate-400">등록된 아이템이 없습니다.</p>}
            </div>
          </div>
        )}

        {activeTab === 'estate' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <h2 className="text-xl font-bold mb-6">부동산 구매 승인 대기</h2>
            <div className="space-y-4">
              {pendingSeats.map(seat => (
                <div key={seat.id} className="p-4 border rounded-2xl flex justify-between items-center bg-amber-50 border-amber-100">
                  <div>
                    <p className="font-bold">좌석 #{seat.id}</p>
                    <p className="text-sm">신청 학생: <span className="font-bold text-amber-800">{seat.pending_buyer_id}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSeatApproval(seat.id, true)} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700"><Check size={20}/></button>
                    <button onClick={() => handleSeatApproval(seat.id, false)} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600"><X size={20}/></button>
                  </div>
                </div>
              ))}
              {pendingSeats.length === 0 && <p className="text-center py-10 text-slate-400">대기 중인 요청이 없습니다.</p>}
            </div>
          </div>
        )}

        {activeTab === 'settings' && settings && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-8">
            <h2 className="text-xl font-bold">환경 설정</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-slate-50 rounded-2xl space-y-3">
                <label className="text-sm font-bold text-slate-500 block">세션 코드</label>
                <div className="flex gap-2">
                  <input type="text" value={settings.session_code} readOnly className="flex-1 bg-white border p-3 rounded-xl font-mono font-bold text-indigo-600" />
                  <button onClick={() => updateSettings({ session_code: Math.random().toString(36).substring(2, 8).toUpperCase() })} className="p-3 bg-white border rounded-xl hover:bg-slate-100"><RefreshCw size={18}/></button>
                </div>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl space-y-3">
                <label className="text-sm font-bold text-slate-500 block">학급 수준</label>
                <select value={settings.school_level} onChange={(e) => updateSettings({ school_level: e.target.value as any })} className="w-full p-3 bg-white border rounded-xl font-bold">
                  <option value="elementary">초등학생</option>
                  <option value="middle">중학생</option>
                  <option value="high">고등학생</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
