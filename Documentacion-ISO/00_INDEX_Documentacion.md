---
tags: [documentacion-iso, indice, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "1.0"
fecha: 2026-07-08
---

# Índice de Documentación ISO — Campus Virtual Taller de DJ

**Proyecto:** Campus Virtual — Taller de DJ (Gisel Duarte y Franco Esquivel)
**Cliente:** Casa de la Juventud — organismo de la Municipalidad de Río Gallegos
**Versión:** 1.0
**Fecha:** 2026-07-08
**Desarrollador:** SISTEMAS DesarrollAR — Jorge Adrián Duarte
**URL en producción:** https://tallerdjjuventudrgl.github.io/campus-dj-juventud/

---

## Set de documentos (proporcional al tamaño del proyecto)

> Set reducido respecto del máximo de 27 documentos de la plantilla: un LMS de un solo
> cliente, sin facturación ni infraestructura propia (Supabase administrado + GitHub
> Pages), no justifica documentos como Plan de Negocios o Executive Dossier. Se armó el
> subconjunto que sí aplica; si el proyecto crece (Fase 3: certificados, notificaciones,
> foro), ampliar este índice.

| # | Código | Nombre | Estado |
|---|---|---|---|
| 00 | IDX | Índice de Documentación | ✅ |
| 01 | SRS | Especificación de Requisitos de Software | ✅ |
| 02 | SAD | Documento de Arquitectura de Software | ✅ |
| 03 | STP | Plan de Pruebas de Software | ✅ |
| 06 | TM | Análisis de Amenazas y Seguridad | ✅ |
| 07 | SHG | Guía de Fortalecimiento de Seguridad | ✅ |
| 08 | SOP | Procedimiento Operativo Estándar | ✅ |
| 10 | DG | Guía de Despliegue | ✅ |
| 11 | MM | Manual de Mantenimiento | ✅ |
| 12 | AM | Manual de Administrador/Instructor | ✅ |
| 15 | EULA | Licencia de Uso | ✅ |
| 17 | AL | Alcances y Limitaciones | ✅ |
| 20 | PP | Política de Privacidad | ✅ |
| 20b | — | Anexo — Autorización de Menores (+ formulario .docx imprimible) | ✅ (2026-07-09) |
| 21 | PRD | Política de Retención de Datos (+ script SQL de purga) | ✅ (v2.0, 2026-07-09) |
| 22 | DIT | Declaración de Integridad Técnica | ✅ |

## Contexto del proyecto

### Descripción
LMS (campus virtual) para el Taller de DJ de la Casa de la Juventud de Río Gallegos.
Reemplaza una landing estática por un sistema con login por roles (alumno/instructor/
admin), material por módulos, entrega de tareas (incluye archivos de audio) y
corrección con nota + feedback. En producción desde el 25/06/2026.

### Stack tecnológico
HTML + CSS + JS vanilla (frontend estático, sin build) · Supabase (Auth + Postgres +
Storage + Edge Functions en Deno) · GitHub Pages (hosting, organización
`tallerdjjuventudrgl`).

### Normas aplicables
- ISO/IEC 25010:2023 — Calidad del producto de software
- ISO/IEC 27001:2022 — Seguridad de la información
- ISO/IEC 27701:2019 — Gestión de privacidad
- ISO 31000:2018 — Gestión de riesgos
- Ley 25.326 (Argentina) — Protección de Datos Personales

## Fuentes usadas para generar este set
- `_docs/CAMPUS-PRD.md` — PRD original del producto (Fase 1 y 2).
- `_docs/INFORME-SEGURIDAD.md` — auditoría de seguridad del 25/06/2026 (aprobada).
- `supabase/*.sql` — esquema real (5 tablas: `profiles`, `assignments`, `submissions`,
  `announcements`, `progress`) y políticas RLS.
- `supabase/edge-functions/*.ts` — Edge Functions de administración de usuarios.
- `CLAUDE.md` de la carpeta del proyecto.

## Historial de versiones del set
| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-07-08 | Jorge Adrián Duarte | Versión inicial, generada a pedido tras confirmar que el proyecto está en producción |
