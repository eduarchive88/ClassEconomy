
import { createClient } from '@supabase/supabase-js';

/**
 * Vercel 또는 로컬 환경에서 설정한 환경 변수를 가져옵니다.
 * 객체가 존재하지 않을 경우를 대비해 단축 평가(short-circuiting)를 사용하여 안전하게 접근합니다.
 */
const getEnv = (key: string): string => {
  // process 객체가 존재하더라도 process.env가 undefined일 수 있으므로 체크가 필요합니다.
  const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
  
  // import.meta 객체는 ESM 표준이지만 .env는 번들러(Vite 등)의 특성입니다.
  // @ts-ignore
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
  
  return (env as any)[key] || (metaEnv as any)[key] || '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase 설정이 누락되었습니다! Vercel Settings > Environment Variables에서 ' +
    'VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 추가했는지 확인하세요.'
  );
}

// 초기화 시 유효하지 않은 URL이 들어가는 것을 방지하기 위한 안전장치
const validUrl = supabaseUrl && supabaseUrl.startsWith('http') 
  ? supabaseUrl 
  : 'https://placeholder-project.supabase.co';

export const supabase = createClient(
  validUrl,
  supabaseAnonKey || 'placeholder-key'
);
