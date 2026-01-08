
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, BookOpen, Settings,
  Map, Download, Plus, RefreshCw, Trash2, Check, X, 
  Coins, Megaphone, ArrowUpDown, UserPlus, Search
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

  // 학생 관리 관련 상태
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Student, direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ grade: '', class: '', number: '', name: '' });

  useEffect(() => {
    fetchData();
  }, [teacherId, activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'students') {
        const { data } = await supabase.from('students').select('*').eq('teacher_id', teacherId);
        if (data) {
          const sorted = [...data].sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          });
          setStudents(sorted);
        }
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

  const updateSettings = async (updates: Partial<EconomySettings>) => {
    if (!settings) return;
    try {
      const { error } = await supabase.from('economy_settings').update(updates).eq('teacher_id', teacherId);
      if (error) throw error;
      setSettings({ ...settings, ...updates });
    } catch (err) { console.error(err); alert('설정 업데이트 실패'); }
  };

  // 학생 필드 수정 (주급, 현금, 은행, 증권)
  const updateStudentField = async (id: string, field: string) => {
    const updates = { [field]: editValue };
    const { error } = await supabase.from('students').update(updates).eq('id', id);
    if (error) alert('수정 실패');
    setEditingStudent(null);
    setEditField(null);
    fetchData();
  };

  // 학생 한 명 삭제
  const deleteStudent = async (id: string) => {
    if (!confirm('정말 이 학생을 삭제하시겠습니까? 모든 경제 데이터가 유실됩니다.')) return;
    await supabase.from('students').delete().eq('id', id);
    fetchData();
  };

  // 학생 전체 삭제
  const deleteAllStudents = async () => {
    if (!confirm('전체 학생 명단을 삭제하시겠습니까? 복구할 수 없습니다.')) return;
    await supabase.from('students').delete().eq('teacher_id', teacherId);
    fetchData();
  };

  // 학생 수동 추가
  const handleAddSingleStudent = async () => {
    const { grade, class: cls, number, name } = newStudent;
    if (!grade || !cls || !number || !name) return alert('모든 정보를 입력하세요.');
    const id = `${grade}${String(cls).padStart(2, '0')}${String(number).padStart(2, '0')}`;
    const { error } = await supabase.from('students').insert({
      id, grade, class: cls, number, name, teacher_id: teacherId,
      salary: 0, balance: 0, bank_balance: 0, brokerage_balance: 0, password: ''
    });
    if (error) alert('이미 존재하는 학번이거나 오류가 발생했습니다.');
    else {
      setShowAddModal(false);
      setNewStudent({ grade: '', class: '', number: '', name: '' });
      fetchData();
    }
  };

  const toggleSort = (key: keyof Student) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    fetchData();
  };

  const handleMassTransaction = async (amount: number, isTax: boolean) => {
    if (!confirm(`${isTax ? '세금 징수' : '수당 지급'}를 진행할까요? 대상: ${students.length}명, 금액: ${amount}원`)) return;
    for (const s of students) {
      const newBalance = isTax ? s.balance - amount : s.balance + amount;
      await supabase.from('students').update({ balance: Math.max(0, newBalance) }).eq('id', s.id);
    }
    alert('완료되었습니다.');
    fetchData();
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
      const studentData = rows.slice(1).filter(row => row[3]).map(row => {
        const grade = String(row[0]);
        const cls = String(row[1]).padStart(2, '0');
        const num = String(row[2]).padStart(2, '0');
        return {
          grade, class: String(row[1]), number: String(row[2]), name: String(row[3]),
          id: `${grade}${cls}${num}`,
          salary: Number(row[4] || 0), balance: 0, bank_balance: 0, brokerage_balance: 0, teacher_id: teacherId, password: '' 
        };
      });
      await supabase.from('students').upsert(studentData);
      alert(`${studentData.length}명 등록 완료!`);
      fetchData();
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar Navigation */}
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
        {/* 학생 관리 탭 */}
        {activeTab === 'students' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">학생 명단 ({students.length}명)</h2>
                <p className="text-sm text-slate-400">데이터를 클릭하여 값을 수정할 수 있습니다.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"><UserPlus size={14}/> 개별 추가</button>
                <label className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors"><Plus size={14}/> 엑셀 업로드 <input type="file" className="hidden" onChange={handleBulkUpload} accept=".xlsx,.xls,.csv" /></label>
                <button onClick={deleteAllStudents} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><Trash2 size={14}/> 전체 삭제</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-y">
                    <th onClick={() => toggleSort('id')} className="px-4 py-3 font-bold text-slate-500 cursor-pointer hover:text-indigo-600">학번 <ArrowUpDown size={12} className="inline ml-1"/></th>
                    <th onClick={() => toggleSort('name')} className="px-4 py-3 font-bold text-slate-500 cursor-pointer hover:text-indigo-600">이름 <ArrowUpDown size={12} className="inline ml-1"/></th>
                    <th className="px-4 py-3 font-bold text-slate-500">주급</th>
                    <th className="px-4 py-3 font-bold text-slate-500">현금</th>
                    <th className="px-4 py-3 font-bold text-slate-500">은행</th>
                    <th className="px-4 py-3 font-bold text-slate-500">증권</th>
                    <th className="px-4 py-3 font-bold text-slate-500">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 font-mono font-bold text-indigo-600">{s.id}</td>
                      <td className="px-4 py-4 font-bold">{s.name}</td>
                      
                      {/*Editable Fields */}
                      {[
                        { key: 'salary', val: s.salary },
                        { key: 'balance', val: s.balance },
                        { key: 'bank_balance', val: s.bank_balance },
                        { key: 'brokerage_balance', val: s.brokerage_balance }
                      ].map(field => (
                        <td key={field.key} className="px-4 py-4">
                          {editingStudent === s.id && editField === field.key ? (
                            <div className="flex gap-1 items-center">
                              <input type="number" value={editValue} onChange={(e)=>setEditValue(Number(e.target.value))} className="w-24 border rounded px-2 py-1 text-xs" autoFocus onKeyDown={(e) => e.key === 'Enter' && updateStudentField(s.id, field.key)}/>
                              <button onClick={()=>updateStudentField(s.id, field.key)} className="text-indigo-600"><Check size={14}/></button>
                              <button onClick={()=>setEditingStudent(null)} className="text-slate-400"><X size={14}/></button>
                            </div>
                          ) : (
                            <div className="group cursor-pointer flex items-center gap-1 hover:text-indigo-600" onClick={()=>{setEditingStudent(s.id); setEditField(field.key); setEditValue(field.val)}}>
                              {field.val.toLocaleString()} <Settings size={10} className="opacity-0 group-hover:opacity-40"/>
                            </div>
                          )}
                        </td>
                      ))}
                      
                      <td className="px-4 py-4">
                        <button onClick={() => deleteStudent(s.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-20 text-center text-slate-400">학생 데이터가 없습니다. 학생을 추가하거나 엑셀을 업로드하세요.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 개별 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-6">학생 개별 추가</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" placeholder="학년" value={newStudent.grade} onChange={(e)=>setNewStudent({...newStudent, grade: e.target.value})} className="p-3 border rounded-xl w-full"/>
                  <input type="number" placeholder="반" value={newStudent.class} onChange={(e)=>setNewStudent({...newStudent, class: e.target.value})} className="p-3 border rounded-xl w-full"/>
                  <input type="number" placeholder="번호" value={newStudent.number} onChange={(e)=>setNewStudent({...newStudent, number: e.target.value})} className="p-3 border rounded-xl w-full"/>
                </div>
                <input type="text" placeholder="이름" value={newStudent.name} onChange={(e)=>setNewStudent({...newStudent, name: e.target.value})} className="p-3 border rounded-xl w-full"/>
                <p className="text-xs text-slate-400">* 학번은 5자리(학년+반+번호)로 자동 생성됩니다.</p>
                <div className="flex gap-2 pt-4">
                  <button onClick={handleAddSingleStudent} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">저장하기</button>
                  <button onClick={()=>setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">취소</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 나머지 탭들은 기존과 동일하게 유지 */}
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
              <button onClick={async () => {
                const name = prompt('물품 이름을 입력하세요');
                const price = Number(prompt('가격을 입력하세요'));
                if (name && price) {
                  await supabase.from('market_items').insert({ name, price, teacher_id: teacherId });
                  fetchData();
                }
              }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Plus size={18}/> 아이템 추가</button>
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
                    <button onClick={async () => {
                      await supabase.from('seats').update({ status: 'sold', owner_id: seat.pending_buyer_id, pending_buyer_id: null }).eq('id', seat.id).eq('teacher_id', teacherId);
                      fetchData();
                    }} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700"><Check size={20}/></button>
                    <button onClick={async () => {
                      await supabase.from('seats').update({ status: 'available', pending_buyer_id: null }).eq('id', seat.id).eq('teacher_id', teacherId);
                      fetchData();
                    }} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600"><X size={20}/></button>
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
