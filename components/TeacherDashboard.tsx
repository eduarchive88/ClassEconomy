
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, BookOpen, Settings,
  Map, Download, Plus, RefreshCw, Trash2, Check, X, 
  Coins, Megaphone, CheckSquare, Square, History, Save, AlertTriangle,
  UserPlus, FileSpreadsheet, HelpCircle, GraduationCap, Eye, Key, Trash, Package
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student, Transaction, Quiz, SchoolLevel, MarketItem } from '../types';

interface Props { teacherId: string; activeSession: EconomySettings; }

const TeacherDashboard: React.FC<Props> = ({ teacherId, activeSession }) => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('teacher_active_tab') || 'students');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<EconomySettings>(activeSession);
  const [logs, setLogs] = useState<Transaction[]>([]);
  const [logFilter, setLogFilter] = useState('all');
  const [googleApiKey, setGoogleApiKey] = useState(() => localStorage.getItem(`google_api_key_${activeSession.id}`) || '');
  
  // 퀴즈 및 상점 상태
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [showQuizAddModal, setShowQuizAddModal] = useState(false);
  const [showMarketAddModal, setShowMarketAddModal] = useState(false);
  const [newQuiz, setNewQuiz] = useState({ question: '', o1: '', o2: '', o3: '', o4: '', ans: 1, reward: 1000 });
  const [newItem, setNewItem] = useState({ name: '', price: 0, stock: 10 });

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
    } else if (activeTab === 'market') {
      const { data } = await supabase.from('market_items').select('*').eq('teacher_id', teacherId);
      if (data) setMarketItems(data);
    }
  };

  const handleApiKeySave = () => {
    localStorage.setItem(`google_api_key_${activeSession.id}`, googleApiKey);
    alert('Google API Key가 브라우저에 저장되었습니다.');
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
        amount, type: isTax ? (targetIds ? 'fine' : 'tax') : 'reward', description: label
      });
    }
    alert('완료되었습니다.'); setSelectedStudentIds([]); fetchData();
  };

  const handleMarketItemAdd = async () => {
    if (!newItem.name || newItem.price <= 0) return alert('물품명과 가격을 확인하세요.');
    const { error } = await supabase.from('market_items').insert({ ...newItem, teacher_id: teacherId });
    if (!error) { setShowMarketAddModal(false); fetchData(); }
  };

  const handleIndividualQuizAdd = async () => {
    if (!newQuiz.question || !newQuiz.o1 || !newQuiz.o2) return alert('문제와 보기를 입력하세요.');
    const { error } = await supabase.from('quizzes').insert({
      question: newQuiz.question, options: [newQuiz.o1, newQuiz.o2, newQuiz.o3, newQuiz.o4],
      answer: newQuiz.ans, reward: newQuiz.reward, teacher_id: teacherId, session_code: activeSession.session_code
    });
    if (!error) { setShowQuizAddModal(false); fetchData(); }
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
            <h2 className="text-xl font-bold mb-6">학생 명단 관리</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead><tr className="bg-slate-50 border-y text-slate-500">
                  <th className="px-4 py-3">학번</th><th className="px-4 py-3">이름</th><th className="px-4 py-3">총 자산</th>
                  <th className="px-4 py-3">현금</th><th className="px-4 py-3">은행</th><th className="px-4 py-3">주급</th><th className="px-4 py-3">삭제</th>
                </tr></thead>
                <tbody className="divide-y">{students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-4 font-bold text-indigo-600">{s.id}</td><td className="px-4 py-4">{s.name}</td>
                    <td className="px-4 py-4 font-black">{(s.balance + s.bank_balance + s.brokerage_balance).toLocaleString()}</td>
                    <td className="px-4 py-4">{s.balance.toLocaleString()}</td><td className="px-4 py-4">{s.bank_balance.toLocaleString()}</td>
                    <td className="px-4 py-4">{s.salary.toLocaleString()}</td>
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20}/> 학생 수당/범칙금 부과</h2>
                <button onClick={() => setSelectedStudentIds(selectedStudentIds.length === students.length ? [] : students.map(s => s.id))} className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  {selectedStudentIds.length === students.length ? <CheckSquare size={16}/> : <Square size={16}/>} 모두 선택
                </button>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl flex gap-3 mb-4">
                <input type="number" id="ecoAmt" placeholder="금액 입력" className="flex-1 p-2 border rounded-xl outline-none" />
                <button onClick={() => handleMassTransaction(Number((document.getElementById('ecoAmt') as HTMLInputElement).value), false, selectedStudentIds)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">수당 지급</button>
                <button onClick={() => handleMassTransaction(Number((document.getElementById('ecoAmt') as HTMLInputElement).value), true, selectedStudentIds)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold">범칙금 부과</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                {students.map(s => (
                  <button key={s.id} onClick={() => setSelectedStudentIds(p => p.includes(s.id) ? p.filter(id => id !== s.id) : [...p, s.id])} className={`p-2 rounded-lg border text-xs font-bold transition-all ${selectedStudentIds.includes(s.id) ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{s.name}</button>
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
                  <div>
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">가격: {item.price.toLocaleString()}원 | 재고: {item.stock}개</p>
                  </div>
                  <button onClick={async () => { if(confirm('삭제?')) { await supabase.from('market_items').delete().eq('id', item.id); fetchData(); } }} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><HelpCircle size={20}/> 퀴즈 관리</h2>
              <button onClick={() => setShowQuizAddModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><Plus size={16}/> 개별 추가</button>
            </div>
            <div className="space-y-4">
              {quizzes.map(q => (
                <div key={q.id} className="p-5 border-2 border-slate-50 rounded-2xl bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 text-lg">{q.question}</p>
                      <span className="text-[10px] font-black px-2 py-1 bg-indigo-600 text-white rounded-lg flex items-center gap-1"><Eye size={12}/> {q.usage_count || 0}회 출제</span>
                    </div>
                    <button onClick={async () => { if(confirm('삭제?')) { await supabase.from('quizzes').delete().eq('id', q.id); fetchData(); } }} className="text-slate-300 hover:text-red-500"><Trash2 size={20}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {q.options.map((opt, i) => (
                      <div key={i} className={`p-2 rounded-xl text-xs border ${q.answer === i + 1 ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-700' : 'border-slate-100 text-slate-500'}`}>
                        {i + 1}. {opt}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-black text-emerald-600">성공 보상: ₩{q.reward.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-8">
            <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20}/> 환경 설정</h2>
            <div className="space-y-6">
              <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
                <h3 className="font-bold text-amber-800 flex items-center gap-2"><Key size={16}/> Gemini API Key 설정</h3>
                <div className="flex gap-2">
                  <input type="password" placeholder="API Key 입력" value={googleApiKey} onChange={(e) => setGoogleApiKey(e.target.value)} className="flex-1 p-3 border rounded-xl text-sm" />
                  <button onClick={handleApiKeySave} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold">저장</button>
                </div>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><GraduationCap size={16}/> 학급 정보 수정</h3>
                <input type="text" value={settings.session_code} onChange={(e) => setSettings({...settings, session_code: e.target.value.toUpperCase()})} className="w-full p-3 border rounded-xl text-sm font-mono" />
                <button onClick={() => updateSessionSetting({ session_code: settings.session_code })} className="w-full bg-slate-800 text-white py-3 rounded-xl text-sm font-bold">코드 변경</button>
              </div>
              <button onClick={deleteSession} className="w-full bg-red-600 text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><Trash size={18}/> 학급 삭제</button>
            </div>
          </div>
        )}
      </div>

      {showQuizAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-6">퀴즈 추가</h3>
            <div className="space-y-4">
              <input type="text" placeholder="문제" value={newQuiz.question} onChange={e=>setNewQuiz({...newQuiz, question: e.target.value})} className="w-full p-3 border rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="보기1" value={newQuiz.o1} onChange={e=>setNewQuiz({...newQuiz, o1: e.target.value})} className="p-2 border rounded-lg" />
                <input type="text" placeholder="보기2" value={newQuiz.o2} onChange={e=>setNewQuiz({...newQuiz, o2: e.target.value})} className="p-2 border rounded-lg" />
                <input type="text" placeholder="보기3" value={newQuiz.o3} onChange={e=>setNewQuiz({...newQuiz, o3: e.target.value})} className="p-2 border rounded-lg" />
                <input type="text" placeholder="보기4" value={newQuiz.o4} onChange={e=>setNewQuiz({...newQuiz, o4: e.target.value})} className="p-2 border rounded-lg" />
              </div>
              <select value={newQuiz.ans} onChange={e=>setNewQuiz({...newQuiz, ans: Number(e.target.value)})} className="w-full p-2 border rounded-lg">
                {[1,2,3,4].map(n=><option key={n} value={n}>{n}번이 정답</option>)}
              </select>
              <input type="number" placeholder="보상금" value={newQuiz.reward} onChange={e=>setNewQuiz({...newQuiz, reward: Number(e.target.value)})} className="w-full p-3 border rounded-xl" />
              <div className="flex gap-2">
                <button onClick={()=>setShowQuizAddModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl">취소</button>
                <button onClick={handleIndividualQuizAdd} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMarketAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-6">물품 등록</h3>
            <div className="space-y-4">
              <input type="text" placeholder="물품명" value={newItem.name} onChange={e=>setNewItem({...newItem, name: e.target.value})} className="w-full p-3 border rounded-xl" />
              <input type="number" placeholder="가격" value={newItem.price} onChange={e=>setNewItem({...newItem, price: Number(e.target.value)})} className="w-full p-3 border rounded-xl" />
              <input type="number" placeholder="재고" value={newItem.stock} onChange={e=>setNewItem({...newItem, stock: Number(e.target.value)})} className="w-full p-3 border rounded-xl" />
              <div className="flex gap-2">
                <button onClick={()=>setShowMarketAddModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl">취소</button>
                <button onClick={handleMarketItemAdd} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl">등록</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
