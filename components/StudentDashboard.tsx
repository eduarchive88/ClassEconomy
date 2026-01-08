
import React, { useState } from 'react';
import { 
  Wallet, Landmark, LineChart, ShoppingBag, Map, BrainCircuit, 
  TrendingUp, TrendingDown, ChevronRight, UserCircle, RefreshCcw
} from 'lucide-react';
import { StockInfo, NewsArticle } from '../types';
import { summarizeNews } from '../services/geminiService';

interface Props {
  studentId: string;
}

const StudentDashboard: React.FC<Props> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [balance, setBalance] = useState(150000);
  const [bankBalance, setBankBalance] = useState(500000); // 2% 이자 계좌
  const [brokerageBalance, setBrokerageBalance] = useState(1000000); // 투자용 계좌
  
  const [stocks] = useState<StockInfo[]>([
    { code: 'BTC', name: '비트코인', price: 98000000, change: 1.2, type: 'crypto' },
    { code: 'ETH', name: '이더리움', price: 4200000, change: -0.5, type: 'crypto' },
    { code: 'XRP', name: '리플', price: 850, change: 2.1, type: 'crypto' },
    { code: 'SAM', name: '삼성전자', price: 72000, change: 0.1, type: 'stock' },
    { code: 'HYU', name: '현대자동차', price: 245000, change: -1.4, type: 'stock' },
    { code: 'TSLA', name: 'Tesla', price: 250000, change: 3.5, type: 'stock' },
    { code: 'NVDA', name: 'NVIDIA', price: 1200000, change: 5.2, type: 'stock' },
  ]);

  const [news] = useState<NewsArticle[]>([
    { title: "오늘의 금융 시장 뉴스 요약", url: "https://google.com/finance", publishedAt: "30분 전" },
  ]);

  return (
    <div className="space-y-6">
      {/* 3대 계좌 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase">입출금 통장 (현금)</p>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{balance.toLocaleString()}원</h3>
            <Wallet className="text-blue-500" size={20}/>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
          <p className="text-[10px] font-bold text-indigo-400 mb-1 uppercase">은행 저축 (연 2% 주단위)</p>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-indigo-600">{bankBalance.toLocaleString()}원</h3>
            <Landmark className="text-indigo-500" size={20}/>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-400 mb-1 uppercase">증권 예수금 (투자 가능액)</p>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-emerald-600">{brokerageBalance.toLocaleString()}원</h3>
            <LineChart className="text-emerald-500" size={20}/>
          </div>
        </div>
      </div>

      <nav className="flex bg-white p-1 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-hide">
        {[
          { id: 'home', icon: <Wallet size={16}/>, label: '내 지갑' },
          { id: 'bank', icon: <Landmark size={16}/>, label: '은행/이자' },
          { id: 'invest', icon: <TrendingUp size={16}/>, label: '주식/코인' },
          { id: 'quiz', icon: <BrainCircuit size={16}/>, label: '퀴즈보상' },
          { id: 'market', icon: <ShoppingBag size={16}/>, label: '상점' },
          { id: 'estate', icon: <Map size={16}/>, label: '부동산' },
          { id: 'profile', icon: <UserCircle size={16}/>, label: '설정' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="min-h-[400px]">
        {activeTab === 'bank' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200">
            <h3 className="text-xl font-bold mb-4">학급 중앙 은행</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-2xl">
                <h4 className="font-bold mb-2">저금하기</h4>
                <p className="text-xs text-slate-500 mb-4">입출금 통장의 돈을 은행으로 옮기면 매주 월요일 2%의 이자가 붙습니다.</p>
                <input type="number" placeholder="금액 입력" className="w-full p-3 rounded-xl border mb-2" />
                <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">은행에 저금</button>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl">
                <h4 className="font-bold mb-2">출금하기</h4>
                <p className="text-xs text-slate-500 mb-4">은행의 돈을 입출금 통장으로 즉시 옮깁니다.</p>
                <input type="number" placeholder="금액 입력" className="w-full p-3 rounded-xl border mb-2" />
                <button className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">통장으로 출금</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invest' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="text-emerald-500"/> 글로벌 투자 센터
                </h3>
                <button className="flex items-center gap-1 text-xs font-bold text-slate-400">
                  <RefreshCcw size={14}/> 1시간 단위 갱신
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stocks.map(stock => (
                  <div key={stock.code} className="p-4 border rounded-xl hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">{stock.type === 'crypto' ? '코인' : '주식'}</span>
                      <span className={`text-xs font-bold ${stock.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.change}%
                      </span>
                    </div>
                    <h5 className="font-bold text-slate-800">{stock.name}</h5>
                    <p className="text-lg font-bold">{stock.price.toLocaleString()}원</p>
                    <div className="mt-4 flex gap-1">
                      <button className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white">매수</button>
                      <button className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500 hover:text-white">매도</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* AI 뉴스 요약 섹션 */}
            <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <BrainCircuit className="text-indigo-400"/>
                <h3 className="text-xl font-bold">AI 경제 뉴스 브리핑</h3>
              </div>
              <div className="space-y-4">
                {news.map((item, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{item.title}</p>
                      <p className="text-xs text-white/40">{item.publishedAt}</p>
                    </div>
                    <button className="bg-indigo-600 px-4 py-2 rounded-lg font-bold text-xs">AI 분석</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'market' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200">
            <h3 className="text-xl font-bold mb-6">학급 마켓 (Goods)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: '탕후루 1회 교환권', price: 5000 },
                { name: '숙제 1회 면제권', price: 20000 },
                { name: '점심시간 10분 연장', price: 15000 },
              ].map(item => (
                <div key={item.name} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                  <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 mb-4"><ShoppingBag/></div>
                  <h4 className="font-bold text-lg mb-1">{item.name}</h4>
                  <p className="text-indigo-600 font-bold mb-4">{item.price.toLocaleString()}원</p>
                  <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-indigo-600">구매하기</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'estate' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">교실 부동산 센터</h3>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">현재 시세</p>
                <p className="text-lg font-bold text-indigo-600">32,450원</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {Array.from({length: 20}).map((_, i) => (
                <div key={i} className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-2 relative group overflow-hidden">
                  <span className="text-[10px] text-slate-400 font-bold">Seat {i+1}</span>
                  <div className="absolute inset-0 bg-indigo-600/90 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <p className="text-[10px] font-bold">구매 요청</p>
                    <p className="text-xs font-bold">3.2만</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-xs leading-relaxed">
              <strong>부동산 가이드:</strong> 모든 부동산 거래는 교사의 최종 승인 후 완료됩니다. 
              거래 대금의 10%는 국세(교사)로 징수되며, 90%는 판매자에게 입금됩니다.
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-6">개인 정보 설정</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">학번/성명</label>
                <p className="p-3 bg-slate-50 rounded-xl font-bold">{studentId} / 홍길동</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">로그인 비밀번호 변경</label>
                <input type="password" placeholder="새 비밀번호 입력" className="w-full p-3 rounded-xl border" />
                <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">비밀번호 저장</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
