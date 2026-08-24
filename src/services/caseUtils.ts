// Chuyển đổi tên field giữa camelCase (dùng trong toàn bộ app/types) và
// snake_case (quy ước cột trong Postgres). Chỉ đổi tên key ở cấp ngoài cùng —
// không đệ quy vào bên trong object/array (vd. cột permissions là jsonb có
// sẵn key camelCase như "manageStudents", KHÔNG được đổi thành "manage_students").

// Các từ viết tắt cần giữ nguyên viết hoa khi đổi snake_case -> camelCase
// (vd. "avatar_url" phải thành "avatarURL", không phải "avatarUrl", để khớp
// đúng tên field khai báo trong src/types/index.ts).
const ACRONYMS = new Set(['url']);

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9]+)/g, (_, word: string) =>
    ACRONYMS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)
  );
}

function camelToSnake(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

export function rowToCamel<T = Record<string, unknown>>(row: Record<string, unknown> | null | undefined): T {
  const out: Record<string, unknown> = {};
  if (!row) return out as T;
  for (const [key, value] of Object.entries(row)) {
    out[snakeToCamel(key)] = value;
  }
  return out as T;
}

export function rowsToCamel<T = Record<string, unknown>>(rows: Record<string, unknown>[] | null | undefined): T[] {
  return (rows || []).map((row) => rowToCamel<T>(row));
}

export function objToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue; // giữ hành vi "cleanObject" của bản gốc
    out[camelToSnake(key)] = value;
  }
  return out;
}
