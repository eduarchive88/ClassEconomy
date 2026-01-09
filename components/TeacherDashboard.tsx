
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, Settings, Download, Plus, Trash2, Coins, Megaphone, CheckSquare, Square, History, Save,
  UserPlus, FileSpreadsheet, HelpCircle, GraduationCap, Eye, Key, Trash, Package, ExternalLink, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student, Transaction, Quiz } from '../types';

interface Props { teacherId: string; activeSession: EconomySettings; }

const TeacherDashboard: React.FC<Props> = ({ teacherId, activeSession }) => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('teacher_active_tab') || 'students');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<EconomySettings>(activeSession);
  const [logs, setLogs] = useState<Transaction[]>([]);
  const [logFilter, setLogFilter] = useState('all');
  const [googleApiKey, setGoogleApiKey] = useState(() => localStorage.getItem(`google_api_key_${activeSession.id}`) || '');
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [showQuizAddModal, setShowQuizAddModal] = useState(false);
  const [showMarketAddModal, setShowMarketAddModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuiz, setNewQuiz] = useState({ question: '', o1: '', o2: '', o3: '', o4: '', ans: 1, reward: 1000 });
  const [newItem, setNewItem] = useState({ name: '', price: 0, stock: 10 });
  const [newStudent, setNewStudent] = useState({ id: '', name: '', salary: 0 });

  useEffect(() => { localStorage.setItem('teacher_active_tab', activeTab); }, [activeTab]);
  useEffect(() => { fetchData(); }, [activeSession.session_code, activeTab]);

  const fetchData = async () => {
    const code = activeSession.session_code;
    if (activeTab === 'students' || activeTab === 'economy') {
      const { data } = await supabase.from('students').select('*').eq('session_code', code).order('id', { ascending: true });
      if (data) setStudents(data);
    } else if (activeTab === 'logs') {
      let query = supabase.from('transactions').select('*').eq('session_code', code).order('created_at', { ascending: false });
      if (logFilter !== 'all') query = query.eq('type', logFilter);
      const { data } = await query;
      if (data) setLogs(data);
    } else if (activeTab === 'quiz') {
      const { data } = await supabase.from('quizzes').select('*').eq('session_code', code).order('usage_count', { ascending: true });
      if (data) setQuizzes(data);
    } else if (activeTab === 'market') {
      const { data } = await supabase.from('market_items').select('*').eq('teacher_id', teacherId);
      if (data) setMarketItems(data);
    }
  };

  const handleApiKeySave = () => {
    localStorage.setItem(`google_api_key_${activeSession.id}`, googleApiKey);
    alert('Google API Key가 안전하게 저장되었습니다.');
  };

  const updateSessionSetting = async (updates: Partial<EconomySettings>) => {
    const { data, error } = await supabase.from('economy_settings').update(updates).eq('id', settings.id).select().single();
    if (data) { setSettings(data); alert('저장되었습니다.'); if (updates.session_code) window.location.reload(); }
    if (error) alert('오류가 발생했습니다.');
  };

  const deleteSession = async () => {
    if (!confirm('학급을 영구 삭제하시겠습니까?')) return;
    await supabase.from('economy_settings').delete().eq('id', settings.id);
    window.location.reload();
  };

  const handleMassTransaction = async (amount: number, isTax: boolean, targetIds?: string[]) => {
    const targets = targetIds && targetIds.length > 0 ? students.filter(s => targetIds.includes(s.id)) : students;
    if (targets.length === 0 || amount <= 0) return;
    const label = isTax ? (targetIds && targetIds.length > 0 ? '범칙금 부과' : '세금 징수') : '수당 지급';
    if (!confirm(`${label}를 진행할까요? 대상: ${targets.length}명, 금액: ${amount}원`)) return;
    for (const s of targets) {
      const newBalance = isTax ? s.balance - amount : s.balance + amount;
      await supabase.from('students').update({ balance: Math.max(0, newBalance) }).eq('id', s.id);
      await supabase.from('transactions').insert({
        session_code: s.session_code, sender_id: isTax ? s.id : 'GOVERNMENT', sender_name: isTax ? s.name : '정부',
        receiver_id: isTax ? 'GOVERNMENT' : s.id, receiver_name: isTax ? '정부' : s.name,
        amount, type: isTax ? (targetIds && targetIds.length > 0 ? 'fine' : 'tax') : 'reward', description: label
      });
    }
    alert('완료되었습니다.'); setSelectedStudentIds([]); fetchData();
  };

  const handleMarketItemAdd = async () => {
    if (!newItem.name || newItem.price <= 0) return alert('물품명과 가격을 확인하세요.');
    const { error } = await supabase.from('market_items').insert({ 
      name: newItem.name, price: newItem.price, stock: newItem.stock, teacher_id: teacherId 
    });
    if (!error) { 
      setShowMarketAddModal(false); setNewItem({ name: '', price: 0, stock: 10 }); fetchData(); 
    } else {
      alert('오류가 발생했습니다. DB 구조를 확인해 주세요.');
    }
  };

  const handleIndividualQuizAdd = async () => {
    if (!newQuiz.question || !newQuiz.o1 || !newQuiz.o2) return alert('문제와 보기를 입력하세요.');
    const { error } = await supabase.from('quizzes').insert({
      question: newQuiz.question, options: [newQuiz.o1, newQuiz.o2, newQuiz.o3, newQuiz.o4],
      answer: newQuiz.ans, reward: newQuiz.reward, teacher_id: teacherId, session_code: activeSession.session_code
    });
    if (!error) { setShowQuizAddModal(false); fetchData(); }
  };

  const handleStudentAdd = async () => {
    if (!newStudent.id || !newStudent.name) return alert('학번과 이름을 입력하세요.');
    const { error } = await supabase.from('students').insert({
      ...newStudent, balance: 0, bank_balance: 0, brokerage_balance: 0,
      teacher_id: teacherId, session_code: activeSession.session_code
    });
    if (!error) { setShowAddModal(false); setNewStudent({id:'', name:'', salary:0}); fetchData(); }
  };

  const downloadQuizTemplate = () => {
    const headers = [['문제', '보기1', '보기2', '보기3', '보기4', '정답(1-4)', '수당']];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, "퀴즈양식");
    XLSX.writeFile(wb, "학급경제_퀴즈_양식.xlsx");
  };

  const handleQuizBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[];
      const quizData = rows.slice(1).filter(row => row[0]).map(row => ({
        question: String(row[0]), options: [String(row[1]), String(row[2]), String(row[3]), String(row[4])],
        answer: Number(row[5]), reward: Number(row[6] || 1000), teacher_id: teacherId, session_code: activeSession.session_code
      }));
      if (quizData.length > 0) {
        const { error } = await supabase.from('quizzes').insert(quizData);
        if (!error) { alert(`${quizData.length}개 등록 완료!`); fetchData(); }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border h-fit sticky top-24 space-y-1">
        {[
          { id: 'students', icon: <Users size={18}/>, label: '학생 관리' },
          { id: 'economy', icon: <Landmark size={18}/>, label: '경제 관리' },
          { id: 'market', icon: <ShoppingBag size={18}/>, label: '상점 관리' },
          { id: 'quiz', icon: <HelpCircle size={18}/>, label: '퀴즈 관리' },
          { id: 'logs', icon: <History size={18}/>, label: '로그 관리' },
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
              <h2 className="text-xl font-bold">학생 명단 관리</h2>
              <div className="flex gap-2">
                <button onClick={() => {
                  const headers = [['학번', '이름', '주급']];
                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.aoa_to_sheet(headers);
                  XLSX.utils.book_append_sheet(wb, ws, "학생명단양식");
                  XLSX.writeFile(wb, "학급경제_학생명단_양식.xlsx");
                }} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><Download size={14}/> 양식 다운</button>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"><UserPlus size={14}/> 개별 추가</button>
                <label className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700">
                  <FileSpreadsheet size={14}/> 일괄 등록
                  <input type="file" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (evt) => {
                      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                      const workbook = XLSX.read(data, { type: 'array' });
                      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[];
                      const studentData = rows.slice(1).filter(row => row[1]).map(row => ({
                        id: String(row[0]), name: String(row[1]), salary: Number(row[2] || 0),
                        balance: 0, bank_balance: 0, brokerage_balance: 0, teacher_id: teacherId, session_code: activeSession.session_code
                      }));
                      await supabase.from('students').upsert(studentData); fetchData(); alert(`${studentData.length}명 등록 완료!`);
                    }; reader.readAsArrayBuffer(file);
                  }} accept=".xlsx,.xls,.csv" />
                </label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead><tr className="bg-slate-50 border-y text-slate-500 font-bold">
                  <th className="px-4 py-3">학번</th><th className="px-4 py-3">이름</th><th className="px-4 py-3">총 자산</th>
                  <th className="px-4 py-3">현금</th><th className="px-4 py-3">은행</th><th className="px-4 py-3">증권</th><th className="px-4 py-3">주급</th><th className="px-4 py-3">삭제</th>
                </tr></thead>
                <tbody className="divide-y">{students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-4 font-bold text-indigo-600">{s.id}</td>
                    <td className="px-4 py-4">{s.name}</td>
                    <td className="px-4 py-4 font-black">{(s.balance + s.bank_balance + s.brokerage_balance).toLocaleString()}</td>
                    {['balance', 'bank_balance', 'brokerage_balance', 'salary'].map(field => (
                      <td key={field} className="px-4 py-4">
                        <div className="flex items-center gap-1 cursor-pointer hover:text-indigo-600" onClick={async () => {
                          const val = prompt(`${field} 수정: 새로운 값을 입력하세요`, String(s[field as keyof Student]));
                          if (val !== null) { await supabase.from('students').update({ [field]: Number(val) }).eq('id', s.id); fetchData(); }
                        }}>{(s[field as keyof Student] as number)?.toLocaleString()} <Settings size={10} className="opacity-20"/></div>
                      </td>
                    ))}
                    <td className="px-4 py-4"><button onClick={async () => { if(confirm('삭제?')) { await supabase.from('students').delete().eq('id', s.id); fetchData(); } }}><Trash2 size={16} className="text-slate-300 hover:text-red-500"/></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'economy' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Megaphone size={20}/> 정기 세금/주급 설정</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="p-5 bg-red-50 rounded-2xl border border-red-100 space-y-4">
                  <h3 className="font-bold text-red-800 flex items-center gap-2"><Coins size={16}/> 정기 세금 징수</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={settings.tax_day ?? ''} onChange={(e)=>setSettings({...settings, tax_day: Number(e.target.value)})} className="p-2 border rounded-lg text-sm">
                      <option value="">요일 선택</option>
                      {['일','월','화','수','목','금','토'].map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                    </select>
                    <select value={settings.tax_time ?? ''} onChange={(e)=>setSettings({...settings, tax_time: e.target.value})} className="p-2 border rounded-lg text-sm">
                      <option value="">시간 선택</option>
                      {[9,10,11,12,13,14,15].map(h => <option key={h} value={`${h}:00`}>{h >= 12 ? '오후' : '오전'} {h === 12 ? 12 : h % 12}시</option>)}
                    </select>
                    <input type="number" placeholder="징수액" value={settings.tax_amount ?? 0} onChange={(e)=>setSettings({...settings, tax_amount: Number(e.target.value)})} className="p-2 border rounded-lg text-sm col-span-2" />
                  </div>
                </div>
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
                  <h3 className="font-bold text-emerald-800 flex items-center gap-2"><Megaphone size={16}/> 정기 주급 지급</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={settings.salary_day ?? ''} onChange={(e)=>setSettings({...settings, salary_day: Number(e.target.value)})} className="p-2 border rounded-lg text-sm">
                      <option value="">요일 선택</option>
                      {['일','월','화','수','목','금','토'].map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                    </select>
                    <select value={settings.salary_time ?? ''} onChange={(e)=>setSettings({...settings, salary_time: e.target.value})} className="p-2 border rounded-lg text-sm">
                      <option value="">시간 선택</option>
                      {[9,10,11,12,13,14,15].map(h => <option key={h} value={`${h}:00`}>{h >= 12 ? '오후' : '오전'} {h === 12 ? 12 : h % 12}시</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={() => updateSessionSetting(settings)} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"><Save size={20}/> 설정 저장</button>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20}/> 수당/범칙금 일괄 부과</h2>
                <button onClick={() => setSelectedStudentIds(selectedStudentIds.length === students.length ? [] : students.map(s => s.id))} className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  {selectedStudentIds.length === students.length ? <CheckSquare size={16}/> : <Square size={16}/>} 모두 선택
                </button>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl flex gap-3 mb-4">
                <input type="number" id="ecoAmt" placeholder="금액 입력" className="flex-1 p-2 border rounded-xl outline-none" />
                <button onClick={() => handleMassTransaction(Number((document.getElementById('ecoAmt') as HTMLInputElement).value), false, selectedStudentIds)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">지급</button>
                <button onClick={() => handleMassTransaction(Number((document.getElementById('ecoAmt') as HTMLInputElement).value), true, selectedStudentIds)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold">부과</button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {students.map(s => (
                  <button key={s.id} onClick={() => setSelectedStudentIds(p => p.includes(s.id) ? p.filter(id => id !== s.id) : [...p, s.id])} className={`p-2 rounded-lg border text-[10px] font-bold transition-all ${selectedStudentIds.includes(s.id) ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{s.name}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'market' && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Package size={20}/> 상점 물품 관리</h2>
              <button onClick={() => setShowMarketAddModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><Plus size={16}/> 물품 등록</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {marketItems.map(item => (
                <div key={item.id} className="p-4 border rounded-2xl flex justify-between items-center bg-slate-50">
                  <div><p className="font-bold text-slate-800">{item.name}</p><p className="text-xs text-slate-500">₩{item.price.toLocaleString()} | 재고: {item.stock}개</p></div>
                  <button onClick={async () => { if(confirm('삭제?')) { await supabase.from('market_items').delete().eq('id', item.id); fetchData(); } }} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2"><HelpCircle size={20}/> 퀴즈 및 배포 관리</h2>
              <div className="flex gap-2">
                <button onClick={downloadQuizTemplate} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg"><Download size={14}/> 양식</button>
                <button onClick={() => setShowQuizAddModal(true)} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg"><Plus size={14}/> 추가</button>
                <label className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg cursor-pointer">
                  <FileSpreadsheet size={14}/> 일괄
                  <input type="file" className="hidden" onChange={handleQuizBulkUpload} accept=".xlsx,.xls,.csv" />
                </label>
              </div>
            </div>
            
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <label className="block text-sm font-bold text-indigo-900 mb-2">학생별 일일 배포 퀴즈 개수</label>
              <div className="flex gap-2">
                <input type="number" min="1" max="10" value={settings.quiz_count_per_day} onChange={(e)=>setSettings({...settings, quiz_count_per_day: Number(e.target.value)})} className="flex-1 p-3 border rounded-xl" />
                <button onClick={() => updateSessionSetting({ quiz_count_per_day: settings.quiz_count_per_day })} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">저장</button>
              </div>
              <p className="text-[10px] text-indigo-400 mt-2 font-bold">* 매일 무작위로 설정된 개수만큼 학생들에게 퀴즈가 노출됩니다.</p>
            </div>

            <div className="space-y-4">
              {quizzes.map(q => (
                <div key={q.id} className="p-5 border-2 border-slate-50 rounded-2xl bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <p className="font-bold text-slate-800">{q.question}</p>
                    <button onClick={async () => { if(confirm('삭제?')) { await supabase.from('quizzes').delete().eq('id', q.id); fetchData(); } }} className="text-slate-300 hover:text-red-500"><Trash2 size={20}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, i) => (
                      <div key={i} className={`p-2 rounded-lg border ${q.answer === i+1 ? 'border-indigo-600 bg-indigo-50 font-bold' : 'border-slate-100'}`}>{i+1}. {opt}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100"><Settings size={24}/></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">시스템 환경 설정</h2>
                  <p className="text-sm text-slate-400 font-medium">학급 정보와 AI 기능을 제어합니다.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><GraduationCap size={18} className="text-indigo-600"/> 학급 정보</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Class Name</label>
                        <input type="text" value={settings.class_name} onChange={(e) => setSettings({...settings, class_name: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Session Code</label>
                        <input type="text" value={settings.session_code} onChange={(e) => setSettings({...settings, session_code: e.target.value.toUpperCase()})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-indigo-900 flex items-center gap-2"><Key size={18} className="text-indigo-600"/> AI 기능 활성화 (Gemini API)</h3>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:underline">키 발급받기 <ExternalLink size={10}/></a>
                    </div>
                    <div className="space-y-3">
                      <input type="password" placeholder="API Key를 입력하세요" value={googleApiKey} onChange={(e) => setGoogleApiKey(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
                      <div className="p-3 bg-white/80 rounded-2xl border border-indigo-100 flex gap-3">
                        <Info size={16} className="text-indigo-600 shrink-0 mt-0.5"/>
                        <p className="text-[10px] text-indigo-800 leading-relaxed font-medium">
                          <strong>설명:</strong> AI 퀴즈 생성 및 뉴스 요약 기능을 사용하려면 Google Gemini API 키가 필요합니다. 상단 링크에서 무료로 발급받아 저장해 주세요.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={() => updateSessionSetting({ class_name: settings.class_name, session_code: settings.session_code })} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">학급 정보 업데이트</button>
                <button onClick={handleApiKeySave} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all">Gemini API Key 저장</button>
                <button onClick={deleteSession} className="w-full py-4 mt-8 bg-white border-2 border-red-50 text-red-500 rounded-2xl font-black hover:bg-red-50 transition-all flex items-center justify-center gap-2"><Trash size={18}/> 학급 데이터 영구 삭제</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-6">학생 개별 추가</h3>
            <div className="space-y-4">
              <input type="text" placeholder="학번" value={newStudent.id} onChange={e=>setNewStudent({...newStudent, id: e.target.value})} className="w-full p-3 border rounded-xl" />
              <input type="text" placeholder="이름" value={newStudent.name} onChange={e=>setNewStudent({...newStudent, name: e.target.value})} className="w-full p-3 border rounded-xl" />
              <input type="number" placeholder="주급" value={newStudent.salary} onChange={e=>setNewStudent({...newStudent, salary: Number(e.target.value)})} className="w-full p-3 border rounded-xl" />
              <div className="flex gap-2">
                <button onClick={()=>setShowAddModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">취소</button>
                <button onClick={handleStudentAdd} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">등록</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuizAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-6">퀴즈 추가</h3>
            <div className="space-y-4">
              <input type="text" placeholder="문제 내용" value={newQuiz.question} onChange={e=>setNewQuiz({...newQuiz, question: e.target.value})} className="w-full p-3 border rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="보기 1" value={newQuiz.o1} onChange={e=>setNewQuiz({...newQuiz, o1: e.target.value})} className="p-2 border rounded-lg" />
                <input type="text" placeholder="보기 2" value={newQuiz.o2} onChange={e=>setNewQuiz({...newQuiz, o2: e.target.value})} className="p-2 border rounded-lg" />
                <input type="text" placeholder="보기 3" value={newQuiz.o3} onChange={e=>setNewQuiz({...newQuiz, o3: e.target.value})} className="p-2 border rounded-lg" />
                <input type="text" placeholder="보기 4" value={newQuiz.o4} onChange={e=>setNewQuiz({...newQuiz, o4: e.target.value})} className="p-2 border rounded-lg" />
              </div>
              <select value={newQuiz.ans} onChange={e=>setNewQuiz({...newQuiz, ans: Number(e.target.value)})} className="w-full p-3 border rounded-xl">
                {[1,2,3,4].map(n=><option key={n} value={n}>{n}번 정답</option>)}
              </select>
              <input type="number" placeholder="보상" value={newQuiz.reward} onChange={e=>setNewQuiz({...newQuiz, reward: Number(e.target.value)})} className="w-full p-3 border rounded-xl" />
              <button onClick={handleIndividualQuizAdd} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">저장</button>
            </div>
          </div>
        </div>
      )}

      {showMarketAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-6">상점 물품 등록</h3>
            <div className="space-y-4">
              <input type="text" placeholder="물품명 (예: 아이스크림, 칙촉)" value={newItem.name} onChange={e=>setNewItem({...newItem, name: e.target.value})} className="w-full p-3 border rounded-xl" />
              <input type="number" placeholder="가격 (원)" value={newItem.price || ''} onChange={e=>setNewItem({...newItem, price: Number(e.target.value)})} className="w-full p-3 border rounded-xl" />
              <input type="number" placeholder="재고 수량" value={newItem.stock || ''} onChange={e=>setNewItem({...newItem, stock: Number(e.target.value)})} className="w-full p-3 border rounded-xl" />
              <button onClick={handleMarketItemAdd} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">등록하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
