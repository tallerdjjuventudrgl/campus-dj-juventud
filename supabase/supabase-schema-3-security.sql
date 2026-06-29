-- ============================================================
--  MIGRACIÓN 3 · ENDURECIMIENTO DE SEGURIDAD
--  Pegar TODO en: Supabase → SQL Editor → New query → Run
--  (Correr DESPUÉS de schema.sql y schema-2.sql)
-- ============================================================

-- 1) PRIVACIDAD DE PERFILES
--    Un usuario solo puede leer SU perfil. El staff (instructor/admin) ve todos.
drop policy if exists profiles_read on profiles;
drop policy if exists profiles_read_self on profiles;
create policy profiles_read_self on profiles for select to authenticated
  using ( id = auth.uid() or auth_role() in ('instructor','admin') );

-- 2) ANTI-ESCALADA / ANTI-LOCKOUT
--    Un no-admin NO puede cambiar su rol, su usuario ni su email.
create or replace function guard_profile_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(auth_role(),'') <> 'admin' then
    if NEW.role     is distinct from OLD.role     then raise exception 'No autorizado: no podés cambiar el rol'; end if;
    if NEW.username is distinct from OLD.username then raise exception 'No autorizado: no podés cambiar el usuario'; end if;
    if NEW.email    is distinct from OLD.email    then raise exception 'No autorizado: no podés cambiar el email'; end if;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_guard_role on profiles;
drop trigger if exists trg_guard_profile on profiles;
create trigger trg_guard_profile before update on profiles
  for each row execute function guard_profile_changes();

-- 3) ANTI-AUTOCALIFICACIÓN
--    Un alumno NO puede tocar la nota, el estado ni el feedback de su entrega.
--    (solo instructor/admin pueden calificar)
create or replace function guard_submission_grade()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth_role(),'') not in ('instructor','admin') then
    if NEW.grade        is distinct from OLD.grade
    or NEW.status       is distinct from OLD.status
    or NEW.feedback     is distinct from OLD.feedback
    or NEW.graded_by    is distinct from OLD.graded_by
    or NEW.graded_at    is distinct from OLD.graded_at
    or NEW.student_id   is distinct from OLD.student_id
    or NEW.assignment_id is distinct from OLD.assignment_id then
      raise exception 'No autorizado: solo un instructor puede calificar';
    end if;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_guard_submission on submissions;
create trigger trg_guard_submission before update on submissions
  for each row execute function guard_submission_grade();

-- 4) Limpiar el usuario de prueba del diagnóstico (si quedó)
delete from auth.users where email = 'probe_dom_01@casadelajuventud.gob';

-- ============================================================
--  LISTO. La base ahora rechaza: auto-notas, espionaje de datos
--  de otros, y cambios de rol/usuario no autorizados.
-- ============================================================
