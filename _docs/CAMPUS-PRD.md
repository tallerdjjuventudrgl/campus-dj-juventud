# PRD — Campus Virtual · Taller de DJ (Casa de la Juventud, Río Gallegos)

> Spec-driven development. Este documento es la fuente de verdad del producto.
> Versión 1.0 · Fase 1 (Prototipo local funcional)

---

## 1. Visión

Transformar la landing page del Taller de DJ en un **Campus Virtual (LMS)** estilo
universidad a distancia, donde alumnos e instructores ingresan con credenciales,
acceden al material organizado por módulos, y gestionan un ciclo completo de
**tarea → entrega → corrección → calificación → feedback**.

## 2. Objetivos

- O1. Que cada usuario tenga **cuenta con rol** (alumno / instructor / admin).
- O2. Que el alumno acceda al **material del curso** y registre su **progreso**.
- O3. Que el instructor **cree tareas** con consigna y fecha límite.
- O4. Que el alumno **entregue** tareas (incluyendo archivos de audio: sus sets).
- O5. Que el instructor **corrija**: nota + feedback escrito.
- O6. Comunicación por **anuncios** del instructor al curso.

## 3. Roles y permisos

| Acción | Alumno | Instructor | Admin |
|---|:---:|:---:|:---:|
| Ver material y marcar lección completada | ✅ | ✅ | ✅ |
| Ver/entregar tareas propias | ✅ | — | — |
| Ver nota y feedback propios | ✅ | — | — |
| Crear/editar tareas | — | ✅ | ✅ |
| Ver entregas de todos y calificar | — | ✅ | ✅ |
| Publicar anuncios | — | ✅ | ✅ |
| Ver progreso de alumnos (roster) | — | ✅ | ✅ |
| Crear usuarios / gestionar cuentas | — | — | ✅ |

## 4. User stories

- **US1** (Alumno): como alumno quiero iniciar sesión y ver mis cursos y tareas pendientes.
- **US2** (Alumno): quiero leer el material por módulos y marcar cada lección como vista.
- **US3** (Alumno): quiero entregar una tarea subiendo un archivo (mi set) y/o texto.
- **US4** (Alumno): quiero ver la nota y el feedback que dejó el instructor.
- **US5** (Instructor): quiero crear una tarea con consigna, módulo y fecha límite.
- **US6** (Instructor): quiero ver todas las entregas de una tarea y calificarlas.
- **US7** (Instructor): quiero publicar un anuncio para todo el curso.
- **US8** (Instructor): quiero ver el progreso de cada alumno.
- **US9** (Admin): quiero crear cuentas de instructores y alumnos.

## 5. Requerimientos funcionales

- **FR1 Auth**: login por email + contraseña; sesión persistente; logout.
- **FR2 Roles**: render y permisos según rol.
- **FR3 Material**: curso → módulos → lecciones (contenido + tip + glosario). Marcar completada.
- **FR4 Progreso**: % de lecciones completadas por alumno; barra visible.
- **FR5 Tareas**: CRUD de tareas (instructor). Estado por alumno: pendiente / entregada / corregida.
- **FR6 Entregas**: el alumno sube archivo (audio/PDF/imagen) + comentario; queda registrada con fecha.
- **FR7 Corrección**: el instructor asigna nota (0–10) + feedback; cambia estado a corregida.
- **FR8 Anuncios**: el instructor publica; todos los del curso los ven.
- **FR9 Roster**: el instructor ve lista de alumnos y su progreso.

## 6. Modelo de datos (entidades)

```
User        { id, name, email, password, role, courseIds[], progress{lessonKey:true} }
Course      { id, title, modules[ { id, title, icon, color, lessons[ {id, title, body, tip, terms[]} ] } ] }
Assignment  { id, courseId, moduleId, title, instructions, dueDate, createdBy, createdAt }
Submission  { id, assignmentId, studentId, text, file{name,size,type,dataUrl?}, submittedAt, status, grade, feedback, gradedAt, gradedBy }
Announcement{ id, courseId, title, body, author, createdAt }
Session     { userId }
```

## 7. No funcionales / Seguridad

- **NFR1**: UI consistente con la marca (paleta JUVENTUD, modo oscuro, tipografía Fredoka/Outfit).
- **NFR2**: responsive (desktop y móvil).
- **NFR3 (⚠️ Fase 1)**: los datos viven en `localStorage` del navegador y las contraseñas se
  guardan en texto plano. **Es un prototipo de validación, NO apto para producción real.**
  La seguridad real (hash de contraseñas, datos compartidos, control de acceso) llega en Fase 2.

## 8. Fuera de alcance (v1)

- Pagos / inscripción con cobro.
- Videollamadas en vivo.
- Mensajería privada 1-a-1 (solo anuncios al curso en v1).
- Certificado PDF automático (planeado Fase 3).

## 9. Roadmap por fases

| Fase | Qué | Tecnología |
|---|---|---|
| **1 — Prototipo local** (ESTA) | Todos los flujos funcionando en una compu, datos en el navegador | HTML + CSS + JS vanilla + `localStorage` |
| **2 — Sistema real online** | Multiusuario real, datos compartidos, archivos en la nube, contraseñas hasheadas | Supabase (Auth + Postgres + Storage) + mismo frontend |
| **3 — Extras** | Certificados, notificaciones por email, foro, app móvil | Supabase Edge Functions, etc. |

## 10. Plan de implementación (Fase 1)

1. **Esqueleto + estilos** de marca y router SPA por roles. ✅
2. **Capa de datos** (`localStorage`) con seed: curso DJ completo, usuarios demo, tareas demo. ✅
3. **Auth**: pantalla de login + accesos rápidos demo + logout. ✅
4. **Vista Alumno**: dashboard, material+progreso, tareas (entregar/ver nota), anuncios. ✅
5. **Vista Instructor**: dashboard, crear tarea, ver entregas y corregir, roster, publicar anuncio. ✅
6. **Vista Admin**: alta de usuarios. ✅
7. **Verificación** de sintaxis y flujos. ✅
8. **Entregable**: `campus.html` (autocontenido, se abre con doble clic) + enlace desde la landing.

## 11. Criterios de aceptación (Fase 1)

- [ ] Puedo loguearme como alumno e instructor con cuentas demo.
- [ ] El alumno ve el material, marca lecciones y su barra de progreso sube.
- [ ] El instructor crea una tarea y aparece en la lista del alumno.
- [ ] El alumno entrega (con archivo) y el instructor ve la entrega.
- [ ] El instructor califica con nota + feedback y el alumno lo ve.
- [ ] El instructor publica un anuncio y el alumno lo ve.
