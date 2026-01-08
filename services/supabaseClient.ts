
import { createClient } from '@supabase/supabase-js';

// 이 환경에서는 환경 변수가 process.env를 통해 제공됩니다.
// Vercel 설정이나 로컬 환경 변수에 등록된 값을 가져옵니다.
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// 초기화 시 URL이 없으면 에러가 발생하므로, 
// 설정이 누락된 경우에도 앱이 로딩될 수 있도록 기본 URL 형식을 유지하거나 
// 설정 누락에 대한 경고를 콘솔에 출력합니다.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase 설정(URL 또는 Key)이 환경 변수에 등록되지 않았습니다. ' +
    'Vercel의 Environment Variables 설정을 확인해주세요.'
  );
}

// createClient는 유효한 URL 문자열을 필요로 합니다.
export const supabase = createClient(
  supabaseUrl || 'https://your-project-id.supabase.co', 
  supabaseAnonKey || 'your-anon-key'
);
