---
tags: [documentacion-iso, manual, administrador, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "1.0"
fecha: 2026-07-08
clasificacion: confidencial
estado: vigente
---

# Manual de Administrador / Instructor
## Campus Virtual — Taller de DJ

## 1. Roles disponibles

- **Alumno (`student`):** rol por defecto al registrarse.
- **Instructor (`instructor`):** gestiona tareas, corrige entregas, publica anuncios,
  ve el roster.
- **Admin (`admin`):** todo lo del instructor + alta y baja de cuentas de usuario.

## 2. Cómo crear una cuenta nueva (solo admin)

Usar la función de alta de usuarios del panel admin (llama a la Edge Function
`admin-create-user`). **No** crear usuarios manualmente desde el panel de Supabase —
se pierde la asignación automática de perfil (`handle_new_user()` corre solo en el
flujo normal de Supabase Auth, pero el rol inicial y las validaciones de la Edge
Function garantizan consistencia).

## 3. Cómo eliminar una cuenta (solo admin)

Usar la función de baja del panel admin (`admin-delete-user`). Esta función **bloquea
por diseño**:
- Eliminar la propia cuenta del admin que ejecuta la acción.
- Eliminar la cuenta de otro admin.

Si hace falta remover un admin, contactar a Jorge Adrián Duarte.

## 4. Gestión de tareas (instructor/admin)

1. Crear tarea: título, instrucciones, módulo asociado, fecha límite.
2. Los alumnos del curso la ven automáticamente en su vista.
3. Al llegar entregas, revisar en el panel de corrección: nota (0–10) + feedback escrito.
4. El alumno ve su nota y feedback apenas se guarda la corrección.

## 5. Anuncios

Cualquier instructor/admin puede publicar un anuncio; se muestra a todos los alumnos
del curso, sin segmentación por módulo.

## 6. Roster (seguimiento de alumnos)

Vista de instructor/admin con el listado de alumnos y su progreso (% de lecciones
completadas, tomado de la tabla `progress`).

## 7. Qué NO se puede hacer todavía (Fase 3, fuera de alcance actual)

- Emitir certificados en PDF automáticamente.
- Enviar notificaciones por email.
- Habilitar un foro de discusión.
- Ver el campus desde una app móvil nativa (funciona en navegador móvil, no hay app).
