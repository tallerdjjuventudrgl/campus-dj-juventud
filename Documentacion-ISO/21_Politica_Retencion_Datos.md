---
tags: [documentacion-iso, retencion, datos, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "2.0"
fecha: 2026-07-09
clasificacion: confidencial
estado: vigente
origen: "Política adoptada por defecto por SISTEMAS DesarrollAR ante la ausencia de un criterio propio de Casa de la Juventud (principio de minimización/proporcionalidad, Ley 25.326)."
---

# Política de Retención de Datos
## Campus Virtual — Taller de DJ

> [!info] Política adoptada por defecto (2026-07-09)
> Casa de la Juventud no había definido un criterio propio de retención. Ante eso,
> SISTEMAS DesarrollAR adoptó la política de esta sección como **default razonable**
> (principio de minimización de datos, Ley 25.326), **no como un acuerdo ya cerrado
> con el cliente**. Si Casa de la Juventud define un criterio distinto, se actualiza
> este documento y se ajusta el script de la sección 4.

## 1. Períodos de retención (política vigente)

| Dato | Mientras la cuenta está activa | Tras 12 meses sin actividad (alumno) |
|---|---|---|
| Perfil (nombre, email, rol) | Retenido | Candidato a purga (ver sección 3) |
| Progreso de lecciones | Retenido | Se purga junto con el perfil (cascada en BD) |
| Entregas (texto) y calificaciones | Retenido — valor pedagógico | Se purga junto con el perfil (cascada en BD) |
| Archivos de entrega (audio/PDF/imagen en Storage) | Retenido | **No se purgan automáticamente** — requieren borrado manual aparte (ver script) |
| Anuncios | Indefinida | No aplica — no son datos personales de un individuo |
| Cuentas de instructor/admin | Indefinida mientras estén activos | Excluidas de la purga automática por defecto — de baja manual únicamente |

**Criterio de "sin actividad":** 12 meses sin entregas nuevas (`submissions.submitted_at`)
ni progreso nuevo (`progress.completed_at`), contados desde la fecha más reciente entre
esas dos y la creación de la cuenta. Se eligió 12 meses por ser un plazo razonable para
un taller de dictado anual, sin que la ausencia temporal de un alumno dispare un borrado
prematuro.

## 2. Excepción — casos que NO se purgan aunque cumplan el criterio

- Reclamos de nota o disputa de evaluación en curso.
- Instrucción expresa de Casa de la Juventud de conservar un registro puntual.

## 3. Cómo se identifican los candidatos (implementado)

`supabase_retencion_purga.sql` (en esta misma carpeta) trae la consulta real contra el
esquema de Supabase que lista alumnos sin actividad hace más de 12 meses. **No borra
nada solo**: es para que un admin humano revise antes de dar de baja.

## 4. Cómo se ejecuta la purga (procedimiento, no automático)

1. Correr la consulta de la sección 1 de `supabase_retencion_purga.sql` en el SQL
   Editor de Supabase.
2. Confirmar con Casa de la Juventud que cada candidato efectivamente dejó el taller.
3. Dar de baja **por la Edge Function `admin-delete-user`** desde el panel de admin
   (nunca borrando filas de `profiles` directo por SQL — así se conservan los
   bloqueos de seguridad ya existentes: no admins, no auto-baja).
4. La baja cascadea de `auth.users` → `profiles` → `submissions`/`progress`
   (`on delete cascade` en el esquema real).
5. **Los archivos en Supabase Storage no se borran solos con ese cascade** — hay que
   borrarlos aparte (consulta y procedimiento en la sección 2 del script SQL).

## 5. Por qué no está 100% automatizado

El esquema actual no tiene un campo de "curso finalizado"/"fecha de baja" — la
detección de inactividad es una aproximación por última actividad, no un dato
explícito. Automatizar la purga sin revisión humana sería riesgoso (podría borrar una
cuenta inactiva por una simple pausa, no por baja real). Se optó por semi-automatizar:
detección automática + ejecución manual revisada.

## 6. Responsable de ejecutar la retención/purga

Jorge Adrián Duarte, con confirmación previa de Casa de la Juventud caso por caso —
no delegado a los instructores.
