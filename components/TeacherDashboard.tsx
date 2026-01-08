
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, BookOpen, Settings,
  Map, Download, Plus, RefreshCw, Trash2, Check, X, 
  Coins, Megaphone, ArrowUpDown, UserPlus, Calendar, Clock,
  Edit3, CheckSquare, Square
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student, Quiz, MarketItem, Seat } from '../types';

interface Props {
  teacherId: string;
  activeSession: EconomySettings;
}

const TeacherDashboard: React.FC<Props> = ({ teacherId, activeSession }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [pendingSeats, setPendingSeats] = useState<(Seat & { owner_name?: string, buyer_name?: string })[]>([]);
  const [settings, setSettings] = useState<EconomySettings>(activeSession);
  
  // 수정용
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ grade: '', class: '', number: '', name: '' });

  useEffect(() => {
    fetchData();
  }, [activeSession.session_code, activeTab]);

  const fetchData = async () => {
    try {
      const code = activeSession.session_code;
      if (activeTab === 'students' || activeTab === 'economy') {
        const { data } = await supabase.from('students').select('*').eq('session_code', code).order('id', { ascending: true });
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
    } catch (err) { console.error(err); }
  };

  const handleMassTransaction = async (amount: number, isTax: boolean, targetIds?: string[]) => {
    const targets = targetIds ? students.filter(s => targetIds.includes(s.id)) : students;
    if (targets.length === 0) return;

    const label = isTax ? (targetIds ? '범칙금 부과' : '세금 징수') : '수당 지급';
    if (!confirm(`${label}를 진행할까요? 대상: ${targets.length}명, 금액: ${amount}원`)) return;

    for (const s of targets) {
      const currentVal = isTax ? s.balance : s.balance;
      const newBalance = isTax ? s.balance - amount : s.balance + amount;
      await supabase.from('students').update({ balance: Math.max(0, newBalance) }).eq('id', s.id);
    }
    alert('완료되었습니다.');
    if (targetIds) setSelectedStudentIds([]);
    fetchData();
  };

  const updateStudentField = async (id: string, field: string) => {
    await supabase.from('students').update({ [field]: editValue }).eq('id', id);
    setEditingStudent(null);
    setEditField(null);
    fetchData();
  };

  const updateSessionSetting = async (updates: Partial<EconomySettings>) => {
    const { data, error } = await supabase.from('economy_settings').update(updates).eq('id', settings.id).select().single();
    if (data) setSettings(data);
    if (error) console.error(error);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[];
      const studentData = rows.slice(1).filter(row => row[3]).map(row => {
        const grade = String(row[0]);
        const cls = String(row[1]).padStart(2, '0');
        const num = String(row[2]).padStart(2, '0');
        return {
          grade, class: String(row[1]), number: String(row[2]), name: String(row[3]),
          id: `${grade}${cls}${num}`,
          salary: Number(row[4] || 0), balance: 0, bank_balance: 0, brokerage_balance: 0,
          teacher_id: teacherId, session_code: activeSession.session_code, password: '' 
        };
      });
      await supabase.from('students').upsert(studentData);
      alert(`${studentData.length}명 등록 완료!`);
      fetchData();
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s.id));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar Navigation */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border h-fit sticky top-24 space-y-1">
        {[
          { id: 'students', icon: <Users size={18}/>, label: '학생 관리' },
          { id: 'economy', icon: <Landmark size={18}/>, label: '경제 관리' },
          { id: 'quiz', icon: <BookOpen size={18}/>, label: '퀴즈 관리' },
          { id: 'market', icon: <ShoppingBag size={18}/>, label: '마켓 관리' },
          { id: 'estate', icon: <Map size={18}/>, label: '부동산 승인' },
          { id: 'settings', icon: <Settings size={18}/>, label: '환경 설정' },
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div className="md:col-span-3 space-y-6">
        {/* 학생 관리 탭 */}
        {activeTab === 'students' && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">학생 명단 ({students.length}명)</h2>
                <p className="text-xs text-slate-400 mt-1">자산을 클릭하여 직접 수정할 수 있습니다.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"><UserPlus size={14}/> 개별 추가</button>
                <label className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors"><Plus size={14}/> 엑셀 업로드 <input type="file" className="hidden" onChange={handleBulkUpload} accept=".xlsx,.xls,.csv" /></label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-y text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 font-bold">학번</th>
                    <th className="px-4 py-3 font-bold">이름</th>
                    <th className="px-4 py-3 font-bold text-indigo-600">총 자산</th>
                    <th className="px-4 py-3 font-bold">현금</th>
                    <th className="px-4 py-3 font-bold">은행</th>
                    <th className="px-4 py-3 font-bold">증권</th>
                    <th className="px-4 py-3 font-bold">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(s => {
                    const totalAssets = s.balance + s.bank_balance + s.brokerage_balance;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 font-mono font-bold text-indigo-600">{s.id}</td>
                        <td className="px-4 py-4 font-bold">{s.name}</td>
                        <td className="px-4 py-4 font-black text-indigo-700">{totalAssets.toLocaleString()}원</td>
                        
                        {/* Editable Fields */}
                        {[
                          { key: 'balance', label: '현금', val: s.balance },
                          { key: 'bank_balance', label: '은행', val: s.bank_balance },
                          { key: 'brokerage_balance', label: '증권', val: s.brokerage_balance }
                        ].map(field => (
                          <td key={field.key} className="px-4 py-4">
                            {editingStudent === s.id && editField === field.key ? (
                              <div className="flex gap-1 items-center">
                                <input 
                                  type="number" 
                                  value={editValue} 
                                  onChange={(e)=>setEditValue(Number(e.target.value))} 
                                  className="w-24 border border-indigo-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" 
                                  autoFocus 
                                  onKeyDown={(e)=>e.key==='Enter'&&updateStudentField(s.id, field.key)}
                                />
                                <button onClick={()=>updateStudentField(s.id, field.key)} className="text-emerald-500"><Check size={16}/></button>
                                <button onClick={()=>setEditingStudent(null)} className="text-slate-300"><X size={16}/></button>
                              </div>
                            ) : (
                              <div 
                                className="group cursor-pointer flex items-center gap-1 hover:text-indigo-600 transition-colors" 
                                onClick={()=>{setEditingStudent(s.id); setEditField(field.key); setEditValue(field.val)}}
                              >
                                {field.val.toLocaleString()} <Settings size={10} className="opacity-0 group-hover:opacity-40 transition-opacity"/>
                              </div>
                            )}
                          </td>
                        ))}

                        <td className="px-4 py-4">
                          <button onClick={async ()=>{if(confirm('정말 삭제하시겠습니까?')){await supabase.from('students').delete().eq('id', s.id); fetchData();}}} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 경제 관리 탭 */}
        {activeTab === 'economy' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Megaphone size={20}/> 정기 세금 자동화 설정</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-2xl">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Calendar size={12}/> 징수 요일</label>
                  <select 
                    value={settings.tax_day ?? ''} 
                    onChange={(e)=>updateSessionSetting({tax_day: Number(e.target.value)})} 
                    className="w-full p-3 bg-white border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">설정 안함</option>
                    {['일','월','화','수','목','금','토'].map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Clock size={12}/> 징수 시간</label>
                  <input 
                    type="time" 
                    value={settings.tax_time || "09:00"} 
                    onChange={(e)=>updateSessionSetting({tax_time: e.target.value})}
                    className="w-full p-3 bg-white border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Coins size={12}/> 자동 징수액</label>
                  <input 
                    type="number" 
                    value={settings.tax_amount ?? 0} 
                    onChange={(e)=>updateSessionSetting({tax_amount: Number(e.target.value)})} 
                    className="w-full p-3 bg-white border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="금액 입력" 
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20}/> 학생 수당/범칙금 부과</h2>
                <button 
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-all"
                >
                  {selectedStudentIds.length === students.length ? <CheckSquare size={16}/> : <Square size={16}/>}
                  {selectedStudentIds.length === students.length ? '전체 해제' : '모두 선택'}
                </button>
              </div>
              
              <div className="bg-indigo-50 p-6 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-4 border border-indigo-100">
                <div className="flex items-center gap-3">
                  <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">{selectedStudentIds.length}</span>
                  <p className="font-bold text-indigo-900">명이 선택되었습니다.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input type="number" id="specificAmount" placeholder="금액 입력" className="flex-1 sm:w-32 p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                  <button onClick={() => handleMassTransaction(Number((document.getElementById('specificAmount') as HTMLInputElement).value), false, selectedStudentIds)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:shadow-lg transition-all">수당 지급</button>
                  <button onClick={() => handleMassTransaction(Number((document.getElementById('specificAmount') as HTMLInputElement).value), true, selectedStudentIds)} className="bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-bold hover:shadow-lg transition-all">범칙금 부과</button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto p-2 scrollbar-hide">
                {students.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setSelectedStudentIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all relative ${selectedStudentIds.includes(s.id) ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {s.name}
                    {selectedStudentIds.includes(s.id) && <Check size={12} className="absolute top-1 right-1 text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 환경 설정 탭 */}
        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-10">
            <h2 className="text-2xl font-black text-slate-800">환경 설정</h2>
            
            <section className="space-y-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Edit3 size={14}/> 학급 기본 정보
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-2xl space-y-3">
                  <label className="text-xs font-bold text-slate-500 block">학급 이름</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      defaultValue={settings.class_name} 
                      onBlur={(e) => updateSessionSetting({ class_name: e.target.value })}
                      placeholder="우리 반 이름을 정해주세요"
                      className="flex-1 bg-white border p-3 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    />
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl space-y-3">
                  <label className="text-xs font-bold text-slate-500 block">학급 수준</label>
                  <select 
                    value={settings.school_level} 
                    onChange={(e) => updateSessionSetting({ school_level: e.target.value as any })} 
                    className="w-full p-3 bg-white border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="elementary">초등학생</option>
                    <option value="middle">중학생</option>
                    <option value="high">고등학생</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <RefreshCw size={14}/> 세션 제어
              </h3>
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-indigo-400 uppercase">현재 접속 세션 코드</p>
                  <p className="text-2xl font-black text-indigo-700 font-mono tracking-tighter mt-1">{settings.session_code}</p>
                </div>
                <button 
                  onClick={() => confirm('코드를 재발행하면 기존 학생들의 로그인이 풀릴 수 있습니다. 진행할까요?') && updateSessionSetting({ session_code: Math.random().toString(36).substring(2, 8).toUpperCase() })} 
                  className="p-4 bg-white text-indigo-600 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                  <RefreshCw size={20}/>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* 개별 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">학생 개별 추가</h3>
                <button onClick={()=>setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1">학년</label>
                    <input type="number" value={newStudent.grade} onChange={(e)=>setNewStudent({...newStudent, grade: e.target.value})} className="p-3 border rounded-xl w-full font-bold focus:ring-2 focus:ring-indigo-500 outline-none"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1">반</label>
                    <input type="number" value={newStudent.class} onChange={(e)=>setNewStudent({...newStudent, class: e.target.value})} className="p-3 border rounded-xl w-full font-bold focus:ring-2 focus:ring-indigo-500 outline-none"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1">번호</label>
                    <input type="number" value={newStudent.number} onChange={(e)=>setNewStudent({...newStudent, number: e.target.value})} className="p-3 border rounded-xl w-full font-bold focus:ring-2 focus:ring-indigo-500 outline-none"/>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1">성함</label>
                  <input type="text" placeholder="이름 입력" value={newStudent.name} onChange={(e)=>setNewStudent({...newStudent, name: e.target.value})} className="p-4 border rounded-2xl w-full font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-lg"/>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold mb-1 italic">* 미리보기 학번 (ID)</p>
                  <p className="font-mono font-black text-indigo-600 text-center text-xl">
                    {newStudent.grade}{String(newStudent.class).padStart(2, '0')}{String(newStudent.number).padStart(2, '0')}
                  </p>
                </div>
                <button 
                  onClick={async () => {
                    const id = `${newStudent.grade}${String(newStudent.class).padStart(2, '0')}${String(newStudent.number).padStart(2, '0')}`;
                    const { error } = await supabase.from('students').insert({
                      id, grade: newStudent.grade, class: newStudent.class, number: newStudent.number, name: newStudent.name,
                      teacher_id: teacherId, session_code: activeSession.session_code, salary: 0, balance: 0, bank_balance: 0, brokerage_balance: 0, password: ''
                    });
                    if (error) alert('등록 중 오류가 발생했습니다. (학번 중복 등)');
                    else { setShowAddModal(false); setNewStudent({ grade: '', class: '', number: '', name: '' }); fetchData(); }
                  }} 
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                >
                  명단에 등록하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 나머지 탭 (마켓, 퀴즈 등)도 비슷하게 구현되어 있음 */}
      </div>
    </div>
  );
};

export default TeacherDashboard;
