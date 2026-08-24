-- ============================================================================
-- GVCN Thực Hành — Migration Firebase (Firestore) -> Supabase (Postgres)
-- Chạy 1 lần trong Supabase Dashboard > SQL Editor (project mới, database trống).
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================
create type app_role as enum ('admin','teacher','assistant','viewer','student_officer');
create type record_status as enum ('active','cancelled');
create type score_type as enum ('Điểm cộng','Điểm trừ','Khắc phục','Vi phạm');
create type proposal_status as enum ('pending','approved','rejected');
create type assessment_category as enum ('quality','competency');
create type task_status as enum ('doing','upcoming','done','cancelled');
create type activity_status as enum ('upcoming','doing','done','cancelled');
create type attendance_status as enum ('present','late','absent','excused');
create type learning_record_type as enum ('Kiểm tra','Bài tập','Phát biểu','Tiến bộ','Cần cố gắng');
create type journal_mood as enum ('Tự hào','Vui','Đáng nhớ','Cần cố gắng');
create type club_status as enum ('active','archived');
create type club_type as enum ('CLB','Đội nhóm');
create type comm_channel as enum ('email','phone','meeting');
create type comm_status as enum ('draft','logged','sent','failed');
create type notif_priority as enum ('normal','high','urgent');
create type score_source as enum ('teacher','officer_proposal');

-- ============================================================================
-- 2. NGƯỜI DÙNG & PHÂN QUYỀN
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  photo_url text default '',
  role app_role not null default 'teacher',
  is_approved boolean not null default false,
  is_active boolean not null default true,
  permissions jsonb not null default '{
    "manageStudents": false, "manageScores": false, "submitScoreProposals": false,
    "manageAssessments": false, "manageStars": false, "manageWeeklyPlans": false,
    "manageClassContent": false, "manageNotifications": false, "contactParents": false,
    "viewReports": false, "manageUsers": false, "manageSettings": false
  }'::jsonb,
  linked_student_id uuid,
  linked_student_name text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_year text not null,
  grade text default '',
  homeroom_teacher text default '',
  motto text default '',
  slogan text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- thay cho mảng classIds trong Firestore users/{uid}
create table user_classes (
  user_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  primary key (user_id, class_id)
);

create table invitations (
  email text primary key,
  display_name text not null,
  role app_role not null,
  permissions jsonb not null,
  class_ids uuid[] not null default '{}',
  linked_student_id uuid,
  linked_student_name text default '',
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 3. HỌC SINH — 1 bảng duy nhất + view công khai (thay cho dual-write
--    students/studentDirectory ở bản Firestore)
-- ============================================================================
create table students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_code text default '',
  full_name text not null,
  birth_date text default '',
  gender text default '' check (gender in ('Nam','Nữ','Khác','')),
  email text default '',
  phone text default '',
  address text default '',
  avatar_url text default '',
  group_name text default '',
  total_score numeric not null default 100,
  status text not null default 'Đang học',
  note text default '',
  total_stars integer not null default 0,
  quality_avg numeric not null default 0,
  competency_avg numeric not null default 0,
  quality_score_sum numeric not null default 0,
  quality_score_count integer not null default 0,
  competency_score_sum numeric not null default 0,
  competency_score_count integer not null default 0,
  parent_email text default '',
  parent_phone text default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index students_class_id_idx on students(class_id);

-- Danh bạ công khai: KHÔNG có email/phone/address/parent info.
-- security_invoker = on => view chạy theo quyền + RLS của người gọi, không "vượt rào".
create view student_directory
with (security_invoker = on) as
select id, class_id, student_code, full_name, avatar_url, group_name,
       total_score, total_stars, status, created_at, updated_at
from students;

-- ============================================================================
-- 4. CÁC BẢNG NGHIỆP VỤ THEO LỚP
-- ============================================================================
create table scores (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  student_name text not null,
  type score_type not null,
  value numeric not null,
  delta numeric not null,
  note text default '',
  assessor_uid uuid references profiles(id),
  assessor_name text not null,
  source score_source default 'teacher',
  proposal_id uuid,
  proposed_by_uid uuid references profiles(id),
  proposed_by_name text default '',
  status record_status not null default 'active',
  cancelled_by_uid uuid references profiles(id),
  cancelled_by_name text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index scores_class_id_idx on scores(class_id);
create index scores_student_id_idx on scores(student_id);

create table score_proposals (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id),
  student_name text not null,
  type score_type not null,
  value numeric not null check (value between 1 and 10),
  note text default '',
  proposer_uid uuid not null references profiles(id),
  proposer_name text not null,
  proposer_student_id uuid,
  proposer_student_name text default '',
  status proposal_status not null default 'pending',
  reviewed_by_uid uuid references profiles(id),
  reviewed_by_name text,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index score_proposals_class_id_idx on score_proposals(class_id);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  student_name text not null,
  category assessment_category not null,
  criterion text not null,
  score numeric not null check (score between 1 and 5),
  comment text default '',
  assessor_uid uuid references profiles(id),
  assessor_name text not null,
  status record_status not null default 'active',
  created_at timestamptz not null default now()
);
create index assessments_class_id_idx on assessments(class_id);
create index assessments_student_id_idx on assessments(student_id);

create table assessment_current (
  id text primary key, -- studentId_category_criterionHash, giữ định dạng cũ để tương thích
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  student_name text not null,
  category assessment_category not null,
  criterion text not null,
  score numeric not null,
  comment text default '',
  assessor_uid uuid references profiles(id),
  assessor_name text not null,
  status record_status not null default 'active',
  history_id uuid references assessments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assessment_current_class_id_idx on assessment_current(class_id);

create table star_awards (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  student_name text not null,
  star_type text not null,
  reason text default '',
  giver_uid uuid references profiles(id),
  giver_name text not null,
  week_number integer,
  status record_status not null default 'active',
  cancelled_by_uid uuid references profiles(id),
  cancelled_by_name text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index star_awards_class_id_idx on star_awards(class_id);

create table weekly_plans (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  week_number integer not null,
  day text not null,
  content text not null,
  time text default '',
  location text default '',
  owner text default '',
  note text default '',
  status record_status not null default 'active',
  creator_uid uuid references profiles(id),
  creator_name text not null,
  created_at timestamptz not null default now()
);
create index weekly_plans_class_id_idx on weekly_plans(class_id);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  description text default '',
  category text not null,
  progress integer not null default 0 check (progress between 0 and 100),
  status task_status not null default 'upcoming',
  due_date text default '',
  assignee_ids uuid[] not null default '{}',
  assignee_names text[] not null default '{}',
  owner text default '',
  creator_uid uuid references profiles(id),
  creator_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_class_id_idx on tasks(class_id);

create table class_rules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  "order" integer not null default 0,
  title text not null,
  description text not null,
  icon text default '🌿',
  is_active boolean not null default true,
  creator_uid uuid references profiles(id),
  creator_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index class_rules_class_id_idx on class_rules(class_id);

create table attendance (
  id text primary key, -- date_studentId, giữ định dạng cũ để idempotent
  class_id uuid not null references classes(id) on delete cascade,
  date text not null,
  student_id uuid not null references students(id) on delete cascade,
  student_name text not null,
  status attendance_status not null,
  note text default '',
  recorder_uid uuid references profiles(id),
  recorder_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index attendance_class_id_date_idx on attendance(class_id, date);

create table learning_records (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  student_name text not null,
  subject text not null,
  type learning_record_type not null,
  score numeric,
  note text default '',
  date text not null,
  creator_uid uuid references profiles(id),
  creator_name text not null,
  status record_status not null default 'active',
  created_at timestamptz not null default now()
);
create index learning_records_class_id_idx on learning_records(class_id);

create table activities (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  category text not null,
  date text not null,
  description text default '',
  location text default '',
  status activity_status not null default 'upcoming',
  highlight boolean not null default false,
  creator_uid uuid references profiles(id),
  creator_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activities_class_id_idx on activities(class_id);

create table good_deeds (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  student_name text not null,
  content text not null,
  date text not null,
  leaf_value integer not null default 1 check (leaf_value between 1 and 5),
  creator_uid uuid references profiles(id),
  creator_name text not null,
  status record_status not null default 'active',
  created_at timestamptz not null default now()
);
create index good_deeds_class_id_idx on good_deeds(class_id);

create table library_items (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  category text not null,
  description text default '',
  url text not null,
  owner text default '',
  status record_status not null default 'active',
  creator_uid uuid references profiles(id),
  creator_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index library_items_class_id_idx on library_items(class_id);

create table clubs (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  type club_type not null,
  description text default '',
  leader text default '',
  member_ids uuid[] not null default '{}',
  member_names text[] not null default '{}',
  meeting_schedule text default '',
  status club_status not null default 'active',
  creator_uid uuid references profiles(id),
  creator_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clubs_class_id_idx on clubs(class_id);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  date text not null,
  title text not null,
  content text not null,
  mood journal_mood not null,
  tags text[] not null default '{}',
  image_url text default '',
  author_uid uuid references profiles(id),
  author_name text not null,
  status club_status not null default 'active', -- active/archived, tái dùng enum
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index journal_entries_class_id_idx on journal_entries(class_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  content text not null,
  type text not null,
  priority notif_priority not null default 'normal',
  send_to_parents boolean not null default false,
  status record_status not null default 'active',
  creator_uid uuid references profiles(id),
  creator_name text not null,
  created_at timestamptz not null default now()
);
create index notifications_class_id_idx on notifications(class_id);

create table parent_communications (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  student_name text not null,
  channel comm_channel not null,
  subject text default '',
  content text not null,
  status comm_status not null default 'logged',
  creator_uid uuid references profiles(id),
  creator_name text not null,
  created_at timestamptz not null default now()
);
create index parent_communications_class_id_idx on parent_communications(class_id);

-- ============================================================================
-- 4b. TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at (thay cho serverTimestamp() ở
--     Firestore — Postgres không tự làm việc này, cần trigger riêng).
-- ============================================================================
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','classes','invitations','students','tasks','class_rules',
    'attendance','activities','library_items','clubs','journal_entries','assessment_current'
  ] loop
    execute format('create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ============================================================================
-- 5. HÀM HỖ TRỢ CHO RLS (tương đương function trong firestore.rules)
-- ============================================================================
create or replace function is_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_approved and is_active and role = 'admin'
  );
$$;

create or replace function is_approved() returns boolean
language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and is_approved and is_active);
$$;

create or replace function has_permission(perm text) returns boolean
language sql stable security definer as $$
  select is_admin() or exists (
    select 1 from profiles
    where id = auth.uid() and is_approved and is_active
      and coalesce((permissions->>perm)::boolean, false) = true
  );
$$;

create or replace function can_manage_class_content() returns boolean
language sql stable security definer as $$
  select is_admin() or (
    is_approved() and (
      has_permission('manageClassContent')
      or exists (select 1 from profiles where id = auth.uid() and role in ('teacher','assistant'))
    )
  );
$$;

create or replace function can_access_class(cid uuid) returns boolean
language sql stable security definer as $$
  select is_admin() or exists (
    select 1 from user_classes where user_id = auth.uid() and class_id = cid
  );
$$;

create or replace function can_read_private_students(cid uuid) returns boolean
language sql stable security definer as $$
  select can_access_class(cid) and (
    is_admin() or has_permission('manageStudents') or has_permission('manageScores')
    or has_permission('manageAssessments') or has_permission('manageStars')
    or has_permission('contactParents')
  );
$$;

create or replace function current_profile_role() returns app_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_linked_student_id() returns uuid
language sql stable security definer as $$
  select linked_student_id from profiles where id = auth.uid();
$$;

-- ============================================================================
-- 6. TRIGGER TẠO PROFILE KHI CÓ TÀI KHOẢN MỚI (thay authService.loadOrCreateProfile)
--    Chạy phía server, client KHÔNG tự set role/permission cho mình được nữa.
-- ============================================================================
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
declare
  inv invitations%rowtype;
  cid uuid;
begin
  select * into inv from invitations
    where email = lower(new.email) and is_active = true;

  if found then
    insert into profiles (id, email, display_name, photo_url, role,
      is_approved, is_active, permissions, linked_student_id, linked_student_name)
    values (
      new.id, lower(new.email),
      coalesce(nullif(inv.display_name, ''), new.raw_user_meta_data->>'full_name', new.email),
      coalesce(new.raw_user_meta_data->>'avatar_url', ''),
      inv.role, true, true, inv.permissions, inv.linked_student_id, inv.linked_student_name
    );

    foreach cid in array inv.class_ids loop
      insert into user_classes (user_id, class_id) values (new.id, cid)
      on conflict do nothing;
    end loop;
  else
    insert into profiles (id, email, display_name, photo_url, role, is_approved, is_active)
    values (
      new.id, lower(new.email),
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      coalesce(new.raw_user_meta_data->>'avatar_url', ''),
      'teacher', false, true
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

-- ---- profiles ----
alter table profiles enable row level security;

create policy "profiles_select" on profiles
  for select using (id = auth.uid() or is_admin());

create policy "profiles_update_admin" on profiles
  for update using (is_admin());
-- Không có policy insert/delete cho client: profile chỉ được tạo bởi trigger
-- (security definer), không được xoá qua client (giữ đúng tinh thần "lưu trữ mềm").

-- ---- invitations ----
alter table invitations enable row level security;

create policy "invitations_select" on invitations
  for select using (is_admin() or email = (select email from profiles where id = auth.uid()));

create policy "invitations_all_admin" on invitations
  for all using (is_admin()) with check (is_admin());

-- ---- user_classes ----
alter table user_classes enable row level security;

create policy "user_classes_select" on user_classes
  for select using (user_id = auth.uid() or is_admin());

create policy "user_classes_admin" on user_classes
  for all using (is_admin()) with check (is_admin());

-- ---- classes ----
alter table classes enable row level security;

create policy "classes_select" on classes
  for select using (can_access_class(id));

create policy "classes_admin" on classes
  for all using (is_admin()) with check (is_admin());

-- ---- students ----
alter table students enable row level security;

create policy "students_select" on students
  for select using (can_read_private_students(class_id));

create policy "students_insert" on students
  for insert with check (can_access_class(class_id) and has_permission('manageStudents'));

create policy "students_update" on students
  for update using (
    can_access_class(class_id) and (
      has_permission('manageStudents')
      or has_permission('manageScores')
      or has_permission('manageAssessments')
      or has_permission('manageStars')
    )
  );
-- Không có policy delete: lưu trữ mềm qua cột status/archived_at, giống bản gốc.
-- Lưu ý: việc giới hạn "chỉ được sửa cột total_score" (thay vì cả bản ghi) cho
-- người chỉ có quyền manageScores KHÔNG làm ở RLS (Postgres RLS không kiểm soát
-- theo cột) mà chuyển sang các hàm RPC ở mục 8 — trang UI dùng RPC thay vì
-- update thẳng khi thao tác chấm điểm/tặng sao/đánh giá.

-- ---- các bảng còn lại: RLS theo đúng match block của firestore.rules ----

alter table scores enable row level security;
create policy "scores_select" on scores for select using (can_access_class(class_id) and has_permission('manageScores'));
create policy "scores_insert" on scores for insert with check (can_access_class(class_id) and has_permission('manageScores'));
create policy "scores_update" on scores for update using (can_access_class(class_id) and has_permission('manageScores'));

alter table score_proposals enable row level security;
create policy "score_proposals_select" on score_proposals for select using (
  can_access_class(class_id) and (
    has_permission('manageScores')
    or (has_permission('submitScoreProposals') and proposer_uid = auth.uid())
  )
);
create policy "score_proposals_insert" on score_proposals for insert with check (
  can_access_class(class_id)
  and has_permission('submitScoreProposals')
  and current_profile_role() = 'student_officer'
  and proposer_uid = auth.uid()
  and proposer_student_id = current_linked_student_id()
  and student_id != current_linked_student_id()
  and status = 'pending'
  and value between 1 and 10
);
create policy "score_proposals_update" on score_proposals for update using (can_access_class(class_id) and has_permission('manageScores'));

alter table assessments enable row level security;
create policy "assessments_select" on assessments for select using (can_access_class(class_id) and has_permission('manageAssessments'));
create policy "assessments_insert" on assessments for insert with check (can_access_class(class_id) and has_permission('manageAssessments'));
create policy "assessments_update" on assessments for update using (can_access_class(class_id) and has_permission('manageAssessments'));

alter table assessment_current enable row level security;
create policy "assessment_current_select" on assessment_current for select using (can_access_class(class_id) and has_permission('manageAssessments'));
create policy "assessment_current_insert" on assessment_current for insert with check (can_access_class(class_id) and has_permission('manageAssessments'));
create policy "assessment_current_update" on assessment_current for update using (can_access_class(class_id) and has_permission('manageAssessments'));

alter table star_awards enable row level security;
create policy "star_awards_select" on star_awards for select using (can_access_class(class_id));
create policy "star_awards_insert" on star_awards for insert with check (can_access_class(class_id) and has_permission('manageStars'));
create policy "star_awards_update" on star_awards for update using (can_access_class(class_id) and has_permission('manageStars'));

alter table weekly_plans enable row level security;
create policy "weekly_plans_select" on weekly_plans for select using (can_access_class(class_id));
create policy "weekly_plans_insert" on weekly_plans for insert with check (can_access_class(class_id) and has_permission('manageWeeklyPlans'));
create policy "weekly_plans_update" on weekly_plans for update using (can_access_class(class_id) and has_permission('manageWeeklyPlans'));

alter table tasks enable row level security;
create policy "tasks_select" on tasks for select using (can_access_class(class_id));
create policy "tasks_insert" on tasks for insert with check (can_access_class(class_id) and can_manage_class_content());
create policy "tasks_update" on tasks for update using (can_access_class(class_id) and can_manage_class_content());

alter table class_rules enable row level security;
create policy "class_rules_select" on class_rules for select using (can_access_class(class_id));
create policy "class_rules_insert" on class_rules for insert with check (can_access_class(class_id) and can_manage_class_content());
create policy "class_rules_update" on class_rules for update using (can_access_class(class_id) and can_manage_class_content());

alter table attendance enable row level security;
create policy "attendance_select" on attendance for select using (can_access_class(class_id) and can_manage_class_content());
create policy "attendance_insert" on attendance for insert with check (can_access_class(class_id) and can_manage_class_content());
create policy "attendance_update" on attendance for update using (can_access_class(class_id) and can_manage_class_content());

alter table learning_records enable row level security;
create policy "learning_records_select" on learning_records for select using (can_access_class(class_id) and can_manage_class_content());
create policy "learning_records_insert" on learning_records for insert with check (can_access_class(class_id) and can_manage_class_content());
create policy "learning_records_update" on learning_records for update using (can_access_class(class_id) and can_manage_class_content());

alter table activities enable row level security;
create policy "activities_select" on activities for select using (can_access_class(class_id));
create policy "activities_insert" on activities for insert with check (can_access_class(class_id) and can_manage_class_content());
create policy "activities_update" on activities for update using (can_access_class(class_id) and can_manage_class_content());

alter table clubs enable row level security;
create policy "clubs_select" on clubs for select using (can_access_class(class_id));
create policy "clubs_insert" on clubs for insert with check (can_access_class(class_id) and can_manage_class_content());
create policy "clubs_update" on clubs for update using (can_access_class(class_id) and can_manage_class_content());

alter table journal_entries enable row level security;
create policy "journal_entries_select" on journal_entries for select using (can_access_class(class_id));
create policy "journal_entries_insert" on journal_entries for insert with check (can_access_class(class_id) and can_manage_class_content());
create policy "journal_entries_update" on journal_entries for update using (can_access_class(class_id) and can_manage_class_content());

alter table good_deeds enable row level security;
create policy "good_deeds_select" on good_deeds for select using (can_access_class(class_id));
create policy "good_deeds_insert" on good_deeds for insert with check (can_access_class(class_id) and can_manage_class_content());
create policy "good_deeds_update" on good_deeds for update using (can_access_class(class_id) and can_manage_class_content());

alter table library_items enable row level security;
create policy "library_items_select" on library_items for select using (can_access_class(class_id));
create policy "library_items_insert" on library_items for insert with check (can_access_class(class_id) and can_manage_class_content());
create policy "library_items_update" on library_items for update using (can_access_class(class_id) and can_manage_class_content());

alter table notifications enable row level security;
create policy "notifications_select" on notifications for select using (can_access_class(class_id));
create policy "notifications_insert" on notifications for insert with check (can_access_class(class_id) and has_permission('manageNotifications'));
create policy "notifications_update" on notifications for update using (can_access_class(class_id) and has_permission('manageNotifications'));

alter table parent_communications enable row level security;
create policy "parent_communications_select" on parent_communications for select using (can_access_class(class_id) and has_permission('contactParents'));
create policy "parent_communications_insert" on parent_communications for insert with check (can_access_class(class_id) and has_permission('contactParents'));
create policy "parent_communications_update" on parent_communications for update using (can_access_class(class_id) and has_permission('contactParents'));

-- Không tạo policy "for delete" ở bất kỳ bảng nghiệp vụ nào => mặc định
-- KHÔNG ai xoá được qua client, đúng tinh thần "lưu trữ mềm" của bản gốc.

-- ============================================================================
-- 8. RPC FUNCTIONS — thay cho các thao tác "chỉ sửa 1-2 cột" +
--    runTransaction() ở bản Firestore. Frontend gọi qua supabase.rpc(...).
-- ============================================================================

-- 8.1. Chấm điểm trực tiếp (giáo viên/người có quyền manageScores)
create or replace function add_score(
  p_class_id uuid, p_student_id uuid, p_student_name text,
  p_type score_type, p_value numeric, p_note text
) returns uuid
language plpgsql security definer as $$
declare
  v_delta numeric;
  v_score_id uuid;
begin
  if not (can_access_class(p_class_id) and has_permission('manageScores')) then
    raise exception 'Không có quyền chấm điểm.';
  end if;
  if p_value <= 0 then raise exception 'Số điểm phải lớn hơn 0.'; end if;

  v_delta := case when p_type in ('Điểm cộng','Khắc phục') then abs(p_value) else -abs(p_value) end;

  insert into scores (class_id, student_id, student_name, type, value, delta, note,
    assessor_uid, assessor_name, source, status)
  values (p_class_id, p_student_id, p_student_name, p_type, abs(p_value), v_delta, coalesce(p_note,''),
    auth.uid(), (select display_name from profiles where id = auth.uid()), 'teacher', 'active')
  returning id into v_score_id;

  update students set total_score = total_score + v_delta, updated_at = now()
    where id = p_student_id;

  return v_score_id;
end;
$$;

-- 8.2. Hoàn tác một bản ghi điểm
create or replace function cancel_score(p_score_id uuid) returns void
language plpgsql security definer as $$
declare v_score scores%rowtype;
begin
  select * into v_score from scores where id = p_score_id;
  if not found then raise exception 'Bản ghi điểm không còn tồn tại.'; end if;
  if not (can_access_class(v_score.class_id) and has_permission('manageScores')) then
    raise exception 'Không có quyền hoàn tác điểm.';
  end if;
  if v_score.status != 'active' then raise exception 'Bản ghi này đã được hoàn tác trước đó.'; end if;

  update scores set status = 'cancelled', cancelled_by_uid = auth.uid(),
    cancelled_by_name = (select display_name from profiles where id = auth.uid()), cancelled_at = now()
    where id = p_score_id;

  update students set total_score = total_score - v_score.delta, updated_at = now()
    where id = v_score.student_id;
end;
$$;

-- 8.3. Cán bộ lớp gửi đề nghị chấm điểm
create or replace function submit_score_proposal(
  p_class_id uuid, p_student_id uuid, p_student_name text,
  p_type score_type, p_value numeric, p_note text
) returns uuid
language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  v_linked uuid := current_linked_student_id();
  v_id uuid;
begin
  if not (can_access_class(p_class_id) and has_permission('submitScoreProposals') and current_profile_role() = 'student_officer') then
    raise exception 'Không có quyền gửi đề nghị chấm điểm.';
  end if;
  if p_student_id = v_linked then raise exception 'Cán bộ lớp không được tự chấm điểm cho chính mình.'; end if;
  if p_value < 1 or p_value > 10 then raise exception 'Mỗi đề nghị chỉ được từ 1 đến 10 điểm.'; end if;

  insert into score_proposals (class_id, student_id, student_name, type, value, note,
    proposer_uid, proposer_name, proposer_student_id, proposer_student_name, status)
  values (p_class_id, p_student_id, p_student_name, p_type, abs(p_value), coalesce(p_note,''),
    v_uid, (select display_name from profiles where id = v_uid), v_linked,
    (select linked_student_name from profiles where id = v_uid), 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

-- 8.4. Duyệt / từ chối đề nghị chấm điểm
create or replace function review_score_proposal(
  p_proposal_id uuid, p_action proposal_status, p_review_note text
) returns void
language plpgsql security definer as $$
declare
  v_prop score_proposals%rowtype;
  v_delta numeric;
begin
  select * into v_prop from score_proposals where id = p_proposal_id;
  if not found then raise exception 'Đề nghị không còn tồn tại.'; end if;
  if not (can_access_class(v_prop.class_id) and has_permission('manageScores')) then
    raise exception 'Không có quyền duyệt đề nghị.';
  end if;
  if v_prop.status != 'pending' then raise exception 'Đề nghị này đã được xử lý.'; end if;
  if p_action not in ('approved','rejected') then raise exception 'Hành động không hợp lệ.'; end if;

  if p_action = 'approved' then
    v_delta := case when v_prop.type in ('Điểm cộng','Khắc phục') then abs(v_prop.value) else -abs(v_prop.value) end;

    insert into scores (class_id, student_id, student_name, type, value, delta, note,
      assessor_uid, assessor_name, source, proposal_id, proposed_by_uid, proposed_by_name, status)
    values (v_prop.class_id, v_prop.student_id, v_prop.student_name, v_prop.type, abs(v_prop.value), v_delta,
      coalesce(v_prop.note,''), auth.uid(), (select display_name from profiles where id = auth.uid()),
      'officer_proposal', v_prop.id, v_prop.proposer_uid, v_prop.proposer_name, 'active');

    update students set total_score = total_score + v_delta, updated_at = now()
      where id = v_prop.student_id;
  end if;

  update score_proposals set status = p_action, reviewed_by_uid = auth.uid(),
    reviewed_by_name = (select display_name from profiles where id = auth.uid()),
    review_note = coalesce(p_review_note,''), reviewed_at = now()
    where id = p_proposal_id;
end;
$$;

-- 8.5. Thêm đánh giá phẩm chất/năng lực (tự tính lại trung bình)
create or replace function add_assessment(
  p_class_id uuid, p_student_id uuid, p_student_name text,
  p_category assessment_category, p_criterion text, p_score numeric, p_comment text
) returns uuid
language plpgsql security definer as $$
declare
  v_current_id text;
  v_old_score numeric := 0;
  v_existed boolean := false;
  v_sum numeric; v_count integer; v_avg numeric;
  v_history_id uuid;
  v_uid uuid := auth.uid();
  v_name text := (select display_name from profiles where id = v_uid);
begin
  if not (can_access_class(p_class_id) and has_permission('manageAssessments')) then
    raise exception 'Không có quyền đánh giá.';
  end if;
  if p_score < 1 or p_score > 5 then raise exception 'Điểm đánh giá phải từ 1 đến 5.'; end if;

  v_current_id := p_student_id::text || '_' || p_category::text || '_' || md5(p_criterion);

  select score, true into v_old_score, v_existed
    from assessment_current where id = v_current_id and status = 'active';
  if not found then v_old_score := 0; v_existed := false; end if;

  insert into assessments (class_id, student_id, student_name, category, criterion, score, comment,
    assessor_uid, assessor_name, status)
  values (p_class_id, p_student_id, p_student_name, p_category, p_criterion, p_score, coalesce(p_comment,''),
    v_uid, v_name, 'active')
  returning id into v_history_id;

  insert into assessment_current (id, class_id, student_id, student_name, category, criterion, score, comment,
    assessor_uid, assessor_name, status, history_id, updated_at)
  values (v_current_id, p_class_id, p_student_id, p_student_name, p_category, p_criterion, p_score, coalesce(p_comment,''),
    v_uid, v_name, 'active', v_history_id, now())
  on conflict (id) do update set
    student_name = excluded.student_name, score = excluded.score, comment = excluded.comment,
    assessor_uid = excluded.assessor_uid, assessor_name = excluded.assessor_name,
    status = 'active', history_id = excluded.history_id, updated_at = now();

  if p_category = 'quality' then
    select quality_score_sum, quality_score_count into v_sum, v_count from students where id = p_student_id;
    v_sum := greatest(0, v_sum - v_old_score + p_score);
    v_count := greatest(0, v_count + (case when v_existed then 0 else 1 end));
    v_avg := case when v_count > 0 then round(v_sum / v_count, 1) else 0 end;
    update students set quality_score_sum = v_sum, quality_score_count = v_count, quality_avg = v_avg, updated_at = now()
      where id = p_student_id;
  else
    select competency_score_sum, competency_score_count into v_sum, v_count from students where id = p_student_id;
    v_sum := greatest(0, v_sum - v_old_score + p_score);
    v_count := greatest(0, v_count + (case when v_existed then 0 else 1 end));
    v_avg := case when v_count > 0 then round(v_sum / v_count, 1) else 0 end;
    update students set competency_score_sum = v_sum, competency_score_count = v_count, competency_avg = v_avg, updated_at = now()
      where id = p_student_id;
  end if;

  return v_history_id;
end;
$$;

-- 8.6. Tặng sao
create or replace function award_star(
  p_class_id uuid, p_student_id uuid, p_student_name text,
  p_star_type text, p_reason text, p_week_number integer
) returns uuid
language plpgsql security definer as $$
declare v_id uuid;
begin
  if not (can_access_class(p_class_id) and has_permission('manageStars')) then
    raise exception 'Không có quyền tặng sao.';
  end if;

  insert into star_awards (class_id, student_id, student_name, star_type, reason,
    giver_uid, giver_name, week_number, status)
  values (p_class_id, p_student_id, p_student_name, p_star_type, coalesce(p_reason,''),
    auth.uid(), (select display_name from profiles where id = auth.uid()), p_week_number, 'active')
  returning id into v_id;

  update students set total_stars = total_stars + 1, updated_at = now() where id = p_student_id;
  return v_id;
end;
$$;

-- 8.7. Thu hồi sao
create or replace function revoke_star(p_award_id uuid) returns void
language plpgsql security definer as $$
declare v_award star_awards%rowtype;
begin
  select * into v_award from star_awards where id = p_award_id;
  if not found then raise exception 'Bản ghi sao không còn tồn tại.'; end if;
  if not (can_access_class(v_award.class_id) and has_permission('manageStars')) then
    raise exception 'Không có quyền thu hồi sao.';
  end if;
  if v_award.status != 'active' then raise exception 'Sao này đã được thu hồi.'; end if;

  update star_awards set status = 'cancelled', cancelled_by_uid = auth.uid(),
    cancelled_by_name = (select display_name from profiles where id = auth.uid()), cancelled_at = now()
    where id = p_award_id;

  update students set total_stars = greatest(0, total_stars - 1), updated_at = now()
    where id = v_award.student_id;
end;
$$;

-- ============================================================================
-- Hết migration. Sau khi chạy xong: vào Authentication > Providers > Google
-- để bật đăng nhập Google (xem hướng dẫn kèm theo).
-- ============================================================================
