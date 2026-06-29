-- ============================================================
--  CAMPUS VIRTUAL · TALLER DE DJ — Esquema Supabase (Fase 2)
--  Pegar TODO esto en: Supabase → SQL Editor → New query → Run
--  El contenido del curso (módulos/lecciones) sigue siendo estático
--  en campus.html; acá solo viven los datos dinámicos y los usuarios.
-- ============================================================

-- ---------- 1) PERFILES (extiende auth.users) ----------
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text,
  name       text,
  role       text not null default 'student' check (role in ('student','instructor','admin')),
  created_at timestamptz default now()
);

-- Crear el perfil automáticamente cuando alguien se registra
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    'student'
  );
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper para leer el rol sin recursión de RLS
create or replace function auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------- 2) TAREAS ----------
create table if not exists assignments (
  id           uuid primary key default gen_random_uuid(),
  course_id    text default 'dj',
  module_id    int,
  title        text not null,
  instructions text,
  due_date     date,
  created_by   text,
  created_at   timestamptz default now()
);

-- ---------- 3) ENTREGAS ----------
create table if not exists submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments on delete cascade,
  student_id    uuid references profiles on delete cascade,
  body          text,
  file_path     text,
  file_name     text,
  file_size     bigint,
  file_type     text,
  submitted_at  timestamptz default now(),
  status        text default 'pending' check (status in ('pending','graded')),
  grade         numeric,
  feedback      text,
  graded_at     timestamptz,
  graded_by     text,
  unique (assignment_id, student_id)
);

-- ---------- 4) ANUNCIOS ----------
create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  course_id  text default 'dj',
  title      text not null,
  body       text,
  author     text,
  created_at timestamptz default now()
);

-- ---------- 5) PROGRESO ----------
create table if not exists progress (
  user_id      uuid references profiles on delete cascade,
  lesson_id    text,
  completed_at timestamptz default now(),
  primary key (user_id, lesson_id)
);

-- ============================================================
--  SEGURIDAD (Row Level Security)
-- ============================================================
alter table profiles      enable row level security;
alter table assignments   enable row level security;
alter table submissions   enable row level security;
alter table announcements enable row level security;
alter table progress      enable row level security;

-- Perfiles: lectura para autenticados; cada uno edita el suyo
create policy "profiles_read"       on profiles for select to authenticated using (true);
create policy "profiles_update_own" on profiles for update to authenticated using (id = auth.uid());

-- Tareas: leen todos; crean/editan solo instructor/admin
create policy "assign_read"       on assignments for select to authenticated using (true);
create policy "assign_write_staff" on assignments for all to authenticated
  using (auth_role() in ('instructor','admin'))
  with check (auth_role() in ('instructor','admin'));

-- Entregas: el alumno gestiona las propias; staff lee todas y corrige
create policy "sub_read_own_or_staff" on submissions for select to authenticated
  using (student_id = auth.uid() or auth_role() in ('instructor','admin'));
create policy "sub_insert_own" on submissions for insert to authenticated
  with check (student_id = auth.uid());
create policy "sub_update_own_or_staff" on submissions for update to authenticated
  using (student_id = auth.uid() or auth_role() in ('instructor','admin'));

-- Anuncios: leen todos; escriben staff
create policy "ann_read"        on announcements for select to authenticated using (true);
create policy "ann_write_staff" on announcements for all to authenticated
  using (auth_role() in ('instructor','admin'))
  with check (auth_role() in ('instructor','admin'));

-- Progreso: el alumno gestiona el suyo; staff lo lee
create policy "prog_read_own_or_staff" on progress for select to authenticated
  using (user_id = auth.uid() or auth_role() in ('instructor','admin'));
create policy "prog_write_own" on progress for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
--  ALMACENAMIENTO (archivos de entregas: audios, PDFs)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('submissions','submissions', false)
on conflict (id) do nothing;

create policy "storage_upload_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "storage_read_own_or_staff" on storage.objects for select to authenticated
  using (bucket_id = 'submissions'
         and ((storage.foldername(name))[1] = auth.uid()::text or auth_role() in ('instructor','admin')));

-- ============================================================
--  DATOS INICIALES (tareas + anuncio de bienvenida)
-- ============================================================
insert into assignments (module_id, title, instructions, due_date, created_by) values
 (2,'Análisis armónico de 3 temas','Elegí 3 canciones, identificá su clave con la Ruleta de Camelot y proponé un orden de mezcla justificando por qué combinan.', current_date + 7,  'Instructor'),
 (3,'Mini set de 5 canciones','Grabá un set de 5 temas aplicando beatmatching y al menos 2 transiciones limpias con EQ. Subí el audio (MP3) o el link a SoundCloud.', current_date + 14, 'Instructor'),
 (6,'Set final grabado','Tu proyecto final: un set completo que cuente una historia (opening → pico → cierre). Subí el audio y un breve texto sobre tu identidad sonora.', current_date + 30, 'Instructor');

insert into announcements (title, body, author) values
 ('¡Bienvenidos al Taller!','Arrancamos el ciclo. Revisen el Módulo 1 y traigan auriculares cerrados. Cualquier duda la vemos en clase.','Instructor');

-- ============================================================
--  ¡LISTO! Después de registrarte en el campus, convertite en
--  instructor/admin ejecutando (cambiá el email por el tuyo):
--
--    update profiles set role = 'admin' where email = 'tu@email.com';
-- ============================================================
