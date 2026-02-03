
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, Settings, Download, Plus, Trash2, Coins, Megaphone, 
  History, Save, UserPlus, FileSpreadsheet, HelpCircle, GraduationCap, Layout, 
  ShieldCheck, Key, Lock, CheckCircle2, XCircle, RefreshCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student, Transaction, Quiz, Seat } from '../types';

interface Props { teacherId: string; activeSession: EconomySettings; }

const TeacherDashboard: React.FC<Props> = ({ teacherId, activeSession }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ id: '', name: '', salary: 10000 });

  useEffect(() => { fetchData(); }, [activeTab, activeSession.session_code]);

  const fetchData = async () => {
    const code = activeSession.session_code;
    if (activeTab === 'students') {
      const { data } = await supabase.from('students').select('*').eq('session_code', code).order('id', { ascending: true });
      if (data) setStudents(data);
    } else if (activeTab === 'estate') {
      const { data } = await supabase.from('seats').select('*').eq('session_code', code).order('row_idx', { ascending: true }).order('col_idx', { ascending: true });
      if (data) setSeats(data);
    } else if (activeTab === 'market') {
      const { data } = await supabase.from('market_items').select('*').eq('teacher_id', teacherId);
      if (data) setMarketItems(data);
    } else if (activeTab === 'quiz') {
      const { data } = await supabase.from('quizzes').select('*').eq('session_code', code);
      if (data) setQuizzes(data);
    }
  };

  const handleWeeklySalary = async () => {
    if (!confirm('설정된 주급을 모든 학생에게 지급하시겠습니까? (현금으로 지급됨)')) return;
    for (const s of students) {
      if (s.salary <= 0) continue;
      await supabase.from('students').update({ balance: s.balance + s.salary }).eq('id', s.id);
      await supabase.from('transactions').insert({
        session_code: activeSession.session_code, sender_id: 'GOVERNMENT', sender_name: '정부',
        receiver_id: s.id, receiver_name: s.name, amount: s.salary, type: 'salary', description: '주급 지급'
      });
    }
    alert('주급 지급이 완료되었습니다.'); fetchData();
  };

  const handleInterestPayment = async () => {
    if (!confirm('은행 예금 잔액의 2%를 이자로 지급하시겠습니까?')) return;
    for (const s of students) {
      if (s.bank_balance <= 0) continue;
      const interest = Math.floor(s.bank_balance * 0.02);
      if (interest <= 0) continue;
      await supabase.from('students').update({ bank_balance: s.bank_balance + interest }).eq('id', s.id);
      await supabase.from('transactions').insert({
        session_code: activeSession.session_code, sender_id: 'BANK', sender_name: '중앙은행',
        receiver_id: s.id, receiver_name: s.name, amount: interest, type: 'interest', description: '은행 예금 이자(2%)'
      });
    }
    alert('이자 지급이 완료되었습니다.'); fetchData();
  };

  const handleStudentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[];
      // 양식: A학년, B반, C번호, D성명, E주급
      const studentData = rows.slice(1).filter(row => row[3]).map(row => {
        const studentId = `${row[0] || ''}${String(row[1] || '').padStart(2, '0')}${String(row[2] || '').padStart(2, '0')}`;
        return {
          id: studentId, name: String(row[3]), salary: Number(row[4] || 0),
          balance: 0, bank_balance: 0, brokerage_balance: 0, teacher_id: teacherId, session_code: activeSession.session_code
        }
      });
      const { error } = await supabase.from('students').upsert(studentData);
      if (error) alert('업로드 오류: ' + error.message);
      else { alert(`${studentData.length}명의 학생이 등록되었습니다.`); fetchData(); }
    };
    reader.readAsArrayBuffer(file);
  };

  const initializeSeats = async () => {
    if (!confirm('자리 배치도를 초기화(6x6)하시겠습니까? 기존 데이터는 사라집니다.')) return;
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
      <div className="lg:col-span-1 space-y-2">
        {[
          { id: 'students', icon: <Users size={18}/>, label: '학생 & 주급' },
          { id: 'estate', icon: <Layout size={18}/>, label: '부동산(자리)' },
          { id: 'economy', icon: <Coins size={18}/>, label: '경제 자동화' },
          { id: 'market', icon: <ShoppingBag size={18}/>, label: '상점 관리' },
          { id: 'quiz', icon: <HelpCircle size={18}/>, label: '퀴즈 관리' },
          { id: 'settings', icon: <Settings size={18}/>, label: '환경 설정' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="lg:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'students' && (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800">학생 명단 관리</h2>
                <p className="text-sm text-slate-400 font-medium">비밀번호 확인 및 주급 설정이 가능합니다.</p>
              </div>
              <div className="flex gap-2">
                <label className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer hover:bg-slate-200 transition-all flex items-center gap-2">
                  <FileSpreadsheet size={16}/> 엑셀 일괄 등록
                  <input type="file" className="hidden" onChange={handleStudentUpload} accept=".xlsx,.xls,.csv" />
                </label>
                <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-black hover:bg-indigo-700 transition-all flex items-center gap-2">
                  <UserPlus size={16}/> 개별 추가
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-400 font-black text-[10px] uppercase tracking-widest">
                    <th className="px-4 py-4">학번</th>
                    <th className="px-4 py-4">이름</th>
                    <th className="px-4 py-4 text-rose-500"><Lock size={14} className="inline mr-1"/> 비밀번호</th>
                    <th className="px-4 py-4">주급(₩)</th>
                    <th className="px-4 py-4">총 자산</th>
                    <th className="px-4 py-4 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-5 font-mono font-bold text-indigo-600">{s.id}</td>
                      <td className="px-4 py-5 font-black text-slate-800">{s.name}</td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-2 group">
                          <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-lg text-xs font-black">
                            {s.password || '미설정'}
                          </span>
                          <button onClick={async () => {
                            const newPw = prompt(`${s.name} 학생의 새 비밀번호`, s.password || '');
                            if (newPw !== null) { await supabase.from('students').update({ password: newPw }).eq('id', s.id); fetchData(); }
                          }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-600"><Key size={14}/></button>
                        </div>
                      </td>
                      <td className="px-4 py-5 font-bold">
                        <button onClick={async () => {
                          const val = prompt('주급 수정', String(s.salary));
                          if (val && !isNaN(Number(val))) { await supabase.from('students').update({ salary: Number(val) }).eq('id', s.id); fetchData(); }
                        }} className="hover:text-indigo-600 hover:underline">{s.salary.toLocaleString()}</button>
                      </td>
                      <td className="px-4 py-5 font-black text-slate-900">{(s.balance + s.bank_balance + s.brokerage_balance).toLocaleString()}원</td>
                      <td className="px-4 py-5 text-center">
                        <button onClick={async () => { if(confirm('삭제하시겠습니까?')) { await supabase.from('students').delete().eq('id', s.id); fetchData(); } }} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'estate' && (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800">부동산 & 자리 배치</h2>
                <p className="text-sm text-slate-400 font-medium">학생들이 구매할 수 있는 자리를 배치합니다.</p>
              </div>
              <button onClick={initializeSeats} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2">
                <RefreshCcw size={16}/> 자리 배치도 초기화(6x6)
              </button>
            </div>

            <div className="grid grid-cols-6 gap-3 max-w-3xl mx-auto p-6 bg-slate-50 rounded-[3rem] border-4 border-white shadow-inner">
              {seats.map(seat => (
                <div key={seat.id} className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${seat.status === 'sold' ? 'bg-white border-indigo-200 shadow-sm' : 'bg-slate-100/50 border-dashed border-slate-200'}`}>
                  {seat.owner_name ? (
                    <>
                      <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black mb-1">{seat.owner_name[0]}</div>
                      <span className="text-[10px] font-black text-slate-800">{seat.owner_name}</span>
                    </>
                  ) : (
                    <span className="text-[10px] font-black text-slate-300 uppercase">Empty</span>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl text-indigo-600 shadow-sm"><ShieldCheck size={24}/></div>
              <div>
                <p className="text-sm font-black text-indigo-900">부동산 자동 승인 설정</p>
                <div className="flex gap-4 mt-2">
                   <button onClick={() => supabase.from('economy_settings').update({ auto_approve_estate: true }).eq('id', activeSession.id).then(() => alert('자동 승인 On'))} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${activeSession.auto_approve_estate ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>자동 승인 ON</button>
                   <button onClick={() => supabase.from('economy_settings').update({ auto_approve_estate: false }).eq('id', activeSession.id).then(() => alert('자동 승인 Off'))} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${!activeSession.auto_approve_estate ? 'bg-slate-800 text-white' : 'bg-white text-slate-400'}`}>수동 승인(교사 확인)</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'economy' && (
          <div className="space-y-6">
            <div className="bg-white p-10 rounded-[3rem] border shadow-sm flex flex-col items-center text-center">
               <div className="p-5 bg-emerald-50 text-emerald-600 rounded-[2.5rem] mb-6 shadow-xl shadow-emerald-50"><Coins size={48}/></div>
               <h2 className="text-3xl font-black text-slate-900 mb-2">중앙 은행 시스템</h2>
               <p className="text-slate-400 font-medium mb-10">모든 학생에게 주급과 이자를 원클릭으로 지급할 수 있습니다.</p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                 <button onClick={handleWeeklySalary} className="group bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-emerald-500 transition-all text-left shadow-sm">
                   <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Megaphone size={24}/></div>
                   <h3 className="text-xl font-black text-slate-800 mb-1">정기 주급 지급</h3>
                   <p className="text-xs text-slate-400 font-bold leading-relaxed">등록된 학생별 주급을 일괄 송금합니다. (주로 월요일 아침 권장)</p>
                 </button>
                 <button onClick={handleInterestPayment} className="group bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-500 transition-all text-left shadow-sm">
                   <div className="bg-indigo-50 text-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Landmark size={24}/></div>
                   <h3 className="text-xl font-black text-slate-800 mb-1">은행 이자 지급</h3>
                   <p className="text-xs text-slate-400 font-bold leading-relaxed">은행 통장 잔액의 연 2% (주 단위 0.04% 수준으로 조정 가능) 이자를 지급합니다.</p>
                 </button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-slate-900 text-white rounded-3xl"><Settings size={28}/></div>
              <h2 className="text-3xl font-black">학급 시스템 설정</h2>
            </div>
            <div className="grid grid-cols-1 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Class Level</label>
                   <select value={activeSession.school_level} onChange={(e) => supabase.from('economy_settings').update({ school_level: e.target.value }).eq('id', activeSession.id).then(() => alert('저장됨'))} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black">
                     <option value="elementary">초등학생용 (쉬운 요약)</option>
                     <option value="middle">중학생용 (표준 요약)</option>
                     <option value="high">고등학생용 (전문 요약)</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Session Code</label>
                   <div className="relative">
                     <input type="text" value={activeSession.session_code} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black font-mono tracking-widest text-indigo-600" readOnly />
                     <button onClick={async () => {
                       const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                       if(confirm(`세션 코드를 ${newCode}로 변경하시겠습니까? 학생들의 재로그인이 필요할 수 있습니다.`)) {
                         await supabase.from('economy_settings').update({ session_code: newCode }).eq('id', activeSession.id);
                         window.location.reload();
                       }
                     }} className="absolute right-2 top-2 bg-white text-xs font-black px-4 py-2 rounded-xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">코드 재생성</button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-800 mb-6">학생 개별 추가</h3>
            <div className="space-y-4">
              <input type="text" placeholder="학번 (예: 60101)" value={newStudent.id} onChange={(e)=>setNewStudent({...newStudent, id: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" />
              <input type="text" placeholder="성명" value={newStudent.name} onChange={(e)=>setNewStudent({...newStudent, name: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" />
              <input type="number" placeholder="기본 주급" value={newStudent.salary} onChange={(e)=>setNewStudent({...newStudent, salary: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" />
              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200">취소</button>
                <button onClick={async () => {
                  if(!newStudent.id || !newStudent.name) return;
                  await supabase.from('students').insert({ ...newStudent, balance: 0, bank_balance: 0, brokerage_balance: 0, teacher_id: teacherId, session_code: activeSession.session_code });
                  setShowAddModal(false); fetchData();
                }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100">추가하기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
