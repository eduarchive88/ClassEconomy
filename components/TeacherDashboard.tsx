
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, BookOpen, Settings,
  Map, Download, Plus, RefreshCw, Trash2, Check, X, 
  Coins, Megaphone, CheckSquare, Square, History, Save, AlertTriangle,
  UserPlus, FileSpreadsheet, HelpCircle, GraduationCap, Eye, Key, Trash
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student, Transaction, Quiz, SchoolLevel } from '../types';

interface Props { teacherId: string; activeSession: EconomySettings; }

const TeacherDashboard: React.FC<Props> = ({ teacherId, activeSession }) => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('teacher_active_tab') || 'students');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<EconomySettings>(activeSession);
  const [logs, setLogs] = useState<Transaction[]>([]);
  const [logFilter, setLogFilter] = useState('all');
  const [googleApiKey, setGoogleApiKey] = useState(() => localStorage.getItem(`google_api_key_${activeSession.id}`) || '');
  
  // 퀴즈 상태
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [showQuizAddModal, setShowQuizAddModal] = useState(false);
  const [newQuiz, setNewQuiz] = useState({ question: '', o1: '', o2: '', o3: '', o4: '', ans: 1, reward: 1000 });

  // 학생 추가 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);

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
    }
  };

  const handleApiKeySave = () => {
    localStorage.setItem(`google_api_key_${activeSession.id}`, googleApiKey);
    alert('Google API Key가 브라우저에 안전하게 저장되었습니다. (AI 기능 활성화)');
  };

  const updateSessionSetting = async (updates: Partial<EconomySettings>) => {
    const { data, error } = await supabase.from('economy_settings').update(updates).eq('id', settings.id).select().single();
    if (data) { 
      setSettings(data); 
      alert('설정이 저장되었습니다.'); 
      if (updates.session_code) {
        window.location.reload(); // 세션 코드 변경 시 데이터 무결성을 위해 새로고침
      }
    }
    if (error) alert('저장 중 오류가 발생했습니다.');
  };

  const deleteSession = async () => {
    if (!confirm('정말로 이 학급을 삭제하시겠습니까? 학생 데이터와 모든 기록이 사라집니다.')) return;
    const { error } = await supabase.from('economy_settings').delete().eq('id', settings.id);
    if (!error) {
      alert('학급이 삭제되었습니다.');
      window.location.reload();
    } else {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const downloadQuizTemplate = () => {
    const headers = [['문제', '보기1', '보기2', '보기3', '보기4', '정답(1-4)', '수당']];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, "퀴즈양식");
    XLSX.writeFile(wb, "학급경제_퀴즈_양식.xlsx");
  };

  const handleQuizBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        if (error) alert(`오류: ${error.message}`);
        else { alert(`${quizData.length}개의 퀴즈가 등록되었습니다.`); fetchData(); }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMassTransaction = async (amount: number, isTax: boolean, targetIds?: string[]) => {
    const targets = targetIds ? students.filter(s => targetIds.includes(s.id)) : students;
    if (targets.length === 0 || amount <= 0) return;
    const label = isTax ? (targetIds ? '범칙금 부과' : '세금 징수') : '수당 지급';
    if (!confirm(`${label}를 진행할까요? 대상: ${targets.length}명, 금액: ${amount}원`)) return;
    for (const s of targets) {
      const newBalance = isTax ? s.balance - amount : s.balance + amount;
      await supabase.from('students').update({ balance: Math.max(0, newBalance) }).eq('id', s.id);
      await supabase.from('transactions').insert({
        session_code: s.session_code, sender_id: isTax ? s.id : 'GOVERNMENT', sender_name: isTax ? s.name : '정부',
        receiver_id: isTax ? 'GOVERNMENT' : s.id, receiver_name: isTax ? '정부' : s.name,
        amount, type: isTax ? (targetIds ? 'fine' : 'tax') : 'reward', description: isTax ? (targetIds ? '범칙금 부과' : '세금 징수') : '수당 지급'
      });
    }
    alert('완료되었습니다.'); setSelectedStudentIds([]); fetchData();
  };

  const handleIndividualQuizAdd = async () => {
    if (!newQuiz.question || !newQuiz.o1 || !newQuiz.o2) { alert('문제와 보기를 입력해주세요.'); return; }
    const quizToInsert = {
      question: newQuiz.question, options: [newQuiz.o1, newQuiz.o2, newQuiz.o3, newQuiz.o4],
      answer: newQuiz.ans, reward: newQuiz.reward, teacher_id: teacherId, session_code: activeSession.session_code
    };
    const { error } = await supabase.from('quizzes').insert(quizToInsert);
    if (error) alert(`퀴즈 저장 중 오류가 발생했습니다: ${error.message}`);
    else { alert('퀴즈가 추가되었습니다.'); setShowQuizAddModal(false); fetchData(); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border h-fit sticky top-24 space-y-1">
        {[
          { id: 'students', icon: <Users size={18}/>, label: '학생 관리' },
          { id: 'economy', icon: <Landmark size={18}/>, label: '경제 관리' },
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
                <button onClick={downloadQuizTemplate} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><Download size={14}/> 양식 다운</button>
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
                      const studentData = rows.slice(1).filter(row => row[3]).map(row => ({
                        id: `${row[0]}${String(row[1]).padStart(2,'0')}${String(row[2]).padStart(2,'0')}`,
                        grade: String(row[0]), class: String(row[1]), number: String(row[2]), name: String(row[3]),
                        salary: Number(row[4] || 0), balance: 0, bank_balance: 0, brokerage_balance: 0, teacher_id: teacherId, session_code: activeSession.session_code, password: ''
                      }));
                      await supabase.from('students').upsert(studentData); fetchData(); alert(`${studentData.length}명 등록 완료!`);
                    }; reader.readAsArrayBuffer(file);
                  }} accept=".xlsx,.xls,.csv" />
                </label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-y text-slate-500 font-bold">
                    <th className="px-4 py-3">학번</th><th className="px-4 py-3">이름</th>
                    <th className="px-4 py-3 text-indigo-600">총 자산</th>
                    <th className="px-4 py-3">현금</th><th className="px-4 py-3">은행</th><th className="px-4 py-3">증권</th>
                    <th className="px-4 py-3 text-emerald-600">주급</th><th className="px-4 py-3">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 font-mono font-bold text-indigo-600">{s.id}</td>
                      <td className="px-4 py-4 font-bold">{s.name}</td>
                      <td className="px-4 py-4 font-black">{(s.balance + s.bank_balance + s.brokerage_balance).toLocaleString()}</td>
                      {['balance', 'bank_balance', 'brokerage_balance', 'salary'].map(field => (
                        <td key={field} className="px-4 py-4">
                          <div className="flex items-center gap-1 cursor-pointer hover:text-indigo-600" onClick={async () => {
                            const val = prompt(`${field} 수정: 새로운 값을 입력하세요`, String(s[field as keyof Student]));
                            if (val !== null) { await supabase.from('students').update({ [field]: Number(val) }).eq('id', s.id); fetchData(); }
                          }}>{s[field as keyof Student]?.toLocaleString()} <Settings size={10} className="opacity-20"/></div>
                        </td>
                      ))}
                      <td className="px-4 py-4"><button onClick={async () => { if(confirm('삭제하시겠습니까?')) { await supabase.from('students').delete().eq('id', s.id); fetchData(); } }}><Trash2 size={16} className="text-slate-300 hover:text-red-500"/></button></td>
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
                    <div className="col-span-2 p-2 bg-white/50 rounded-lg text-[10px] text-emerald-600 font-bold italic">주급 설정은 [학생 관리] 탭에서 개별 설정하세요.</div>
                  </div>
                </div>
              </div>
              <button onClick={() => updateSessionSetting(settings)} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-indigo-700"><Save size={20}/> 경제 자동화 설정 저장</button>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><HelpCircle size={20}/> 퀴즈 관리</h2>
              <div className="flex gap-2">
                <button onClick={downloadQuizTemplate} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><Download size={14}/> 양식 다운</button>
                <button onClick={() => setShowQuizAddModal(true)} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"><Plus size={14}/> 개별 추가</button>
                <label className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700">
                  <FileSpreadsheet size={14}/> 엑셀 업로드
                  <input type="file" className="hidden" onChange={handleQuizBulkUpload} accept=".xlsx,.xls,.csv" />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              {quizzes.map(q => (
                <div key={q.id} className="p-5 border-2 border-slate-50 rounded-2xl flex justify-between items-start hover:bg-slate-50 transition-colors bg-white">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                       <p className="font-bold text-slate-800 text-base">{q.question}</p>
                       {(q as any).usage_count > 0 && (
                         <span className="text-[10px] font-black px-2 py-1 bg-indigo-600 text-white rounded-lg flex items-center gap-1 shadow-sm">
                           <Eye size={12}/> {(q as any).usage_count}회 출제됨
                         </span>
                       )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 ml-4">
                    <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">₩{q.reward.toLocaleString()}</span>
                    <button onClick={async () => { if(confirm('삭제하시겠습니까?')) { await supabase.from('quizzes').delete().eq('id', q.id); fetchData(); } }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-8">
              <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20}/> 환경 설정</h2>
              
              <div className="space-y-6">
                {/* Google API Key 설정 */}
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
                  <h3 className="font-bold text-amber-800 flex items-center gap-2"><Key size={16}/> Google Gemini API Key 설정</h3>
                  <p className="text-xs text-amber-700">AI 퀴즈 생성, 뉴스 요약 기능을 사용하기 위해 필요합니다. 키는 브라우저에만 저장됩니다.</p>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      placeholder="AI API Key 입력" 
                      value={googleApiKey} 
                      onChange={(e) => setGoogleApiKey(e.target.value)}
                      className="flex-1 p-3 border rounded-xl text-sm"
                    />
                    <button onClick={handleApiKeySave} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold">저장</button>
                  </div>
                </div>

                {/* 학급 정보 수정 */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><GraduationCap size={16}/> 학급 정보 관리</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">학급 이름</label>
                      <input 
                        type="text" 
                        value={settings.class_name} 
                        onChange={(e) => setSettings({...settings, class_name: e.target.value})}
                        className="w-full p-3 border rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">세션 코드 (변경 시 학생들 재로그인 필요)</label>
                      <input 
                        type="text" 
                        value={settings.session_code} 
                        onChange={(e) => setSettings({...settings, session_code: e.target.value.toUpperCase()})}
                        className="w-full p-3 border rounded-xl text-sm font-mono"
                      />
                    </div>
                    <button onClick={() => updateSessionSetting(settings)} className="w-full bg-slate-800 text-white py-3 rounded-xl text-sm font-bold">학급 정보 업데이트</button>
                  </div>
                </div>

                {/* 학급 삭제 */}
                <div className="p-5 bg-red-50 rounded-2xl border border-red-100 space-y-4">
                  <h3 className="font-bold text-red-800 flex items-center gap-2"><Trash size={16}/> 위험 구역</h3>
                  <p className="text-xs text-red-700">학급을 삭제하면 모든 데이터(학생, 자산, 거래 기록)가 영구적으로 삭제됩니다.</p>
                  <button onClick={deleteSession} className="w-full bg-red-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-red-700">학급 영구 삭제</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
