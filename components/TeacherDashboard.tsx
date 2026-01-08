
import React, { useState, useEffect } from 'react';
import { 
  Users, Landmark, ShoppingBag, BookOpen, Settings, Plus, 
  FileSpreadsheet, Map, CheckCircle, XCircle, Brain, 
  TrendingUp, Download, Key, Eye, EyeOff, Save
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  teacherId: string;
}

const TeacherDashboard: React.FC<Props> = ({ teacherId }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<any[]>([]);
  const [sessionCode, setSessionCode] = useState('CLASS777');
  const [userApiKey, setUserApiKey] = useState(localStorage.getItem('user_gemini_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [pendingRealEstate, setPendingRealEstate] = useState([
    { id: 1, seatNum: 5, buyer: '김철수(60105)', price: 25000 },
  ]);

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'students' | 'quiz') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary', codepage: 949 });
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

      if (type === 'students') {
        const newStudents = data.slice(1).map(row => ({
          grade: row[0], class: row[1], number: row[2], name: row[3],
          id: `${row[0]}${row[1]}${String(row[2]).padStart(2, '0')}`,
          salary: row[4] || 0, balance: 0, bankBalance: 0, brokerageBalance: 0, password: ''
        }));
        setStudents([...students, ...newStudents]);
      } else {
        alert('퀴즈 데이터가 등록되었습니다.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadSample = (type: 'students' | 'quiz') => {
    let headers = type === 'students' ? 
      ['학년', '반', '번호', '성명', '주급'] : 
      ['문제', '보기1', '보기2', '보기3', '보기4', '정답(숫자)', '수당'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, `${type}_sample.xlsx`);
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('user_gemini_api_key', userApiKey);
    alert('Gemini API 키가 안전하게 저장되었습니다.');
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
              <h2 className="text-xl font-bold">학생 명단 관리</h2>
              <div className="flex gap-2">
                <button onClick={() => downloadSample('students')} className="px-3 py-2 text-xs font-bold bg-slate-100 rounded-lg">양식</button>
                <label className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg cursor-pointer">
                  엑셀 업로드 <input type="file" className="hidden" onChange={(e) => handleBulkUpload(e, 'students')} />
                </label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-y">
                    <th className="px-4 py-3 font-bold text-slate-500">학번/성명</th>
                    <th className="px-4 py-3 font-bold text-slate-500">주급</th>
                    <th className="px-4 py-3 font-bold text-slate-500">계좌 정보</th>
                    <th className="px-4 py-3 font-bold text-slate-500">비밀번호</th>
                    <th className="px-4 py-3 font-bold text-slate-500">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((s, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-4"><span className="font-bold">{s.id}</span> {s.name}</td>
                      <td className="px-4 py-4">{s.salary.toLocaleString()}원</td>
                      <td className="px-4 py-4 text-[10px] text-slate-500">
                        현금: {s.balance} / 저축: {s.bankBalance} / 증권: {s.brokerageBalance}
                      </td>
                      <td className="px-4 py-4"><Key size={14} className="inline mr-1"/> {s.password || '미설정'}</td>
                      <td className="px-4 py-4"><button className="text-indigo-600 hover:underline">수정</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">퀴즈 시스템 관리</h2>
              <div className="flex gap-2">
                <button onClick={() => downloadSample('quiz')} className="px-3 py-2 text-xs font-bold bg-slate-100 rounded-lg">양식</button>
                <label className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg cursor-pointer">
                  퀴즈 업로드 <input type="file" className="hidden" onChange={(e) => handleBulkUpload(e, 'quiz')} />
                </label>
              </div>
            </div>
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-6 text-center">
              <Brain className="mx-auto text-indigo-600 mb-2" size={32}/>
              <h3 className="font-bold text-indigo-800">AI 퀴즈 자동 생성</h3>
              <p className="text-sm text-indigo-600 mb-4">주제만 입력하면 AI가 학년 수준에 맞는 퀴즈를 만듭니다.</p>
              <div className="flex max-w-md mx-auto gap-2">
                <input type="text" placeholder="예: 경제 기동력, 인플레이션" className="flex-1 px-4 py-2 rounded-xl border-none shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors">생성</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Settings className="text-indigo-600" /> 시스템 설정
              </h2>
              
              <div className="space-y-6">
                {/* Gemini API Key 설정 섹션 */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="text-indigo-600" size={20} />
                    <h3 className="font-bold text-slate-800">Gemini AI API 키 설정</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                    AI 퀴즈 생성 및 뉴스 요약 기능을 사용하려면 Google Gemini API 키가 필요합니다. 
                    입력하신 키는 브라우저에만 안전하게 보관됩니다.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input 
                        type={showApiKey ? "text" : "password"}
                        value={userApiKey}
                        onChange={(e) => setUserApiKey(e.target.value)}
                        placeholder="AI API Key 입력 (AI Studio에서 발급)"
                        className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                      />
                      <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <button 
                      onClick={handleSaveApiKey}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Save size={18} /> 저장
                    </button>
                  </div>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    className="text-[11px] text-indigo-600 mt-2 inline-block hover:underline"
                  >
                    내 API 키 확인하러 가기 (무료 사용 가능) &rarr;
                  </a>
                </div>

                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-800">세션 코드 변경</h4>
                    <p className="text-xs text-slate-500">학생들의 로그인용 코드입니다.</p>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={sessionCode} 
                      onChange={(e) => setSessionCode(e.target.value)}
                      className="w-24 px-3 py-2 border rounded-lg text-center font-bold text-indigo-600 outline-none"
                    />
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm">변경</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'estate' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <h2 className="text-xl font-bold mb-6">부동산 거래 승인 대기</h2>
            <div className="space-y-4">
              {pendingRealEstate.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">자리 {item.seatNum}</span>
                    <h4 className="font-bold mt-1">{item.buyer} 학생</h4>
                    <p className="text-xs text-slate-500">요청 가격: {item.price.toLocaleString()}원</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle/></button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><XCircle/></button>
                  </div>
                </div>
              ))}
              {pendingRealEstate.length === 0 && <p className="text-center py-8 text-slate-400">대기 중인 거래가 없습니다.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
