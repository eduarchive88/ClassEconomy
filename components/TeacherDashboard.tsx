
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, BookOpen, Settings,
  TrendingUp, Map, Download, Plus, Save, Key, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { EconomySettings, Student } from '../types';

interface Props {
  teacherId: string;
}

const TeacherDashboard: React.FC<Props> = ({ teacherId }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<EconomySettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [teacherId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: stData } = await supabase.from('students').select('*').eq('teacher_id', teacherId).order('id', { ascending: true });
      const { data: setv } = await supabase.from('economy_settings').select('*').eq('teacher_id', teacherId).single();
      
      if (stData) setStudents(stData);
      if (setv) setSettings(setv);
      else {
        // 기본 세팅 생성
        const initial = { teacher_id: teacherId, session_code: Math.random().toString(36).substring(2, 8).toUpperCase(), school_level: 'elementary', auto_approve_estate: false, quiz_count_per_day: 1 };
        await supabase.from('economy_settings').insert(initial);
        setSettings(initial as any);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleDownloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["학년", "반", "번호", "성명", "주급"],
      [6, 1, 1, "홍길동", 5000],
      [6, 1, 2, "김철수", 4500]
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "학생명단양식");
    XLSX.writeFile(wb, "ClassEconomy_학생양식.xlsx");
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

        const studentData = rows.slice(1)
          .filter(row => row[3])
          .map(row => ({
            grade: String(row[0]),
            class: String(row[1]),
            number: String(row[2]),
            name: String(row[3]),
            id: `${row[0]}${row[1]}${String(row[2]).padStart(2, '0')}`,
            salary: Number(row[4] || 0),
            balance: 0, bank_balance: 0, brokerage_balance: 0,
            teacher_id: teacherId,
            password: '' 
          }));

        const { error } = await supabase.from('students').upsert(studentData);
        if (error) throw error;
        alert(`${studentData.length}명 등록 완료!`);
        fetchData();
      } catch (err: any) { alert('업로드 실패: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  };

  const updateSettings = async (updates: Partial<EconomySettings>) => {
    try {
      const { error } = await supabase.from('economy_settings').update(updates).eq('teacher_id', teacherId);
      if (error) throw error;
      setSettings(prev => prev ? { ...prev, ...updates } : null);
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-1 h-fit">
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
        {activeTab === 'students' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-800">학생 명단 ({students.length}명)</h2>
              <div className="flex gap-2">
                <button onClick={handleDownloadSample} className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><Download size={14}/> 양식 다운</button>
                <label className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors"><Plus size={14}/> 엑셀 업로드 <input type="file" className="hidden" onChange={handleBulkUpload} accept=".xlsx,.xls,.csv" /></label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-slate-50 border-y"><th className="px-4 py-3 font-bold text-slate-500">학번/이름</th><th className="px-4 py-3 font-bold text-slate-500">주급</th><th className="px-4 py-3 font-bold text-slate-500">비밀번호</th><th className="px-4 py-3 font-bold text-slate-500">총 자산</th></tr></thead>
                <tbody className="divide-y">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 font-bold">{s.id} {s.name}</td>
                      <td className="px-4 py-4">{s.salary.toLocaleString()}원</td>
                      <td className="px-4 py-4 text-slate-400 font-mono">{s.password || '(미설정)'}</td>
                      <td className="px-4 py-4 font-bold text-indigo-600">{(s.balance + s.bank_balance + s.brokerage_balance).toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <p className="text-[10px] text-slate-400">학생들이 로그인할 때 필요한 코드입니다.</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl space-y-3">
                <label className="text-sm font-bold text-slate-500 block">학급 수준</label>
                <select value={settings.school_level} onChange={(e) => updateSettings({ school_level: e.target.value as any })} className="w-full p-3 bg-white border rounded-xl font-bold">
                  <option value="elementary">초등학생</option>
                  <option value="middle">중학생</option>
                  <option value="high">고등학생</option>
                </select>
                <p className="text-[10px] text-slate-400">AI 요약 및 퀴즈 난이도 조절에 사용됩니다.</p>
              </div>
            </div>
            <div className="p-5 border-2 border-indigo-50 rounded-2xl space-y-4">
              <label className="text-sm font-bold flex items-center gap-2"><Key size={18}/> Gemini AI API Key</label>
              <input type="password" value={settings.gemini_api_key || ''} onChange={(e) => updateSettings({ gemini_api_key: e.target.value })} placeholder="AI 퀴즈 및 요약을 위한 키 입력" className="w-full p-3 border rounded-xl text-sm" />
              <p className="text-xs text-slate-400">AI 기능을 사용하려면 <a href="https://ai.google.dev/" target="_blank" className="underline text-indigo-600">Google AI Studio</a>에서 키를 발급받아 입력하세요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
