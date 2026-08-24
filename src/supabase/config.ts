import { createClient } from '@supabase/supabase-js';

// Lấy từ Supabase Dashboard > Project Settings > API.
// anon key là public key phía client, không phải secret — an toàn khi đưa vào
// biến môi trường build-time của Vite (VITE_*).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. ' +
    'Tạo file .env (xem .env.example) hoặc khai báo Secrets nếu chạy trên AI Studio.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
