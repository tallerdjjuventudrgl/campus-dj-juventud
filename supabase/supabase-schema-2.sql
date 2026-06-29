-- ============================================================
--  MIGRACIÓN 2 · Login por USUARIO + el ADMIN crea cuentas
--  Pegar TODO en: Supabase → SQL Editor → New query → Run
--  (Correr DESPUÉS de supabase-schema.sql)
-- ============================================================

-- 1) Columna username (única, sin distinguir mayúsculas)
alter table profiles add column if not exists username text;
create unique index if not exists profiles_username_key on profiles (lower(username));

-- 2) El trigger ahora guarda también el username (desde los metadatos)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, username, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1))),
    'student'
  );
  return new;
end; $$;

-- 3) El admin puede leer y editar CUALQUIER perfil (para crear/gestionar usuarios)
drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles for all to authenticated
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

-- 4) Seguridad: un usuario NO-admin no puede cambiarse el rol a sí mismo
create or replace function guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.role is distinct from OLD.role
     and auth.uid() is not null
     and coalesce(auth_role(),'') <> 'admin' then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_guard_role on profiles;
create trigger trg_guard_role before update on profiles
  for each row execute function guard_role_change();

-- ============================================================
--  ¡LISTO! Ahora seguí los pasos que te indico para crear tu
--  usuario administrador inicial.
-- ============================================================
