# Classroom GVCN 2026 (bản Supabase)

Ứng dụng quản lý lớp dành cho giáo viên chủ nhiệm, xây dựng bằng
**React + TypeScript + Vite + Supabase (Auth + Postgres)**.

> Đây là bản chuyển đổi từ bản gốc dùng Firebase (Firestore + Firebase Auth).
> Toàn bộ tên hàm/service ở `src/services/` được giữ nguyên để các trang
> trong `src/pages/` không cần sửa gì — chỉ phần "ruột" bên trong service là
> gọi Supabase thay vì Firestore.

## Chạy nhanh

```bash
npm install
cp .env.example .env   # rồi điền VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

## Thiết lập Supabase (làm 1 lần)

1. Tạo project tại https://supabase.com (chọn region Singapore cho gần VN).
2. Vào **Project Settings → API**, copy **Project URL** và **anon public key**
   vào file `.env` (xem `.env.example`).
3. Vào **SQL Editor**, dán toàn bộ nội dung file `supabase/migration.sql` và
   chạy (chỉ cần chạy 1 lần trên project trống). File này tạo:
   - Toàn bộ bảng dữ liệu + Row Level Security (RLS) tương đương
     `firestore.rules` của bản gốc.
   - View `student_directory` (danh bạ công khai — thay cho việc ghi đôi
     `students`/`studentDirectory` ở bản Firestore).
   - Trigger tự tạo hồ sơ người dùng khi đăng nhập lần đầu (thay
     `authService.loadOrCreateProfile` chạy ở client bản cũ — giờ chạy an
     toàn hơn ở phía server).
   - Các hàm RPC nghiệp vụ (chấm điểm, tặng sao, đánh giá...) đảm bảo cập
     nhật điểm/sao/trung bình một cách nguyên tử (atomic), thay cho
     `runTransaction()` của Firestore.
4. Vào **Authentication → Providers → Google**: bật provider, cần Client ID +
   Client Secret từ Google Cloud Console (dùng lại project Google Cloud của
   Firebase cũ cũng được — chỉ cần thêm Redirect URI mà Supabase hiển thị sẵn
   vào Google Cloud Console).
5. **Tạo Admin đầu tiên**: đăng nhập vào app 1 lần (tài khoản sẽ ở trạng thái
   "chờ duyệt"), sau đó vào **Table Editor → profiles**, sửa dòng của bạn:
   `role = admin`, `is_approved = true`.

## Cấu trúc chính

```text
src/pages/          Giao diện từng chức năng (không đổi so với bản gốc)
src/services/        Nghiệp vụ — gọi Supabase (supabase-js) thay Firestore
src/context/          Authentication (Supabase session), lớp đang chọn, toast
src/supabase/         Supabase client config
src/types/            Kiểu dữ liệu TypeScript (giữ nguyên camelCase)
src/styles/           CSS toàn hệ thống (không đổi)
supabase/migration.sql  Toàn bộ schema + RLS + trigger + RPC — chạy 1 lần
```

## Lưu ý bảo mật

- Supabase anon key là cấu hình client, không phải khóa quản trị — an toàn
  khi đưa vào biến môi trường build-time (`VITE_*`).
- Bảo mật dữ liệu dựa vào **Row Level Security (RLS)** trên Postgres.
- Các thao tác "chỉ được sửa 1-2 cột" (chấm điểm, tặng sao, đánh giá) được
  chuyển thành **RPC function** chạy phía server (`security definer`) thay vì
  cho phép `UPDATE` trực tiếp — vì RLS của Postgres không kiểm soát được theo
  cột như Firestore Security Rules.
- Học sinh được lưu trữ mềm (`status`/`archived_at`) thay vì xóa cứng, giữ
  đúng tinh thần bản gốc — không có policy `DELETE` nào được tạo.
