---
tags: [documentacion-iso, seguridad, hardening, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "1.0"
fecha: 2026-07-08
norma: "ISO/IEC 27001:2022"
clasificacion: confidencial
estado: vigente
origen: "_docs/INFORME-SEGURIDAD.md"
---

# Guía de Fortalecimiento de Seguridad
## Campus Virtual — Taller de DJ

## 1. Estado actual (auditado 2026-06-25 — aprobado sin hallazgos)

| Control | Estado |
|---|---|
| RLS activo en las 5 tablas (`profiles`, `assignments`, `submissions`, `announcements`, `progress`) | ✅ |
| Verificación de rol server-side (`auth_role()`, sin recursión de RLS) | ✅ |
| `service_role` solo en env vars de Edge Functions, nunca en el navegador | ✅ |
| `CLAVE PROYECTO EN SUPABASE .txt` fuera del repo (`.gitignore`) y nunca en el historial de git | ✅ |
| Edge Functions devuelven 401 sin autenticación | ✅ |
| `admin-delete-user` bloquea auto-eliminación y eliminación de otros admins | ✅ |

## 2. `.gitignore` de referencia (reforzado en la auditoría)

```
CLAVE*.txt
*SUPABASE*.txt
.claude/
campus-local-backup.html
*.docx
```

## 3. Reglas para mantener el hardening al editar

- **Toda tabla nueva** en Supabase: activar RLS y escribir sus políticas **antes** de
  usarla desde el cliente (Supabase ofrece auto-enable RLS para tablas nuevas — usarlo).
- **Nunca** leer `profiles.role` del lado del cliente para decidir permisos reales —
  usar siempre `auth_role()` u otra función `security definer` equivalente.
- **Nunca** exponer `SUPABASE_SERVICE_ROLE_KEY` fuera de las Edge Functions (ni en
  `campus.html`, ni en variables de build del frontend).
- Antes de commitear, verificar que ningún archivo con `SUPABASE` o `CLAVE` en el
  nombre quedó fuera del `.gitignore`.

## 4. Verificación periódica recomendada

- Revisar políticas RLS cada vez que se agregue una tabla o un campo sensible nuevo.
- Rotar la clave `anon` **solo** si se sospecha abuso — no es necesario por estar
  pública por diseño de Supabase.
- Revisar el historial de git ante cualquier sospecha de filtración de credenciales
  (`git log -p -- '*SUPABASE*' '*CLAVE*'`).

## 5. Próxima auditoría

Sin fecha fija — disparadores: agregar tabla/campo nuevo, incorporar Fase 3
(certificados/notificaciones/foro), o reporte de incidente.
