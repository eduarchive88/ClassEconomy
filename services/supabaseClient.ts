
import { createClient } from '@supabase/supabase-js';

/**
 * Vercel 또는 로컬 환경에서 설정한 환경 변수를 가져옵니다.
 */
const getEnv = (key: string): string => {
  // @ts-ignore
  const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
  // @ts-ignore
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
  
  return (env as any)[key] || (metaEnv as any)[key] || '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// 설정이 누락되었는지 확인하는 플래그
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

// 초기화 시 유효하지 않은 URL이 들어가는 것을 방지하기 위한 안전장치
const validUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co';
const validKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(validUrl, validKey);
