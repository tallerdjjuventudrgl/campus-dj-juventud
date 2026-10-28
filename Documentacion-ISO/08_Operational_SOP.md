---
tags: [documentacion-iso, sop, operacion, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "1.0"
fecha: 2026-07-08
clasificacion: confidencial
estado: vigente
---

# SOP — Procedimiento Operativo Estándar
## Campus Virtual — Taller de DJ

## 1. Operación diaria (instructores)

1. Publicar anuncios desde el panel de instructor.
2. Crear tareas con consigna y fecha límite (módulo del curso).
3. Revisar entregas nuevas en `submissions` y calificar (nota 0–10 + feedback).
4. Consultar el roster para ver progreso de alumnos.

## 2. Alta de usuarios (admin)

Alta y baja de cuentas se hace **exclusivamente** vía las Edge Functions
(`admin-create-user` / `admin-delete-user`), nunca manipulando `auth.users` directo
desde el SQL Editor de Supabase — así se mantienen las verificaciones de rol y los
bloqueos de seguridad (no eliminar admins, no auto-eliminarse).

## 3. Publicar cambios de contenido (`deploy.bat`)

Ver 10_Deployment_Guide para el detalle técnico. Resumen operativo:
1. Editar **solo** en `publish/`, nunca en `docs/`.
2. Correr `deploy.bat` (copia `publish/` → `docs/` y pushea a GitHub).
3. Verificar el cambio en la URL pública: https://tallerdjjuventudrgl.github.io/campus-dj-juventud/

## 4. Carga de material del curso

Los módulos/lecciones son contenido estático embebido en `campus.html` (no hay un
editor de contenido separado). Cambios de contenido del curso implican editar
`publish/campus.html` directamente y redeployar.

## 5. Soporte a instructores

Gisel Duarte y Franco Esquivel son los contactos principales del lado del cliente;
`GUIA-INSTRUCTORES-google-drive.html` documenta cómo cargar material de apoyo vía
Google Drive.

## 6. Escalamiento

Cualquier reporte de error, dato incorrecto o sospecha de problema de acceso →
contactar a Jorge Adrián Duarte (SISTEMAS DesarrollAR) antes de intentar arreglos
manuales en Supabase.
