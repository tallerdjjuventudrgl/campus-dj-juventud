---
tags: [documentacion-iso, mantenimiento, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "1.0"
fecha: 2026-07-08
clasificacion: confidencial
estado: vigente
---

# Manual de Mantenimiento
## Campus Virtual — Taller de DJ

## 1. Rutinas recomendadas

| Frecuencia | Tarea |
|---|---|
| Ante cada tabla/campo nuevo en Supabase | Activar RLS + escribir políticas antes de usarla |
| Mensual (mientras el curso esté activo) | Revisar que `CLAVE PROYECTO EN SUPABASE .txt` sigue fuera del repo y del historial de git |
| Ante cualquier cambio de contenido | Editar solo en `publish/`, correr `deploy.bat`, verificar en producción |
| Ante reporte de un instructor/alumno | Verificar primero en Supabase (tabla afectada) antes de tocar código |

## 2. Puntos de fragilidad conocidos

- **Contenido del curso embebido en `campus.html`:** no hay editor de contenido; cambiar
  un módulo/lección implica editar HTML directamente. Riesgo de error humano al editar
  a mano — revisar visualmente en `publish/` antes de deployar.
- **Dos copias del sitio (`docs/`/`publish/`):** ver 02_SAD y 10_Deployment_Guide — la
  fragilidad real es editar la copia equivocada.
- **Dependencia de Supabase (plan administrado):** sin control sobre disponibilidad o
  cambios de política del proveedor — riesgo aceptado (ver 06_Threat_Model, R-003).

## 3. Actualización de dependencias

Sin dependencias de build (no hay `package.json` ni bundler) — el único "SDK" externo es
el cliente de Supabase-js cargado por CDN en `campus.html`. Si se actualiza esa versión,
reverificar el flujo completo de auth antes de deployar.

## 4. Contacto de mantenimiento

Jorge Adrián Duarte — SISTEMAS DesarrollAR — duartejorgeadrian@gmail.com
