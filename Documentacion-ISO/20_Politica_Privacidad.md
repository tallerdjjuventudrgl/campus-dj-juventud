---
tags: [documentacion-iso, privacidad, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "1.0"
fecha: 2026-07-08
norma: "ISO/IEC 27701:2019 + Ley 25.326 (Argentina)"
clasificacion: confidencial
estado: vigente
---

# Política de Privacidad y Protección de Datos
## Campus Virtual — Taller de DJ

## 1. Datos personales procesados

| Dato | Fuente | Finalidad | Retención |
|---|---|---|---|
| Nombre y email | Registro (Supabase Auth) | Identificación, login | Mientras la cuenta esté activa |
| Rol (alumno/instructor/admin) | Alta de cuenta | Control de acceso | Mientras la cuenta esté activa |
| Progreso de lecciones | Uso del campus | Seguimiento pedagógico | Mientras la cuenta esté activa |
| Contenido de entregas (texto + archivo de audio/PDF/imagen) | Alumno, al entregar tareas | Evaluación del instructor | Ver 21_Politica_Retencion_Datos |
| Notas y feedback | Instructor, al corregir | Evaluación del alumno | Mientras la cuenta esté activa |

## 2. Roles de privacidad

| Rol | Organización | Responsabilidad |
|---|---|---|
| Responsable del tratamiento | Casa de la Juventud (Municipalidad de Río Gallegos) | Define la finalidad del tratamiento (dictado del taller) |
| Encargado del tratamiento | SISTEMAS DesarrollAR | Desarrolla y mantiene el sistema técnico |
| Sub-encargado (infraestructura) | Supabase, GitHub | Almacenamiento de datos y hosting, bajo sus propias políticas de privacidad |
| Operadores | Gisel Duarte, Franco Esquivel (instructores) | Operan el sistema con acceso a datos de alumnos |

## 3. Consideración sobre menores de edad

La Casa de la Juventud puede tener participantes **menores de edad** en el taller. Se
generó la herramienta para cubrir esto: ver **20b_Anexo_Autorizacion_Menores.md** y el
formulario imprimible `Autorizacion_Participacion_y_Tratamiento_de_Datos_Menores.docx`
(esta misma carpeta), que cubre en un solo documento la autorización de asistencia y el
consentimiento para el tratamiento de datos en la plataforma (Ley 25.326, art. 5).

**Esto es una herramienta, no una confirmación de que ya se recolectó el consentimiento
de cada familia** — sigue pendiente que Casa de la Juventud confirme si hay menores en
el taller y distribuya/archive los formularios firmados.

## 4. Derechos de los titulares (Ley 25.326)

| Derecho | Cómo ejercerlo | Plazo de respuesta |
|---|---|---|
| Acceso a sus datos | Solicitud a Casa de la Juventud o a SISTEMAS DesarrollAR | 30 días hábiles |
| Rectificación | Solicitud con documentación | 5 días hábiles |
| Supresión | Solicitud — aplica límites legales/pedagógicos (ej. registro de calificaciones) | 30 días hábiles |
| Oposición | Solicitud fundada | 30 días hábiles |

## 5. Privacidad por diseño — implementación real

| Principio | Implementación en este proyecto |
|---|---|
| Privacidad como configuración por defecto | RLS activo desde el diseño inicial de las tablas, no agregado después |
| Privacidad integrada en el diseño | Rol resuelto server-side (`auth_role()`), sin depender de que el cliente "se comporte bien" |
| Seguridad de extremo a extremo | Auth + RLS + Edge Functions con verificación de JWT |
| Visibilidad y transparencia | Este documento + 06_Threat_Model + 07_Security_Hardening_Guide, disponibles para el cliente |
| Respeto por la privacidad del usuario | Sin visitante anónimo con acceso a datos; cada alumno ve solo lo propio |

## 6. Evaluación de impacto (PIA)

**Resultado:** Riesgo bajo-medio.

**Justificación:** volumen de datos bajo (un curso, cantidad acotada de alumnos),
sensibilidad media (nombre, email, progreso, entregas de audio — no hay datos de salud
ni financieros), sin transferencias a terceros más allá de los proveedores de
infraestructura (Supabase, GitHub), y la eventual participación de menores eleva la
sensibilidad respecto de un curso solo para adultos (ver sección 3).

## 7. Transferencias a terceros

| Destinatario | País | Datos transferidos | Garantías |
|---|---|---|---|
| Supabase (hosting de BD/Auth/Storage) | Según región del proyecto Supabase | Todos los datos del sistema | Políticas de privacidad y seguridad propias de Supabase |
| GitHub Pages | EE.UU. (infraestructura GitHub) | Solo contenido estático público (landing, campus sin datos de usuarios embebidos) | Políticas de privacidad de GitHub |

## 8. Incidentes de privacidad

1. Notificar internamente en máximo 72 horas.
2. Evaluar impacto sobre los titulares (alumnos/instructores).
3. Notificar a la Dirección Nacional de Protección de Datos Personales si el riesgo es alto.
4. Notificar a los titulares afectados (y a sus tutores, si son menores) si aplica.

**Contacto de privacidad:** Jorge Adrián Duarte — duartejorgeadrian@gmail.com
