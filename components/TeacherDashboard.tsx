
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, BookOpen, Settings,
  Map, Download, Plus, RefreshCw, Trash2, Check, X, 
  Coins, Megaphone, CheckSquare, Square, History, Save, AlertTriangle,
  UserPlus, FileSpreadsheet, HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student, Transaction, Quiz } from '../types';

interface Props {
  teacherId: string;
  activeSession: EconomySettings;
}

const TeacherDashboard: React.FC<Props> = ({ teacherId, activeSession }) => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('teacher_active_tab') || 'students');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<EconomySettings>(activeSession);
  const [logs, setLogs] = useState<Transaction[]>([]);
  const [logFilter, setLogFilter] = useState('all');
  
  // 퀴즈 상태
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [showQuizAddModal, setShowQuizAddModal] = useState(false);
  const [newQuiz, setNewQuiz] = useState({ question: '', o1: '', o2: '', o3: '', o4: '', ans: 1, reward: 1000 });

  // 학생 추가 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ grade: '', class: '', number: '', name: '' });

  useEffect(() => {
    localStorage.setItem('teacher_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [activeSession.session_code, activeTab]);

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
      const { data } = await supabase.from('quizzes').select('*').eq('session_code', code);
      if (data) setQuizzes(data);
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
      
      const quizData = rows.slice(1)
        .filter(row => row[0])
        .map(row => ({
          question: String(row[0]),
          options: [String(row[1]), String(row[2]), String(row[3]), String(row[4])],
          answer: Number(row[5]),
          reward: Number(row[6] || 1000),
          teacher_id: teacherId,
          session_code: activeSession.session_code
        }));

      if (quizData.length > 0) {
        const { error } = await supabase.from('quizzes').insert(quizData);
        if (error) alert('퀴즈 업로드 오류!');
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
        session_code: s.session_code,
        sender_id: isTax ? s.id : 'GOVERNMENT',
        sender_name: isTax ? s.name : '정부',
        receiver_id: isTax ? 'GOVERNMENT' : s.id,
        receiver_name: isTax ? '정부' : s.name,
        amount, type: isTax ? (targetIds ? 'fine' : 'tax') : 'reward',
        description: isTax ? (targetIds ? '범칙금 부과' : '세금 징수') : '수당 지급'
      });
    }
    alert('완료되었습니다.');
    setSelectedStudentIds([]);
    fetchData();
  };

  const updateSessionSetting = async (updates: Partial<EconomySettings>) => {
    const { data, error } = await supabase.from('economy_settings').update(updates).eq('id', settings.id).select().single();
    if (data) {
      setSettings(data);
      alert('설정이 저장되었습니다.');
    }
    if (error) alert('저장 중 오류가 발생했습니다.');
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
                <button onClick={() => {
                  const headers = [['학년', '반', '번호', '이름', '주급']];
                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.aoa_to_sheet(headers);
                  XLSX.utils.book_append_sheet(wb, ws, "학생명단양식");
                  XLSX.writeFile(wb, "학급경제_학생명단_양식.xlsx");
                }} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><Download size={14}/> 양식 다운</button>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"><UserPlus size={14}/> 개별 추가</button>
                <label className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700">
                  <FileSpreadsheet size={14}/> 일괄 등록
                  <input type="file" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
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
                      await supabase.from('students').upsert(studentData);
                      alert(`${studentData.length}명 등록 완료!`);
                      fetchData();
                    };
                    reader.readAsArrayBuffer(file);
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
                            if (val !== null) {
                              await supabase.from('students').update({ [field]: Number(val) }).eq('id', s.id);
                              fetchData();
                            }
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

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20}/> 학생 수당/범칙금 부과</h2>
                <button onClick={() => setSelectedStudentIds(selectedStudentIds.length === students.length ? [] : students.map(s => s.id))} className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  {selectedStudentIds.length === students.length ? <CheckSquare size={16}/> : <Square size={16}/>} 모두 선택
                </button>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl flex gap-3 mb-4">
                <input type="number" id="ecoAmt" placeholder="금액 입력" className="flex-1 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600" />
                <button onClick={() => handleMassTransaction(Number((document.getElementById('ecoAmt') as HTMLInputElement).value), false, selectedStudentIds)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">수당 지급</button>
                <button onClick={() => handleMassTransaction(Number((document.getElementById('ecoAmt') as HTMLInputElement).value), true, selectedStudentIds)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold">범칙금 부과</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                {students.map(s => (
                  <button key={s.id} onClick={() => setSelectedStudentIds(p => p.includes(s.id) ? p.filter(id => id !== s.id) : [...p, s.id])} className={`p-2 rounded-lg border text-xs font-bold transition-all ${selectedStudentIds.includes(s.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-slate-50'}`}>{s.name}</button>
                ))}
              </div>
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

            <div className="p-6 bg-indigo-50 rounded-2xl mb-6 border border-indigo-100 flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-black text-indigo-900 mb-1 block">일일 퀴즈 제공 개수 (매일 자동 갱신)</label>
                <p className="text-[10px] text-indigo-600">설정한 개수만큼 매일 오전 8시에 랜덤으로 학생들에게 노출됩니다.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" value={settings.quiz_count_per_day} onChange={(e)=>setSettings({...settings, quiz_count_per_day: Math.min(10, Math.max(0, Number(e.target.value)))})} className="w-20 p-2 border rounded-xl font-black text-center outline-none focus:ring-2 focus:ring-indigo-600" />
                <button onClick={() => updateSessionSetting(settings)} className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700"><Check size={20}/></button>
              </div>
            </div>

            <div className="space-y-3">
              {quizzes.map(q => (
                <div key={q.id} className="p-4 border rounded-xl flex justify-between items-start hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800">{q.question}</p>
                    <div className="grid grid-cols-2 gap-x-4 mt-2">
                      {q.options.map((opt, i) => (
                        <p key={i} className={`text-xs ${q.answer === i + 1 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                          {i + 1}. {opt} {q.answer === i + 1 && ' (정답)'}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-black text-emerald-600">{q.reward.toLocaleString()}원</span>
                    <button onClick={async () => { if(confirm('삭제하시겠습니까?')) { await supabase.from('quizzes').delete().eq('id', q.id); fetchData(); } }} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
              {quizzes.length === 0 && <p className="text-center py-20 text-slate-400">등록된 퀴즈가 없습니다. 엑셀로 업로드해주세요.</p>}
            </div>
          </div>
        )}

        {/* 퀴즈 개별 추가 모달 */}
        {showQuizAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">퀴즈 개별 추가</h3>
                <button onClick={()=>setShowQuizAddModal(false)}><X size={24}/></button>
              </div>
              <div className="space-y-4">
                <input type="text" placeholder="문제 내용" value={newQuiz.question} onChange={(e)=>setNewQuiz({...newQuiz, question: e.target.value})} className="w-full p-3 border rounded-xl font-bold" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="보기1" value={newQuiz.o1} onChange={(e)=>setNewQuiz({...newQuiz, o1: e.target.value})} className="p-2 border rounded-lg text-sm" />
                  <input type="text" placeholder="보기2" value={newQuiz.o2} onChange={(e)=>setNewQuiz({...newQuiz, o2: e.target.value})} className="p-2 border rounded-lg text-sm" />
                  <input type="text" placeholder="보기3" value={newQuiz.o3} onChange={(e)=>setNewQuiz({...newQuiz, o3: e.target.value})} className="p-2 border rounded-lg text-sm" />
                  <input type="text" placeholder="보기4" value={newQuiz.o4} onChange={(e)=>setNewQuiz({...newQuiz, o4: e.target.value})} className="p-2 border rounded-lg text-sm" />
                </div>
                <div className="flex gap-4 items-center">
                  <label className="text-xs font-bold">정답</label>
                  <select value={newQuiz.ans} onChange={(e)=>setNewQuiz({...newQuiz, ans: Number(e.target.value)})} className="flex-1 p-2 border rounded-lg text-sm">
                    <option value={1}>1번</option><option value={2}>2번</option><option value={3}>3번</option><option value={4}>4번</option>
                  </select>
                </div>
                <input type="number" placeholder="보상 금액" value={newQuiz.reward} onChange={(e)=>setNewQuiz({...newQuiz, reward: Number(e.target.value)})} className="w-full p-3 border rounded-xl font-bold" />
                <button onClick={async () => {
                  const { error } = await supabase.from('quizzes').insert({
                    question: newQuiz.question, options: [newQuiz.o1, newQuiz.o2, newQuiz.o3, newQuiz.o4],
                    answer: newQuiz.ans, reward: newQuiz.reward, teacher_id: teacherId, session_code: activeSession.session_code
                  });
                  if(!error) { setShowQuizAddModal(false); fetchData(); }
                }} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">퀴즈 추가 완료</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
