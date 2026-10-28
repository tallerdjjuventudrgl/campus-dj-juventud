---
tags: [documentacion-iso, srs, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "2.0"
fecha: 2026-07-08
norma: "ISO/IEC/IEEE 29148:2018"
clasificacion: confidencial
estado: vigente
origen: "_docs/CAMPUS-PRD.md (Fase 1) + esquema Supabase real (Fase 2, en producción)"
---

# SRS — Especificación de Requisitos de Software
## Campus Virtual — Taller de DJ

**Documento:** SRS-CAMPUSDJ-v2.0
**Cliente:** Casa de la Juventud — Municipalidad de Río Gallegos
**Clasificación:** Confidencial — SISTEMAS DesarrollAR

---

## 1. Visión

Transformar la landing page del Taller de DJ en un Campus Virtual (LMS) estilo educación
a distancia: alumnos e instructores ingresan con credenciales, acceden al material
organizado por módulos, y gestionan el ciclo completo tarea → entrega → corrección →
calificación → feedback.

## 2. Alcance actual (Fase 2 — en producción)

A diferencia del PRD original (Fase 1, prototipo en `localStorage`), la versión vigente
usa **Supabase** como backend real: datos compartidos entre usuarios, contraseñas
gestionadas por Supabase Auth (no en texto plano), archivos en Supabase Storage.

## 3. Roles y permisos

| Acción | Alumno (`student`) | Instructor (`instructor`) | Admin (`admin`) |
|---|:---:|:---:|:---:|
| Ver material y marcar lección completada | ✅ | ✅ | ✅ |
| Ver/entregar tareas propias | ✅ | — | — |
| Ver nota y feedback propios | ✅ | — | — |
| Crear/editar tareas | — | ✅ | ✅ |
| Ver entregas de todos y calificar | — | ✅ | ✅ |
| Publicar anuncios | — | ✅ | ✅ |
| Ver progreso de alumnos (roster) | — | ✅ | ✅ |
| Crear/eliminar cuentas de usuario | — | — | ✅ (vía Edge Functions) |

El rol vive en `profiles.role` (`check` constraint: `student`/`instructor`/`admin`) y se
resuelve del lado del servidor con la función `auth_role()` — no es falseable desde el
navegador (ver 06_Threat_Model, sección 7).

## 4. Requerimientos funcionales

- **FR1 Auth:** login con Supabase Auth (email + contraseña); sesión persistente; logout.
- **FR2 Roles:** render y permisos condicionados por `profiles.role`.
- **FR3 Material:** curso → módulos → lecciones, contenido estático embebido en `campus.html`.
- **FR4 Progreso:** tabla `progress` — lecciones completadas por alumno.
- **FR5 Tareas:** CRUD de `assignments` (instructor/admin): título, instrucciones, fecha límite.
- **FR6 Entregas:** alumno crea fila en `submissions` con `body` (texto) y `file_path`
  (referencia a Supabase Storage — audio/PDF/imagen).
- **FR7 Corrección:** instructor/admin actualiza `submissions` con nota + feedback.
- **FR8 Anuncios:** tabla `announcements`, visibles a todo el curso.
- **FR9 Roster:** instructor/admin consulta `profiles` + `progress` de todos los alumnos.
- **FR10 Alta/baja de usuarios:** Edge Functions `admin-create-user` / `admin-delete-user`
  (`service_role`, nunca expuesta al navegador).

## 5. Requerimientos no funcionales

- **NFR1 Idioma:** todo en español rioplatense (UI, mensajes, documentación).
- **NFR2 Responsive:** desktop y móvil.
- **NFR3 Sin servidor propio:** hosting estático (GitHub Pages) + backend administrado
  (Supabase) — sin infraestructura para mantener del lado de SISTEMAS DesarrollAR.
- **NFR4 Seguridad:** RLS activo en las 5 tablas, verificación de rol server-side
  (ver 06_Threat_Model y 07_Security_Hardening_Guide).

## 6. Modelo de datos (real, Supabase)

```
profiles      { id (=auth.users.id), email, name, role, created_at }
assignments   { id, course_id, module_id, title, instructions, due_date, created_by, created_at }
submissions   { id, assignment_id, student_id, body, file_path, ... nota/feedback }
announcements { id, course_id, title, body, author, created_at }
progress      { ... lecciones completadas por alumno }
```

## 7. Fuera de alcance (vigente)

- Pagos / inscripción con cobro.
- Videollamadas en vivo.
- Mensajería privada 1 a 1 (solo anuncios al curso).
- Certificado PDF automático, notificaciones por email, foro, app móvil — planeados
  para Fase 3, sin fecha comprometida.

## 8. Historial de fases

| Fase | Qué | Estado |
|---|---|---|
| 1 — Prototipo local | Todo en `localStorage`, contraseñas en texto plano | Cerrada, migrada |
| 2 — Sistema real online | Supabase (Auth + Postgres + Storage), en producción | **Vigente desde 2026-06-25** |
| 3 — Extras | Certificados, notificaciones, foro, app móvil | Sin iniciar |
