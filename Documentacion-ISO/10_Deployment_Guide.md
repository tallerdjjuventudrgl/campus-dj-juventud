---
tags: [documentacion-iso, deployment, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "1.0"
fecha: 2026-07-08
clasificacion: confidencial
estado: vigente
---

# Guía de Despliegue
## Campus Virtual — Taller de DJ

## 1. Arquitectura de despliegue

- **Hosting:** GitHub Pages, organización `tallerdjjuventudrgl`, repo `campus-dj-juventud`.
- **Fuente servida por GitHub Pages:** carpeta `docs/` de la rama principal.
- **Backend:** Supabase administrado — sin despliegue propio, sin servidor que mantener.

## 2. ⚠️ Regla crítica — `publish/` vs `docs/`

`docs/` y `publish/` contienen el mismo set de archivos (`index.html`, `campus.html`,
guía de instructores, assets). **`publish/` es la fuente editable. `docs/` es la salida
generada por `deploy.bat`** y es lo que GitHub Pages sirve públicamente.

- ✅ Editar siempre en `publish/`.
- ❌ Nunca editar directo en `docs/` — se pierde en el próximo `deploy.bat`.
- ❌ Nunca poner documentación interna, credenciales o notas de trabajo en `docs/` —
  es contenido público servido por GitHub Pages. Por eso esta documentación ISO vive en
  `Documentacion-ISO/`, fuera de `docs/` y de `publish/`.

## 3. Proceso de deploy

```
Editar archivos en publish/
        ↓
Ejecutar deploy.bat
        ↓
deploy.bat copia publish/ → docs/
        ↓
deploy.bat hace commit + push a GitHub
        ↓
GitHub Pages sirve docs/ automáticamente
```

## 4. Verificación post-deploy

1. Abrir https://tallerdjjuventudrgl.github.io/campus-dj-juventud/ y confirmar que el
   cambio se ve reflejado (puede haber demora de cache de GitHub Pages, reintentar en
   unos minutos si no se ve).
2. Probar el flujo afectado con una cuenta real (o demo) del rol correspondiente.

## 5. Configuración de Supabase (no requiere deploy)

Los cambios de esquema SQL (`supabase/*.sql`) se aplican manualmente desde el SQL
Editor de Supabase, en orden, y **no** están automatizados por `deploy.bat`. Revisar
`supabase-schema-3-security.sql` (políticas RLS) con especial cuidado antes de aplicar
cambios de esquema.

## 6. Rollback

Al ser GitHub Pages sobre git, un rollback es un `git revert`/`git reset` del commit de
`docs/` seguido de push — no hay mecanismo de rollback específico de la app.
