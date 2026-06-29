-- ============================================================
--  NOSOTROS / EQUIPO — tarjetas de instructores
--  Campus DJ · Casa de la Juventud
--
--  Cada instructor edita SU propia tarjeta desde el campus.
--  La sección "Nosotros" se muestra pública en la landing.
--
--  CÓMO USAR: Supabase → SQL Editor → New query → pegar todo → Run
-- ============================================================

-- 1) Tabla de tarjetas de instructores
create table if not exists public.instructors (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique,            -- el instructor dueño de la tarjeta
  name       text,
  title      text,                   -- cargo, ej: "Director Académico"
  bio        text,
  photo_url  text,
  instagram  text,
  spotify    text,
  soundcloud text,
  youtube    text,
  tiktok     text,
  website    text,
  whatsapp   text,
  sort       int default 0,
  visible    boolean default true,
  updated_at timestamptz not null default now()
);

-- 2) Row Level Security
alter table public.instructors enable row level security;

-- Leer: PÚBLICO (es una sección pública de la web)
drop policy if exists instructors_read on public.instructors;
create policy instructors_read on public.instructors
  for select to anon, authenticated
  using (true);

-- Cada instructor gestiona SU propia tarjeta
drop policy if exists instructors_own on public.instructors;
create policy instructors_own on public.instructors
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- El admin puede gestionar todas las tarjetas
drop policy if exists instructors_admin on public.instructors;
create policy instructors_admin on public.instructors
  for all to authenticated
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

-- 3) Bucket público para las fotos de perfil
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Lectura pública de las fotos
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

-- Subir / cambiar foto: solo admin e instructores
drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and auth_role() = any (array['admin','instructor']))
  with check (bucket_id = 'avatars' and auth_role() = any (array['admin','instructor']));

-- Listo. Cada instructor ya puede completar su tarjeta en el campus (👤 Mi Tarjeta).
