
import React from 'react';
import { ArrowLeft, Database, Cloud, Github } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const SetupGuide: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 overflow-y-auto max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 font-bold mb-8">
        <ArrowLeft size={20} /> 뒤로가기
      </button>

      <h1 className="text-3xl font-bold mb-4">서버 및 DB 설정 가이드</h1>
      <p className="text-slate-600 mb-12">전문가가 아니어도 괜찮습니다. 아래 단계를 따라 프로젝트를 완성하세요.</p>

      <div className="space-y-12">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg"><Database size={24}/></div>
            <h2 className="text-2xl font-bold">1. Supabase (데이터베이스)</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <p>1. <a href="https://supabase.com" className="text-indigo-600 underline">Supabase</a> 가입 후 'New Project'를 만듭니다.</p>
            <p>2. SQL Editor에서 다음 테이블들을 생성하세요:</p>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
{`CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT,
  grade TEXT,
  class TEXT,
  password TEXT,
  salary INTEGER DEFAULT 0,
  balance INTEGER DEFAULT 0,
  bank_balance INTEGER DEFAULT 0,
  brokerage_balance INTEGER DEFAULT 0,
  teacher_id UUID REFERENCES auth.users(id)
);

CREATE TABLE market_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  price INTEGER,
  teacher_id UUID REFERENCES auth.users(id)
);`}
            </pre>
            <p className="text-sm text-slate-500">※ 실제 프로덕션에서는 더 많은 테이블(거래 내역, 퀴즈 등)이 필요합니다.</p>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-800 text-white p-2 rounded-lg"><Github size={24}/></div>
            <h2 className="text-2xl font-bold">2. GitHub (코드 보관)</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <p>1. GitHub 레포지토리를 생성합니다.</p>
            <p>2. 이 코드를 해당 레포지토리에 푸시(Push) 합니다.</p>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-black text-white p-2 rounded-lg"><Cloud size={24}/></div>
            <h2 className="text-2xl font-bold">3. Vercel (서버 배포)</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <p>1. <a href="https://vercel.com" className="text-indigo-600 underline">Vercel</a>에서 GitHub 레포지토리를 연결합니다.</p>
            <p>2. Environment Variables(환경 변수)에 다음을 추가합니다:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><code>VITE_SUPABASE_URL</code>: Supabase의 Project URL</li>
              <li><code>VITE_SUPABASE_ANON_KEY</code>: Supabase의 API Key</li>
              <li><code>API_KEY</code>: Gemini AI API 키</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SetupGuide;
