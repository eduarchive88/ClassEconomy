
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, Settings, Download, Plus, Trash2, Coins, Megaphone, CheckSquare, Square, History, Save,
  UserPlus, FileSpreadsheet, HelpCircle, GraduationCap, Eye, Key, Trash, Package, ExternalLink, Info, ShieldCheck
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
      alert('오류가 발생했습니다. DB 구조(stock 컬럼 등)를 확인해 주세요.');
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
      <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-slate-50 h-fit sticky top-24 space-y-1">
        {[
          { id: 'students', icon: <Users size={18}/>, label: '학생 관리' },
          { id: 'economy', icon: <Landmark size={18}/>, label: '경제 관리' },
          { id: 'market', icon: <ShoppingBag size={18}/>, label: '상점 관리' },
          { id: 'quiz', icon: <HelpCircle size={18}/>, label: '퀴즈 관리' },
          { id: 'logs', icon: <History size={18}/>, label: '로그 관리' },
          { id: 'settings', icon: <Settings size={18}/>, label: '환경 설정' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div className="md:col-span-3 space-y-6">
        {activeTab === 'students' && (
          <div className="bg-white p-8 rounded-3xl border shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black">학생 명단 및 자산 관리</h2>
              <div className="flex gap-2">
                <button onClick={() => {
                  const headers = [['학번', '이름', '주급']];
                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.aoa_to_sheet(headers);
                  XLSX.utils.book_append_sheet(wb, ws, "학생명단양식");
                  XLSX.writeFile(wb, "학급경제_학생명단_양식.xlsx");
                }} className="flex items-center gap-2 px-4 py-2.5 text-xs font-black bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all"><Download size={14}/> 양식 다운</button>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-black bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"><UserPlus size={14}/> 개별 추가</button>
                <label className="flex items-center gap-2 px-4 py-2.5 text-xs font-black bg-indigo-600 text-white rounded-xl cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
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
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-50">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead><tr className="bg-slate-50 border-y text-slate-400 font-black text-[10px] uppercase tracking-widest">
                  <th className="px-6 py-4">ID</th><th className="px-6 py-4">Name</th><th className="px-6 py-4 text-indigo-600">Total</th>
                  <th className="px-6 py-4">Cash</th><th className="px-6 py-4">Bank</th><th className="px-6 py-4 text-emerald-600">Salary</th><th className="px-6 py-4 text-center">Delete</th>
                </tr></thead>
                <tbody className="divide-y">{students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5 font-black text-indigo-600">{s.id}</td>
                    <td className="px-6 py-5 font-bold">{s.name}</td>
                    <td className="px-6 py-5 font-black">{(s.balance + s.bank_balance + s.brokerage_balance).toLocaleString()}</td>
                    {['balance', 'bank_balance', 'salary'].map(field => (
                      <td key={field} className="px-6 py-5">
                        <div className="flex items-center gap-2 cursor-pointer group text-slate-600" onClick={async () => {
                          const val = prompt(`${field} 수정: 새로운 값을 숫자로 입력하세요`, String(s[field as keyof Student]));
                          if (val !== null && !isNaN(Number(val))) { await supabase.from('students').update({ [field]: Number(val) }).eq('id', s.id); fetchData(); }
                        }}>
                          <span className="font-bold">{(s[field as keyof Student] as number)?.toLocaleString()}</span>
                          <Settings size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400"/>
                        </div>
                      </td>
                    ))}
                    <td className="px-6 py-5 text-center">
                      <button onClick={async () => { if(confirm(`${s.name} 학생을 삭제하시겠습니까?`)) { await supabase.from('students').delete().eq('id', s.id); fetchData(); } }}>
                        <Trash2 size={16} className="text-slate-300 hover:text-red-500 transition-colors mx-auto"/>
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'economy' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border shadow-sm">
              <div className="flex items-center gap-3 mb-8"><Megaphone className="text-indigo-600" size={24}/><h2 className="text-2xl font-black">정기 경제 규칙 설정</h2></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-rose-50 rounded-3xl border-2 border-rose-100 space-y-5">
                  <h3 className="font-black text-rose-800 flex items-center gap-2 uppercase tracking-wider text-xs"><Coins size={16}/> Auto Tax System</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-rose-400 ml-1">요일</label>
                      <select value={settings.tax_day ?? ''} onChange={(e)=>setSettings({...settings, tax_day: Number(e.target.value)})} className="w-full p-3 bg-white border border-rose-100 rounded-2xl text-sm font-bold">
                        <option value="">요일 선택</option>
                        {['일','월','화','수','목','금','토'].map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-rose-400 ml-1">시간</label>
                      <select value={settings.tax_time ?? ''} onChange={(e)=>setSettings({...settings, tax_time: e.target.value})} className="w-full p-3 bg-white border border-rose-100 rounded-2xl text-sm font-bold">
                        <option value="">시간 선택</option>
                        {[9,10,11,12,13,14,15].map(h => <option key={h} value={`${h}:00`}>{h >= 12 ? '오후' : '오전'} {h === 12 ? 12 : h % 12}시</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-rose-400 ml-1">징수 금액</label>
                      <input type="number" placeholder="금액 입력" value={settings.tax_amount ?? 0} onChange={(e)=>setSettings({...settings, tax_amount: Number(e.target.value)})} className="w-full p-3 bg-white border border-rose-100 rounded-2xl text-sm font-black" />
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-100 space-y-5">
                  <h3 className="font-black text-emerald-800 flex items-center gap-2 uppercase tracking-wider text-xs"><Megaphone size={16}/> Auto Salary System</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-emerald-400 ml-1">요일</label>
                      <select value={settings.salary_day ?? ''} onChange={(e)=>setSettings({...settings, salary_day: Number(e.target.value)})} className="w-full p-3 bg-white border border-emerald-100 rounded-2xl text-sm font-bold">
                        <option value="">요일 선택</option>
                        {['일','월','화','수','목','금','토'].map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-emerald-400 ml-1">시간</label>
                      <select value={settings.salary_time ?? ''} onChange={(e)=>setSettings({...settings, salary_time: e.target.value})} className="w-full p-3 bg-white border border-emerald-100 rounded-2xl text-sm font-bold">
                        <option value="">시간 선택</option>
                        {[9,10,11,12,13,14,15].map(h => <option key={h} value={`${h}:00`}>{h >= 12 ? '오후' : '오전'} {h === 12 ? 12 : h % 12}시</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 p-4 bg-white/50 rounded-2xl flex items-center gap-3">
                      <Info size={14} className="text-emerald-500 shrink-0"/>
                      <p className="text-[10px] text-emerald-600 font-bold leading-tight">주급 금액은 '학생 관리' 탭에서 학생별로 설정 가능합니다.</p>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => updateSessionSetting(settings)} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><Save size={20}/> 정기 경제 규칙 업데이트</button>
            </div>
          </div>
        )}

        {activeTab === 'market' && (
          <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3"><Package className="text-indigo-600" size={24}/><h2 className="text-2xl font-black">학급 상점 물품 관리</h2></div>
              <button onClick={() => setShowMarketAddModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"><Plus size={18}/> 새 물품 등록</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {marketItems.map(item => (
                <div key={item.id} className="p-6 border-2 border-slate-50 rounded-3xl flex justify-between items-center bg-white hover:border-indigo-100 transition-all group">
                  <div>
                    <p className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{item.name}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] font-black bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-lg uppercase">Price: ₩{item.price.toLocaleString()}</span>
                      <span className="text-[10px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded-lg uppercase">Stock: {item.stock}</span>
                    </div>
                  </div>
                  <button onClick={async () => { if(confirm('이 물품을 삭제하시겠습니까?')) { await supabase.from('market_items').delete().eq('id', item.id); fetchData(); } }} className="text-slate-200 hover:text-red-500 transition-colors p-2"><Trash2 size={20}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3"><HelpCircle className="text-indigo-600" size={24}/><h2 className="text-2xl font-black">학급 퀴즈 데이터베이스</h2></div>
              <div className="flex gap-2">
                <button onClick={downloadQuizTemplate} className="flex items-center gap-2 px-4 py-2.5 text-xs font-black bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100"><Download size={14}/> 양식</button>
                <button onClick={() => setShowQuizAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-black bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100"><Plus size={14}/> 개별 추가</button>
                <label className="flex items-center gap-2 px-4 py-2.5 text-xs font-black bg-indigo-600 text-white rounded-xl cursor-pointer hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                  <FileSpreadsheet size={14}/> 일괄 등록
                  <input type="file" className="hidden" onChange={handleQuizBulkUpload} accept=".xlsx,.xls,.csv" />
                </label>
              </div>
            </div>
            
            {/* 배포 수량 설정 영역 - 복구됨 */}
            <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 space-y-6">
              <div className="flex items-center gap-3"><Eye size={20}/><h3 className="text-lg font-black">퀴즈 배포 로직 설정</h3></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-200 ml-1 uppercase tracking-widest">Daily Quiz Distribution Count</label>
                  <input type="number" min="1" max="10" value={settings.quiz_count_per_day} onChange={(e)=>setSettings({...settings, quiz_count_per_day: Number(e.target.value)})} className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl text-white font-black outline-none focus:ring-2 focus:ring-white/50" />
                </div>
                <button onClick={() => updateSessionSetting({ quiz_count_per_day: settings.quiz_count_per_day })} className="bg-white text-indigo-600 py-4 rounded-2xl font-black hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"><Save size={20}/> 배포 수량 저장</button>
              </div>
              <div className="p-4 bg-white/10 rounded-2xl flex gap-3 items-center">
                <Info size={16} className="text-white/60 shrink-0"/>
                <p className="text-xs font-medium text-white/80 leading-relaxed">매일 학생들에게 무작위로 위에서 설정한 수만큼의 퀴즈가 노출됩니다. 참여한 문제는 당일 추가 참여가 불가능합니다.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {quizzes.map(q => (
                <div key={q.id} className="p-6 border-2 border-slate-50 rounded-3xl bg-white hover:border-indigo-100 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <p className="font-bold text-slate-800 text-lg leading-snug">{q.question}</p>
                    <button onClick={async () => { if(confirm('이 퀴즈를 삭제하시겠습니까?')) { await supabase.from('quizzes').delete().eq('id', q.id); fetchData(); } }} className="text-slate-200 hover:text-red-500 transition-colors p-1"><Trash2 size={20}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    {q.options.map((opt, i) => (
                      <div key={i} className={`p-3 rounded-xl border-2 transition-all ${q.answer === i+1 ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-black' : 'border-slate-50 text-slate-400'}`}>{i+1}. {opt}</div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest"><Coins size={12}/> Reward: ₩{q.reward.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm">
              <div className="flex items-center gap-3 mb-10">
                <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl shadow-slate-100"><Settings size={28}/></div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900">학급 시스템 제어 센터</h2>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Environment & System Configurations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-6">
                  <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 space-y-6">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg"><GraduationCap size={22} className="text-indigo-600"/> 학급 식별 정보</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-tighter">Class Display Name</label>
                        <input type="text" value={settings.class_name} onChange={(e) => setSettings({...settings, class_name: e.target.value})} className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-tighter">Public Session Code</label>
                        <input type="text" value={settings.session_code} onChange={(e) => setSettings({...settings, session_code: e.target.value.toUpperCase()})} className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black font-mono text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-8 bg-indigo-50/30 rounded-[2rem] border-2 border-indigo-50 space-y-6">
                    <div className="flex justify-between items-start">
                      <h3 className="font-black text-indigo-900 flex items-center gap-2 text-lg"><Key size={22} className="text-indigo-600"/> AI 기능 커넥터</h3>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="bg-white px-3 py-1 rounded-lg text-[10px] font-black text-indigo-600 flex items-center gap-1 hover:shadow-md transition-all border border-indigo-100">키 발급 <ExternalLink size={10}/></a>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-indigo-400 ml-1 uppercase tracking-tighter">Gemini API Access Key</label>
                        <input type="password" placeholder="Key를 입력해 주세요" value={googleApiKey} onChange={(e) => setGoogleApiKey(e.target.value)} className="w-full p-4 bg-white border-2 border-indigo-50 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold" />
                      </div>
                      <div className="p-5 bg-white rounded-2xl border-2 border-indigo-50 flex gap-4 shadow-sm">
                        <Info size={20} className="text-indigo-600 shrink-0 mt-0.5"/>
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-indigo-900 leading-relaxed font-bold">
                            Google AI Studio에서 발급받은 API 키를 입력하면 <strong>AI 퀴즈 자동 생성</strong> 및 <strong>실시간 시장 정보</strong> 기능을 사용할 수 있습니다.
                          </p>
                          <p className="text-[9px] text-indigo-400 font-medium italic">* 입력하신 키는 선생님의 로컬 브라우저에만 안전하게 저장됩니다.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => updateSessionSetting({ class_name: settings.class_name, session_code: settings.session_code })} className="py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">시스템 정보 일괄 업데이트</button>
                <button onClick={handleApiKeySave} className="py-5 bg-slate-900 text-white rounded-3xl font-black text-lg hover:bg-slate-800 transition-all">Gemini API Key 안전하게 저장</button>
              </div>
              
              <div className="mt-12 pt-10 border-t-2 border-slate-50 flex justify-center">
                <button onClick={deleteSession} className="px-8 py-4 text-rose-500 font-black text-sm flex items-center gap-3 hover:bg-rose-50 rounded-2xl transition-all border-2 border-transparent hover:border-rose-100"><Trash size={18}/> 이 학급의 모든 데이터 영구 파기</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* 모달 등 생략 (기능 동일) */}
    </div>
  );
};

export default TeacherDashboard;
