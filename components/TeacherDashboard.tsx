
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, BookOpen, Settings,
  TrendingUp, Map
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';

interface Props {
  teacherId: string;
}

const TeacherDashboard: React.FC<Props> = ({ teacherId }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // DB에서 학생 목록 불러오기
  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) throw error;
      if (data) setStudents(data);
    } catch (err: any) {
      console.error("Fetch error:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("로그인 세션이 만료되었습니다.");

        const studentData = data.slice(1)
          .filter(row => row[3]) // 이름이 있는 행만 처리
          .map(row => ({
            grade: String(row[0] || ''),
            class: String(row[1] || ''),
            number: String(row[2] || ''),
            name: String(row[3] || ''),
            id: `${row[0]}${row[1]}${String(row[2]).padStart(2, '0')}`,
            salary: Number(row[4] || 0),
            password: String(row[2] || '1234'), 
            balance: 0,
            bank_balance: 0,
            brokerage_balance: 0,
            teacher_id: user.id
          }));

        const { error } = await supabase.from('students').upsert(studentData);
        if (error) throw error;
        
        alert(`${studentData.length}명의 학생이 성공적으로 등록되었습니다.`);
        fetchStudents();
      } catch (err: any) {
        alert('저장 실패: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-1 h-fit">
        {[
          { id: 'students', icon: <Users size={18}/>, label: '학생 관리' },
          { id: 'economy', icon: <Landmark size={18}/>, label: '거래/세금' },
          { id: 'bank', icon: <TrendingUp size={18}/>, label: '저축/은행' },
          { id: 'quiz', icon: <BookOpen size={18}/>, label: '퀴즈 관리' },
          { id: 'market', icon: <ShoppingBag size={18}/>, label: '마켓 관리' },
          { id: 'estate', icon: <Map size={18}/>, label: '부동산 승인' },
          { id: 'settings', icon: <Settings size={18}/>, label: '환경 설정' },
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div className="md:col-span-3 space-y-6">
        {activeTab === 'students' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">학생 명단 ({students.length}명)</h2>
              <div className="flex gap-2">
                <label className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
                  엑셀 업로드 <input type="file" className="hidden" onChange={handleBulkUpload} />
                </label>
              </div>
            </div>
            
            {isLoading ? (
              <div className="py-12 text-center text-slate-400">데이터를 불러오는 중...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-y">
                      <th className="px-4 py-3 font-bold text-slate-500">학번/성명</th>
                      <th className="px-4 py-3 font-bold text-slate-500">주급</th>
                      <th className="px-4 py-3 font-bold text-slate-500">비밀번호</th>
                      <th className="px-4 py-3 font-bold text-slate-500">계좌 현황</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-4"><span className="font-bold text-indigo-600">{s.id}</span> {s.name}</td>
                        <td className="px-4 py-4 font-medium">{s.salary?.toLocaleString()}원</td>
                        <td className="px-4 py-4 text-slate-400 font-mono">{s.password}</td>
                        <td className="px-4 py-4 text-[10px] text-slate-500">
                          <span className="inline-block bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mr-1">현금 {s.balance}</span>
                          <span className="inline-block bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded mr-1">저축 {s.bank_balance}</span>
                          <span className="inline-block bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">증권 {s.brokerage_balance}</span>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr><td colSpan={4} className="py-12 text-center text-slate-400">등록된 학생이 없습니다. 엑셀파일을 업로드하세요.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold">환경 설정</h2>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center text-slate-500 font-medium">
              학급 경제 시스템의 운영 방식을 설정할 수 있습니다. (기능 추가 예정)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
