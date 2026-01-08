
import React from 'react';
import { ArrowLeft, Database, Cloud, Chrome, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const SetupGuide: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 overflow-y-auto max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 font-bold mb-8 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">
        <ArrowLeft size={20} /> 뒤로가기
      </button>

      <div className="mb-12">
        <h1 className="text-4xl font-black mb-4 tracking-tight text-slate-900">최종 연동 가이드</h1>
        <p className="text-slate-600 text-lg">이제 구글과 Supabase를 연결할 마지막 단계입니다.</p>
      </div>

      <div className="space-y-12 pb-20">
        {/* 최종 체크리스트 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-2xl"><PlayCircle size={28}/></div>
            <h2 className="text-2xl font-bold text-indigo-900">마지막 3분 완성 체크리스트</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-sm flex gap-4">
              <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-1">1</div>
              <div>
                <p className="font-bold text-slate-800">Supabase - Google 활성화</p>
                <p className="text-sm text-slate-500 mt-1">
                  Auth > Providers > Google 메뉴에서 구글 콘솔의 <strong>ID와 Secret</strong>을 넣고 활성화했나요?
                </p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-sm flex gap-4">
              <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-1">2</div>
              <div>
                <p className="font-bold text-slate-800">구글 콘솔 - 리디렉션 URI 등록</p>
                <p className="text-sm text-slate-500 mt-1">
                  구글 콘솔의 <strong>'승인된 리디렉션 URI'</strong> 섹션에 Supabase가 준 Callback URL을 입력하고 저장했나요?
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-sm flex gap-4">
              <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-1">3</div>
              <div>
                <p className="font-bold text-slate-800">테스트 사용자 확인</p>
                <p className="text-sm text-slate-500 mt-1">
                  구글 콘솔 'OAuth 동의 화면' 하단에 <strong>선생님의 Gmail 계정</strong>을 테스트 사용자로 추가했나요?
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 안내사항 */}
        <section className="bg-amber-50 p-8 rounded-3xl border border-amber-100">
          <div className="flex items-center gap-2 text-amber-700 font-black mb-3">
            <AlertCircle size={20}/> 알아두세요!
          </div>
          <ul className="list-disc ml-5 space-y-2 text-amber-800 text-sm leading-relaxed">
            <li>구글 로그인을 누르면 처음에 <strong>'구글에서 확인하지 않은 앱'</strong>이라고 뜰 수 있습니다. <br/>(심사 전이라 뜨는 것이니 '고급' -> 'ClassEconomy(으)로 이동'을 누르시면 됩니다.)</li>
            <li>로그인 후 흰 화면만 나온다면 Vercel 환경 변수가 등록되지 않았을 확률이 높습니다.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default SetupGuide;
