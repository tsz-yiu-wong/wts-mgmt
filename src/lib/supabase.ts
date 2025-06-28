import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 统一使用anon key的客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 检查是否为测试模式
export function isTestMode() {
  return !supabaseUrl || 
         supabaseUrl === 'https://your-project.supabase.co' ||
         !supabaseAnonKey ||
         supabaseAnonKey === 'your_anon_key'
} 