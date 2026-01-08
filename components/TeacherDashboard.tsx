
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, BookOpen, Settings,
  Map, Download, Plus, RefreshCw, Trash2, Check, X, 
  Coins, Megaphone, CheckSquare, Square, History, Save, AlertTriangle,
  UserPlus, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student, Transaction } from '../types';

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
    }
  };

  const downloadTemplate = () => {
    const headers = [['학년', '반', '번호', '이름', '주급']];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, "학생명단양식");
    XLSX.writeFile(wb, "학급경제_학생명단_양식.xlsx");
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[];
      
      const studentData = rows.slice(1)
        .filter(row => row[3]) // 이름이 있는 행만
        .map(row => {
          const grade = String(row[0] || '');
          const cls = String(row[1] || '').padStart(2, '0');
          const num = String(row[2] || '').padStart(2, '0');
          return {
            id: `${grade}${cls}${num}`,
            grade: String(row[0]),
            class: String(row[1]),
            number: String(row[2]),
            name: String(row[3]),
            salary: Number(row[4] || 0),
            balance: 0,
            bank_balance: 0,
            brokerage_balance: 0,
            teacher_id: teacherId,
            session_code: activeSession.session_code,
            password: ''
          };
        });

      if (studentData.length > 0) {
        const { error } = await supabase.from('students').upsert(studentData);
        if (error) alert('업로드 중 오류가 발생했습니다.');
        else {
          alert(`${studentData.length}명의 학생이 등록되었습니다.`);
          fetchData();
        }
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

  const deleteCurrentClass = async () => {
    if (confirm('⚠️ 경고: 이 학급의 모든 데이터가 영구 삭제됩니다. 정말 삭제하시겠습니까?')) {
      await supabase.from('students').delete().eq('session_code', settings.session_code);
      await supabase.from('transactions').delete().eq('session_code', settings.session_code);
      await supabase.from('economy_settings').delete().eq('id', settings.id);
      alert('삭제되었습니다.');
      window.location.reload();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border h-fit sticky top-24 space-y-1">
        {[
          { id: 'students', icon: <Users size={18}/>, label: '학생 관리' },
          { id: 'economy', icon: <Landmark size={18}/>, label: '경제 관리' },
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
                <button onClick={downloadTemplate} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"><Download size={14}/> 양식 다운</button>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"><UserPlus size={14}/> 개별 추가</button>
                <label className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
                  <FileSpreadsheet size={14}/> 일괄 등록
                  <input type="file" className="hidden" onChange={handleBulkUpload} accept=".xlsx,.xls,.csv" />
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
                            const val = prompt(`${field === 'salary' ? '주급' : field} 수정: 새로운 값을 입력하세요`, String(s[field as keyof Student]));
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
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Megaphone size={20}/> 정기 세금/주급 자동화</h2>
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
                    <div className="col-span-2 p-2 bg-white/50 rounded-lg text-[10px] text-emerald-600 font-bold">주급 설정은 [학생 관리] 탭에서 학생별로 각각 설정할 수 있습니다.</div>
                  </div>
                </div>
              </div>
              <button onClick={() => updateSessionSetting(settings)} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"><Save size={20}/> 자동화 설정 저장하기</button>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20}/> 학생 수당/범칙금 부과</h2>
                <button onClick={() => setSelectedStudentIds(selectedStudentIds.length === students.length ? [] : students.map(s => s.id))} className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  {selectedStudentIds.length === students.length ? <CheckSquare size={16}/> : <Square size={16}/>} 모두 선택
                </button>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl flex gap-3 mb-4">
                <input type="number" id="ecoAmt" placeholder="금액 입력" className="flex-1 p-2 border rounded-xl" />
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

        {activeTab === 'logs' && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><History size={20}/> 로그 관리</h2>
              <select value={logFilter} onChange={(e)=>setLogFilter(e.target.value)} className="p-2 border rounded-xl text-xs font-bold outline-none">
                <option value="all">모든 내역</option>
                <option value="transfer">송금 내역</option>
                <option value="tax">세금 징수</option>
                <option value="salary">주급 지급</option>
                <option value="fine">범칙금 부과</option>
                <option value="reward">수당 지급</option>
              </select>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {logs.map(log => {
                const sName = log.sender_id === 'GOVERNMENT' || log.sender_id === 'SYSTEM' ? '정부' : log.sender_name;
                const rName = log.receiver_id === 'GOVERNMENT' || log.receiver_id === 'SYSTEM' ? '정부' : log.receiver_name;
                return (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold mr-2 ${log.type === 'tax' || log.type === 'fine' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>{log.type.toUpperCase()}</span>
                      <span className="font-bold text-slate-800">{sName} → {rName}</span>
                      <p className="text-slate-400 mt-0.5">{log.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{log.amount.toLocaleString()}원</p>
                      <p className="text-[10px] text-slate-300">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-8">
            <h2 className="text-2xl font-black text-slate-800">환경 설정</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-500 text-xs uppercase">학급 기본 정보</h3>
                <input type="text" id="clsName" defaultValue={settings.class_name} className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                <select id="clsLv" defaultValue={settings.school_level} className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="elementary">초등학생</option><option value="middle">중학생</option><option value="high">고등학생</option>
                </select>
                <button onClick={() => updateSessionSetting({ ...settings, class_name: (document.getElementById('clsName') as HTMLInputElement).value, school_level: (document.getElementById('clsLv') as HTMLSelectElement).value as any })} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"><Save size={18}/> 설정 저장하기</button>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-slate-500 text-xs uppercase">세션 코드 관리</h3>
                <input type="text" id="sCode" defaultValue={settings.session_code} className="w-full p-3 bg-slate-50 border rounded-xl font-bold font-mono outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={() => updateSessionSetting({ ...settings, session_code: (document.getElementById('sCode') as HTMLInputElement).value })} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">코드 수동 변경</button>
                <button onClick={() => updateSessionSetting({ ...settings, session_code: Math.random().toString(36).substring(2, 8).toUpperCase() })} className="w-full text-indigo-600 text-xs font-bold py-2 hover:underline">랜덤 코드 재발행</button>
              </div>
            </div>
            <div className="pt-10 border-t flex justify-end">
              <button onClick={deleteCurrentClass} className="bg-red-50 text-red-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/> 이 학급 완전히 삭제하기</button>
            </div>
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
                    <input type="number" value={newStudent.grade} onChange={(e)=>setNewStudent({...newStudent, grade: e.target.value})} className="p-3 border rounded-xl w-full font-bold outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1">반</label>
                    <input type="number" value={newStudent.class} onChange={(e)=>setNewStudent({...newStudent, class: e.target.value})} className="p-3 border rounded-xl w-full font-bold outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1">번호</label>
                    <input type="number" value={newStudent.number} onChange={(e)=>setNewStudent({...newStudent, number: e.target.value})} className="p-3 border rounded-xl w-full font-bold outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1">성함</label>
                  <input type="text" placeholder="이름 입력" value={newStudent.name} onChange={(e)=>setNewStudent({...newStudent, name: e.target.value})} className="p-4 border rounded-2xl w-full font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-lg"/>
                </div>
                <button 
                  onClick={async () => {
                    const id = `${newStudent.grade}${String(newStudent.class).padStart(2, '0')}${String(newStudent.number).padStart(2, '0')}`;
                    const { error } = await supabase.from('students').insert({
                      id, grade: newStudent.grade, class: newStudent.class, number: newStudent.number, name: newStudent.name,
                      teacher_id: teacherId, session_code: activeSession.session_code, salary: 0, balance: 0, bank_balance: 0, brokerage_balance: 0, password: ''
                    });
                    if (error) alert('등록 중 오류가 발생했습니다.');
                    else { setShowAddModal(false); setNewStudent({ grade: '', class: '', number: '', name: '' }); fetchData(); }
                  }} 
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all"
                >
                  명단에 등록하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
