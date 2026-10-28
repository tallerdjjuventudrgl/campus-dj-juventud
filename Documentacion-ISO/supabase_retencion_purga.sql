-- ============================================================
--  RETENCIÓN Y PURGA DE DATOS — Campus Virtual Taller de DJ
--  Ver 21_Politica_Retencion_Datos.md para la política completa.
--
--  Este script NO borra nada automáticamente. Da dos herramientas:
--  1) Una consulta para IDENTIFICAR cuentas candidatas a purga
--     (sin actividad hace más de N meses).
--  2) Un procedimiento manual documentado para ejecutar la baja
--     real (vía la Edge Function admin-delete-user, no SQL directo,
--     para no saltarse los bloqueos de seguridad ya existentes).
-- ============================================================

-- ---------- 1) Candidatos a purga: sin actividad hace más de 12 meses ----------
-- Ajustar el intervalo si Casa de la Juventud define un plazo distinto.
select
  p.id,
  p.email,
  p.name,
  p.role,
  p.created_at,
  greatest(
    coalesce(max(s.submitted_at), 'epoch'::timestamptz),
    coalesce(max(pr.completed_at), 'epoch'::timestamptz),
    p.created_at
  ) as ultima_actividad
from profiles p
left join submissions s on s.student_id = p.id
left join progress pr   on pr.user_id = p.id
where p.role = 'student'  -- no purgar instructores/admins por este criterio
group by p.id, p.email, p.name, p.role, p.created_at
having greatest(
    coalesce(max(s.submitted_at), 'epoch'::timestamptz),
    coalesce(max(pr.completed_at), 'epoch'::timestamptz),
    p.created_at
  ) < now() - interval '12 months'
order by ultima_actividad asc;

-- ============================================================
--  2) Procedimiento de purga (MANUAL, no automatizado)
-- ============================================================
--  a) Revisar la lista de candidatos de arriba con un admin humano
--     (Jorge Adrián Duarte o quien designe Casa de la Juventud).
--  b) Confirmar con Casa de la Juventud que el alumno/a efectivamente
--     dejó el taller y no hay razón administrativa para conservar el
--     registro (ej. proceso de reclamo de nota en curso).
--  c) Ejecutar la baja por el canal existente: la Edge Function
--     `admin-delete-user` desde el panel de admin del campus (NO
--     borrar filas de `profiles` a mano por SQL — esa función ya
--     tiene los bloqueos de seguridad: no admins, no auto-borrado).
--  d) La baja de `auth.users` cascadea a `profiles`, y de ahí a
--     `submissions` y `progress` (ambas con "on delete cascade").
--  e) Los ARCHIVOS en Storage (bucket "submissions") NO se borran
--     por el cascade de la base — hay que borrarlos aparte:
--
--     select name from storage.objects
--     where bucket_id = 'submissions'
--       and (storage.foldername(name))[1] = '<uuid-del-alumno-dado-de-baja>';
--
--     -- revisar la lista y, si corresponde, borrar con el cliente
--     -- de Storage de Supabase (no hay UI de borrado masivo acá).
-- ============================================================
