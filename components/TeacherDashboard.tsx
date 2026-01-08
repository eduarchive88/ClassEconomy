
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, BookOpen, Settings,
  Map, Download, Plus, RefreshCw, Trash2, Check, X, 
  Coins, Megaphone, ArrowUpDown, UserPlus, Calendar, Clock
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
    checkAndRunAutoTax();
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

  const checkAndRunAutoTax = async () => {
    if (!settings.tax_day || !settings.tax_amount || settings.tax_amount <= 0) return;
    const now = new Date();
    const day = now.getDay();
    if (day !== Number(settings.tax_day)) return;

    const todayStr = now.toISOString().split('T')[0];
    if (settings.last_auto_tax_date === todayStr) return;

    // 수동 트리거 로직 (실제 스케줄러가 없으므로 교사가 접속했을 때 실행 제안)
    if (confirm(`오늘(${todayStr})은 정기 세금 징수일입니다. 일괄 징수하시겠습니까? (금액: ${settings.tax_amount}원)`)) {
      await handleMassTransaction(settings.tax_amount, true);
      await supabase.from('economy_settings').update({ last_auto_tax_date: todayStr }).eq('id', settings.id);
      setSettings({...settings, last_auto_tax_date: todayStr});
    }
  };

  const handleMassTransaction = async (amount: number, isTax: boolean, targetIds?: string[]) => {
    const targets = targetIds ? students.filter(s => targetIds.includes(s.id)) : students;
    if (targets.length === 0) return;

    const label = isTax ? (targetIds ? '범칙금 부과' : '세금 징수') : '수당 지급';
    if (!confirm(`${label}를 진행할까요? 대상: ${targets.length}명, 금액: ${amount}원`)) return;

    for (const s of targets) {
      const newBalance = isTax ? s.balance - amount : s.balance + amount;
      await supabase.from('students').update({ balance: Math.max(0, newBalance) }).eq('id', s.id);
    }
    alert('완료되었습니다.');
    setSelectedStudentIds([]);
    fetchData();
  };

  const updateStudentField = async (id: string, field: string) => {
    await supabase.from('students').update({ [field]: editValue }).eq('id', id);
    setEditingStudent(null);
    setEditField(null);
    fetchData();
  };

  const updateSessionSetting = async (updates: Partial<EconomySettings>) => {
    const { data } = await supabase.from('economy_settings').update(updates).eq('id', settings.id).select().single();
    if (data) setSettings(data);
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border h-fit sticky top-24 space-y-1">
        {[
          { id: 'students', icon: <Users size={18}/>, label: '학생 관리' },
          { id: 'economy', icon: <Landmark size={18}/>, label: '경제 운영' },
          { id: 'quiz', icon: <BookOpen size={18}/>, label: '퀴즈 관리' },
          { id: 'market', icon: <ShoppingBag size={18}/>, label: '마켓 관리' },
          { id: 'estate', icon: <Map size={18}/>, label: '부동산 승인' },
          { id: 'settings', icon: <Settings size={18}/>, label: '환경 설정' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div className="md:col-span-3 space-y-6">
        {activeTab === 'students' && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">학생 명단 ({students.length}명)</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"><UserPlus size={14}/> 개별 추가</button>
                <label className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors"><Plus size={14}/> 엑셀 업로드 <input type="file" className="hidden" onChange={handleBulkUpload} accept=".xlsx,.xls,.csv" /></label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-y">
                    <th className="px-4 py-3 font-bold text-slate-500">학번</th>
                    <th className="px-4 py-3 font-bold text-slate-500">이름</th>
                    <th className="px-4 py-3 font-bold text-slate-500">현금</th>
                    <th className="px-4 py-3 font-bold text-slate-500">은행</th>
                    <th className="px-4 py-3 font-bold text-slate-500">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 font-mono font-bold text-indigo-600">{s.id}</td>
                      <td className="px-4 py-4 font-bold">{s.name}</td>
                      <td className="px-4 py-4">
                        {editingStudent === s.id && editField === 'balance' ? (
                          <div className="flex gap-1 items-center">
                            <input type="number" value={editValue} onChange={(e)=>setEditValue(Number(e.target.value))} className="w-20 border rounded px-1 text-xs" autoFocus onKeyDown={(e)=>e.key==='Enter'&&updateStudentField(s.id, 'balance')}/>
                            <button onClick={()=>updateStudentField(s.id, 'balance')}><Check size={14}/></button>
                          </div>
                        ) : (
                          <div className="group cursor-pointer flex items-center gap-1" onClick={()=>{setEditingStudent(s.id); setEditField('balance'); setEditValue(s.balance)}}>
                            {s.balance.toLocaleString()} <Settings size={10} className="opacity-0 group-hover:opacity-40"/>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">{s.bank_balance.toLocaleString()}</td>
                      <td className="px-4 py-4"><button onClick={async ()=>{if(confirm('삭제하시겠습니까?')){await supabase.from('students').delete().eq('id', s.id); fetchData();}}}><Trash2 size={16} className="text-slate-300 hover:text-red-500"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'economy' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Megaphone size={20}/> 정기 세금 자동화 설정</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-2xl">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Calendar size={12}/> 징수 요일</label>
                  <select value={settings.tax_day ?? ''} onChange={(e)=>updateSessionSetting({tax_day: Number(e.target.value)})} className="w-full p-3 bg-white border rounded-xl font-bold">
                    <option value="">설정 안함</option>
                    {['일','월','화','수','목','금','토'].map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Coins size={12}/> 자동 징수액</label>
                  <input type="number" value={settings.tax_amount ?? 0} onChange={(e)=>updateSessionSetting({tax_amount: Number(e.target.value)})} className="w-full p-3 bg-white border rounded-xl font-bold" placeholder="금액 입력" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Check size={12}/> 마지막 실행일</label>
                  <div className="p-3 bg-slate-200 rounded-xl text-slate-600 font-mono text-sm">{settings.last_auto_tax_date || '기록 없음'}</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Users size={20}/> 특정 학생 수당/범칙금 부과</h2>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-slate-500">대상을 선택하고 금액을 입력하세요. ({selectedStudentIds.length}명 선택됨)</p>
                <div className="flex gap-2">
                  <input type="number" id="specificAmount" placeholder="금액 입력" className="p-2 border rounded-xl text-sm w-32" />
                  <button onClick={() => handleMassTransaction(Number((document.getElementById('specificAmount') as HTMLInputElement).value), false, selectedStudentIds)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">수당 지급</button>
                  <button onClick={() => handleMassTransaction(Number((document.getElementById('specificAmount') as HTMLInputElement).value), true, selectedStudentIds)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold">범칙금 부과</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto p-2">
                {students.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setSelectedStudentIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${selectedStudentIds.includes(s.id) ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* 나머지 탭 생략 (기존 유지) */}
      </div>
    </div>
  );
};

export default TeacherDashboard;
