-- ============================================================
--  HERRAMIENTAS / RECURSOS — tabla + RLS + Storage
--  Campus DJ · Casa de la Juventud
--
--  CÓMO USAR:
--  1) Supabase → SQL Editor → New query
--  2) Pegá TODO este archivo
--  3) Click en "Run"
--  Con esto se crea la tabla `tools`, sus políticas de seguridad
--  y el bucket de Storage `tools` (público) con sus políticas.
--  Solo admin e instructores pueden cargar/editar/borrar.
--  Todos los logueados pueden ver y descargar.
-- ============================================================

-- 1) Tabla de recursos
create table if not exists public.tools (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,              -- software | musica | videos | imagenes | links | documentos
  title       text not null,
  description text,
  url         text,                       -- link externo o URL pública del archivo subido
  file_path   text,                       -- ruta en Storage si se subió un archivo
  file_name   text,
  file_size   bigint,
  file_type   text,
  created_at  timestamptz not null default now(),
  created_by  text
);

-- 2) Activar Row Level Security
alter table public.tools enable row level security;

-- Leer: cualquier usuario logueado
drop policy if exists tools_read on public.tools;
create policy tools_read on public.tools
  for select to authenticated
  using (true);

-- Crear / editar / borrar: solo admin e instructores
drop policy if exists tools_write_staff on public.tools;
create policy tools_write_staff on public.tools
  for all to authenticated
  using (auth_role() = any (array['admin','instructor']))
  with check (auth_role() = any (array['admin','instructor']));

-- 3) Bucket de Storage (público para tener links estables)
insert into storage.buckets (id, name, public)
values ('tools', 'tools', true)
on conflict (id) do nothing;

-- 4) Políticas de Storage para el bucket `tools`
-- Lectura pública
drop policy if exists tools_obj_read on storage.objects;
create policy tools_obj_read on storage.objects
  for select to public
  using (bucket_id = 'tools');

-- Subir / editar / borrar archivos: solo admin e instructores
drop policy if exists tools_obj_write on storage.objects;
create policy tools_obj_write on storage.objects
  for all to authenticated
  using (bucket_id = 'tools' and auth_role() = any (array['admin','instructor']))
  with check (bucket_id = 'tools' and auth_role() = any (array['admin','instructor']));

-- ============================================================
-- 5) REGISTRO DE DESCARGAS — quién descargó/abrió cada recurso
-- ============================================================
create table if not exists public.tool_downloads (
  id            uuid primary key default gen_random_uuid(),
  tool_id       uuid,                      -- referencia al recurso (sin FK, para conservar el historial aunque se borre)
  tool_title    text,                      -- título guardado por las dudas
  user_id       uuid,
  user_name     text,
  downloaded_at timestamptz not null default now()
);

alter table public.tool_downloads enable row level security;

-- Registrar descarga: cualquier logueado, pero solo a su propio nombre
drop policy if exists tooldl_insert_own on public.tool_downloads;
create policy tooldl_insert_own on public.tool_downloads
  for insert to authenticated
  with check (user_id = auth.uid());

-- Ver el registro: solo admin e instructores
drop policy if exists tooldl_read_staff on public.tool_downloads;
create policy tooldl_read_staff on public.tool_downloads
  for select to authenticated
  using (auth_role() = any (array['admin','instructor']));

-- Listo. Ya podés usar la sección 🛠️ Herramientas en el campus.
