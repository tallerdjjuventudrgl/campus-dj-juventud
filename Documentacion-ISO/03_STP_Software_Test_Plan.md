---
tags: [documentacion-iso, stp, testing, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "1.0"
fecha: 2026-07-08
norma: "ISO/IEC/IEEE 29119"
clasificacion: confidencial
estado: vigente
---

# STP — Plan de Pruebas de Software
## Campus Virtual — Taller de DJ

## 1. Alcance

Proyecto sin suite de tests automatizados (frontend estático sin build ni framework de
testing). La verificación es **manual, funcional, por rol**, más una auditoría de
seguridad puntual ya realizada (25/06/2026, ver 06_Threat_Model).

## 2. Criterios de aceptación funcionales (verificados en el deploy a producción)

- [x] Login funciona para alumno, instructor y admin con cuentas reales de Supabase Auth.
- [x] El alumno ve el material, marca lecciones y su progreso se refleja en `progress`.
- [x] El instructor crea una tarea (`assignments`) y aparece para los alumnos del curso.
- [x] El alumno entrega (con archivo a Storage) y el instructor ve la entrega en `submissions`.
- [x] El instructor califica (nota + feedback) y el alumno lo ve.
- [x] El instructor publica un anuncio y los alumnos lo ven.
- [x] Un visitante sin sesión (solo con la clave `anon`) no puede leer ni escribir nada
      (verificado como parte de la auditoría de RLS).
- [x] Las Edge Functions de administración devuelven `401` sin autenticación (verificado en vivo).

## 3. Pruebas de seguridad (realizadas, ver 06/07)

- Revisión de claves/secretos expuestos en el código publicado — aprobada.
- Revisión de políticas RLS en las 5 tablas — aprobada, sin hallazgos.
- Verificación de las dos Edge Functions (rechazo sin auth, bloqueo de auto-eliminación
  y de eliminación de otros admins) — aprobada.

## 4. Pendiente / no cubierto

- No hay tests automatizados de regresión — cualquier cambio en `campus.html` o en las
  políticas SQL debe re-verificarse manualmente contra esta checklist antes de
  redeployar.
- No hay pruebas de carga/concurrencia (proyecto de bajo volumen, un solo curso).

## 5. Responsable

Jorge Adrián Duarte — verificación manual antes de cada deploy con `deploy.bat`.
