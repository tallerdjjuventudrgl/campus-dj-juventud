---
tags: [documentacion-iso, alcances, limitaciones, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "1.0"
fecha: 2026-07-08
clasificacion: confidencial
estado: vigente
---

# Alcances y Limitaciones
## Campus Virtual — Taller de DJ

## 1. Alcance actual (Fase 2, en producción)

- Login por rol (alumno/instructor/admin) con Supabase Auth.
- Material del curso por módulos y lecciones (contenido estático).
- Progreso de lecciones completadas por alumno.
- Tareas: creación, entrega (con archivo), corrección con nota + feedback.
- Anuncios del instructor a todo el curso.
- Alta y baja de usuarios (solo admin, vía Edge Functions).

## 2. Fuera de alcance (explícito)

- **Pagos o inscripción con cobro** — no es una plataforma de e-commerce.
- **Videollamadas en vivo** — no reemplaza clases presenciales/virtuales sincrónicas.
- **Mensajería privada 1 a 1** — solo anuncios grupales al curso.
- **Certificados PDF automáticos, notificaciones por email, foro, app móvil nativa** —
  planeados para una eventual Fase 3, sin compromiso de fecha.
- **Editor de contenido del curso** — los módulos/lecciones son HTML estático; no hay
  un CMS para que el instructor edite el contenido sin tocar código.

## 3. Limitaciones técnicas conocidas

- Sin tests automatizados (ver 03_STP) — la verificación de cambios es manual.
- Sin infraestructura propia: la disponibilidad depende de Supabase (plan
  administrado) y GitHub Pages — sin SLA propio de SISTEMAS DesarrollAR.
- Un solo curso soportado en la práctica actual (`course_id` con valor fijo `'dj'` en
  el esquema) — extender a múltiples cursos requeriría trabajo adicional de modelo
  de datos y UI.

## 4. Limitaciones operativas

- El alta/baja de usuarios requiere intervención de un admin — no hay auto-registro
  abierto de alumnos.
- El contenido del curso solo lo puede modificar quien edita código (`publish/campus.html`)
  y ejecuta `deploy.bat` — no es autoservicio para los instructores.
