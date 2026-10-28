---
tags: [documentacion-iso, threat-model, seguridad, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "1.0"
fecha: 2026-07-08
norma: "ISO/IEC 27001:2022 + ISO 31000:2018 + STRIDE"
clasificacion: confidencial
estado: vigente
origen: "_docs/INFORME-SEGURIDAD.md (auditoría 2026-06-25, aprobada sin hallazgos)"
---

# Threat Model — Análisis de Amenazas y Seguridad
## Campus Virtual — Taller de DJ

**Documento:** TM-CAMPUSDJ-v1.0
**Clasificación:** Confidencial — SISTEMAS DesarrollAR

---

## 1. Resumen de seguridad

**Nivel de riesgo general:** Bajo (tras auditoría del 25/06/2026, aprobada sin
vulnerabilidades).
**Superficie de ataque:** frontend estático público + API de Supabase (Auth/DB/Storage)
+ 2 Edge Functions.
**Activos críticos:** credenciales de alumnos/instructores, entregas de tareas
(archivos de audio con posible contenido personal), clave `service_role` de Supabase.

## 2. Activos del sistema

| Activo | Tipo | Criticidad | Propietario |
|---|---|---|---|
| Credenciales de usuarios (Supabase Auth) | Dato | Alta | Supabase (gestionado) |
| Tabla `profiles` (nombre, email, rol) | Dato | Media-Alta | Proyecto Supabase |
| Entregas de alumnos (`submissions` + Storage) | Dato | Media | Proyecto Supabase |
| Clave `service_role` | Credencial | Crítica | Solo en env vars de Edge Functions |
| Clave `anon` | Credencial | Baja (pública por diseño) | Embebida en `campus.html` |

## 3. Actores y confianza

| Actor | Tipo | Nivel de confianza | Acceso |
|---|---|---|---|
| Visitante anónimo | Externo | Ninguno | Solo clave `anon`; RLS bloquea toda lectura/escritura sin sesión |
| Alumno autenticado | Interno | Bajo/Medio | Solo sus propios datos (`_read_self`, `_own_or_staff`) |
| Instructor autenticado | Interno | Medio | Anuncios/tareas del curso, entregas de todos, roster |
| Admin | Interno | Alto | Todo lo anterior + alta/baja de usuarios vía Edge Functions |

## 4. Análisis STRIDE

| Amenaza | Categoría | Impacto | Probabilidad | Control |
|---|---|---|---|---|
| Falsear el rol propio para acceder a datos de otros | Elevation of Privilege | Alto | Baja | `auth_role()` server-side, no falseable desde el navegador |
| Leer datos sin autenticarse | Information Disclosure | Alto | Baja | RLS activo en las 5 tablas, todas las políticas exigen `authenticated` |
| Ejecutar alta/baja de usuarios sin ser admin | Elevation of Privilege | Alto | Baja | Edge Functions verifican rol admin + JWT antes de ejecutar |
| Filtración de `service_role` en el cliente | Information Disclosure | Crítico | Baja | Vive solo en env vars de Edge Functions, nunca en el navegador (verificado) |
| Filtración de `CLAVE PROYECTO EN SUPABASE .txt` por git | Information Disclosure | Alto | Baja | `.gitignore` con patrones `CLAVE*.txt`/`*SUPABASE*.txt`; verificado que nunca estuvo en el historial |
| Eliminación accidental/maliciosa de una cuenta admin | Tampering | Medio | Baja | `admin-delete-user` bloquea eliminar admins y auto-eliminación |

## 5. Registro de riesgos (ISO 31000:2018)

| ID | Categoría | Riesgo | Prob | Impacto | Nivel | Tratamiento |
|---|---|---|---|---|---|---|
| R-001 | Datos | Exposición de entregas de alumnos por política RLS mal configurada | 1 | 3 | 3 | Mitigado — RLS auditado y aprobado |
| R-002 | Credenciales | Filtración de `service_role` | 1 | 3 | 3 | Mitigado — solo en env vars de servidor |
| R-003 | Disponibilidad | Caída del proyecto Supabase (plan gratuito/administrado) | 2 | 2 | 4 | Aceptado — sin SLA propio, dependencia de terceros |
| R-004 | Operación | Editar `docs/` en vez de `publish/` y perder cambios en el próximo deploy | 2 | 1 | 2 | Mitigado — documentado en 02_SAD y 10_Deployment_Guide |

## 6. Vectores de ataque principales

### 6.1 Bypass de rol desde el cliente
- **Descripción:** un usuario intenta modificar su rol o inyectar un rol distinto en las
  peticiones a la API para acceder a funciones de instructor/admin.
- **Impacto potencial:** acceso no autorizado a calificaciones, anuncios y roster.
- **Control implementado:** el rol se resuelve siempre server-side vía `auth_role()`
  (lee `profiles.role` según `auth.uid()`), no depende de nada enviado por el cliente.

### 6.2 Acceso anónimo a datos
- **Descripción:** un visitante sin cuenta intenta leer datos usando solo la clave `anon`.
- **Impacto potencial:** exposición de datos de alumnos/tareas sin autenticación.
- **Control implementado:** las 5 tablas tienen RLS activo con políticas que exigen rol
  `authenticated` — verificado que un visitante sin sesión no puede leer ni escribir nada.

## 7. Controles de seguridad implementados

| Control | Tipo | Descripción | Efectividad |
|---|---|---|---|
| RLS en 5 tablas | Preventivo | Postgres Row Level Security con políticas por rol | Alta |
| `auth_role()` server-side | Preventivo | Resolución de rol no falsificable desde el cliente | Alta |
| Edge Functions con verificación de JWT interna | Preventivo | Rechazan sin autenticación (401 verificado) | Alta |
| `.gitignore` reforzado | Preventivo | Excluye credenciales, backups y config local | Alta |
| Bloqueo de auto-eliminación/eliminación de admins | Preventivo | En `admin-delete-user` | Media-Alta |

## 8. Riesgos residuales aceptados

| Riesgo | Justificación de aceptación | Responsable |
|---|---|---|
| Disponibilidad depende del plan gratuito de Supabase y de GitHub Pages | Proyecto de bajo volumen (un curso, una organización), sin presupuesto para infraestructura propia | Jorge Adrián Duarte |
| Sin tests automatizados de regresión | Frontend estático simple; verificación manual documentada en 03_STP | Jorge Adrián Duarte |

## 9. Plan de revisión

- **Próxima revisión:** ante cualquier tabla nueva en Supabase, activar RLS y definir
  políticas **antes** de exponerla (recomendación ya registrada en el informe de
  seguridad original).
- **Disparadores de revisión anticipada:** nueva funcionalidad (Fase 3), incidente de
  seguridad, cambio de infraestructura (ej. migrar de GitHub Pages).
