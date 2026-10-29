# CLAUDE.md — landing page CURSO DJ GISEL DUARTE

Landing + **campus** del **Taller de DJ** (Gisel Duarte y Franco Esquivel), iniciativa de juventud.
Web estática con backend **Supabase** (auth + datos) y Edge Functions para administración de usuarios.

## Stack

- **HTML/CSS/JS estático** (`index.html`, `campus.html`, `GUIA-INSTRUCTORES-*.html`).
- **Turso LibSQL** como base de datos en el edge y API serverless en Vercel.
- **Autenticación y Recuperación:** Arquitectura S.A.R.A. con PIN temporal (4 dígitos, 24 hs) y WhatsApp Web.
- Hosting y despliegue continuo en **Vercel** (`cursodj.desarrollar.online`) vinculado a GitHub `tallerdjjuventudrgl/campus-dj-juventud`.

## Estructura

- `docs/` y `publish/` — **dos copias** del sitio a publicar (mismo set: `index.html`, `campus.html`,
  guía de instructores, assets `JUVENTUD*.png`, `juventud-vector.svg`). `publish/` suele ser lo que se sube.
- `Documentacion-ISO/` — set de 15 documentos ISO (SRS, SAD, threat model, hardening, SOP,
  deployment, privacidad, retención, etc.), generado 2026-07-08. **Nunca poner documentación
  acá dentro de `docs/`** — esa carpeta es la salida pública de GitHub Pages.
- `campus-local-backup.html` — respaldo local del campus.
- `supabase/`:
  - `supabase-schema.sql`, `supabase-schema-2.sql`, `supabase-schema-3-security.sql` — esquema y **RLS/seguridad**.
  - `supabase-nosotros-setup.sql`, `supabase-tools-setup.sql` — setup de secciones.
  - `edge-functions/edge-function-admin-create-user.ts`, `...-delete-user.ts` — admin de usuarios (privilegiado).
- `TALLER DE DJ*.docx` — material/contenido fuente. `deploy.bat` — publicación.

## Cuidados

- ⚠️ `CLAVE PROYECTO EN SUPABASE .txt` contiene **credenciales de Supabase** — no commitear ni filtrar.
  Las Edge Functions de admin usan la **service_role key**: jamás exponerla en el frontend.
- Hay contenido duplicado en `docs/` vs `publish/`: definí cuál es la fuente y mantené la otra sincronizada
  (o eliminá la que no se use) para no editar la copia equivocada.
- Cambios de esquema: aplicar los `.sql` en orden y revisar `supabase-schema-3-security.sql` (políticas RLS).

## Skills

- Para revisar o auditar la UI web (HTML/CSS/JS): usar la skill `web-design-guidelines` (accesibilidad, semántica, UX, buenas prácticas de interfaz). Disparadores: "revisá la UI", "auditá accesibilidad", "revisá el frontend", "chequeá el sitio contra buenas prácticas".
- Al construir o rediseñar la UI (estética, paleta, tipografía, layout): usar la skill `frontend-design`. Disparadores: "diseñá la pantalla", "rehacé el look", "que no parezca plantilla", "mejorá el diseño visual".
