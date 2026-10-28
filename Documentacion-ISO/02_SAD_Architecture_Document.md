---
tags: [documentacion-iso, sad, arquitectura, campus-dj]
proyecto: Campus Virtual — Taller de DJ
cliente: Casa de la Juventud (Municipalidad de Río Gallegos)
version: "1.0"
fecha: 2026-07-08
norma: "ISO/IEC/IEEE 42010:2011"
clasificacion: confidencial
estado: vigente
---

# SAD — Documento de Arquitectura de Software
## Campus Virtual — Taller de DJ

## 1. Vista general

Arquitectura **JAMstack** simple: frontend estático sin build (HTML/CSS/JS vanilla) +
backend administrado (Supabase) + hosting estático (GitHub Pages). Sin servidor propio
que mantener, sin proceso de build/CI.

```
Navegador (campus.html)
   │  fetch/SDK Supabase-js
   ▼
Supabase (proyecto "CURSO DJ CASA DE LA JUVENTUD", ref tmdlgcrgyxcvkonouzsx)
   ├── Auth          — login, sesión, emisión de JWT
   ├── Postgres      — profiles / assignments / submissions / announcements / progress (RLS)
   ├── Storage       — archivos de entrega (audio/PDF/imagen)
   └── Edge Functions (Deno) — admin-create-user, admin-delete-user (service_role)
```

## 2. Componentes

| Componente | Archivo(s) | Rol |
|---|---|---|
| Landing pública | `publish/index.html` | Presentación del taller, sin login |
| Campus (app) | `publish/campus.html` | SPA con router por rol, todo el flujo LMS |
| Guía instructores | `publish/GUIA-INSTRUCTORES-google-drive.html` | Cómo cargar material vía Google Drive |
| Esquema BD | `supabase/supabase-schema*.sql` | Tablas + RLS + funciones (`handle_new_user`, `auth_role`) |
| Edge Functions | `supabase/edge-functions/*.ts` | Operaciones privilegiadas (alta/baja de usuarios) |

## 3. Dos copias del sitio — `docs/` vs `publish/`

`docs/` y `publish/` contienen el mismo set de archivos publicables. **`publish/` es la
fuente editable; `docs/` es la salida que genera `deploy.bat`** para GitHub Pages (ver
10_Deployment_Guide). **Nunca editar directo en `docs/`** — se pisa en el próximo deploy.
Esta es también la razón por la que la documentación ISO vive en su propia carpeta
(`Documentacion-ISO/`) y no dentro de `docs/`: esa carpeta es el artefacto de build del
sitio público, no un lugar para documentación interna.

## 4. Autenticación y autorización

- **Autenticación:** Supabase Auth (email + contraseña), JWT de sesión.
- **Autorización:** por rol (`profiles.role`), aplicada en dos capas:
  1. **Cliente:** la UI oculta/muestra vistas según el rol (UX, no seguridad real).
  2. **Servidor (real):** políticas RLS de Postgres + función `auth_role()` — el
     rol se lee de la tabla `profiles` según `auth.uid()`, no se puede falsear desde
     el navegador (ver 06_Threat_Model).

## 5. Manejo de archivos

Las entregas de los alumnos (sets de audio, PDFs, imágenes) se guardan en Supabase
Storage; `submissions.file_path` referencia la ubicación. El acceso a los archivos
hereda las mismas reglas de rol que la fila de `submissions` correspondiente.

## 6. Despliegue

Ver 10_Deployment_Guide — resumen: `deploy.bat` copia `publish/` → `docs/` y hace push a
GitHub, que sirve `docs/` como GitHub Pages bajo la organización `tallerdjjuventudrgl`.

## 7. Decisiones de arquitectura relevantes

- **Sin backend propio:** decisión deliberada para minimizar mantenimiento — Supabase
  administra Auth/DB/Storage/Functions, SISTEMAS DesarrollAR no opera infraestructura.
- **Frontend sin build:** HTML/CSS/JS directos, sin bundler ni framework — reduce
  superficie de fallos de build y permite editar y previsualizar con doble clic.
- **Edge Functions solo para lo privilegiado:** todo lo que requiere `service_role`
  (crear/eliminar usuarios) vive en Edge Functions, nunca en el cliente.
