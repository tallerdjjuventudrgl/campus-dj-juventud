# 🔒 Informe de Seguridad — Campus Virtual Taller de DJ

**Proyecto:** Campus DJ · Casa de la Juventud · Río Gallegos
**Repositorio:** campus-dj-juventud
**Proyecto Supabase:** `tmdlgcrgyxcvkonouzsx` (CURSO DJ CASA DE LA JUVENTUD)
**Fecha de revisión:** 25/06/2026
**Resultado general:** ✅ **APROBADO — sin vulnerabilidades**

---

## 1. Resumen ejecutivo

Se realizó una revisión completa del código publicado (GitHub / Netlify) y de la
configuración de la base de datos Supabase, buscando claves o secretos expuestos
y verificando las protecciones de acceso a datos.

**Conclusión:** El proyecto está correctamente protegido. No se expone ninguna
clave sensible y la base de datos tiene Row Level Security (RLS) activo en todas
las tablas, con políticas bien scopeadas y verificación de rol del lado del servidor.

---

## 2. Revisión de claves / secretos en el código

| Chequeo | Resultado |
|---------|-----------|
| Claves secretas hardcodeadas en el código del navegador | ✅ Ninguna |
| Clave **anon** (publishable) en el HTML | ✅ Presente — es pública por diseño |
| Clave **service_role** (peligrosa) | ✅ Solo en variables de entorno del servidor |
| Archivo de credenciales (`CLAVE PROYECTO EN SUPABASE .txt`) en git | ✅ Nunca subido + ahora en `.gitignore` |
| service_role en el historial de git | ✅ No existe en ningún commit |

### Detalle

- **Clave anon:** aparece en `campus.html` y `publish/campus.html`. Se decodificó
  su payload JWT y confirma `"role":"anon"`. Esta clave **está diseñada para ser
  pública** (Supabase la llama "publishable key"). Su exposición NO es un riesgo
  siempre que RLS esté activo (ver sección 3).

- **Clave service_role:** las dos Edge Functions (`admin-create-user` y
  `admin-delete-user`) la leen con `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`,
  es decir vive en el servidor de Supabase y **nunca** llega al navegador. ✅

- **Archivo de credenciales:** `CLAVE PROYECTO EN SUPABASE .txt` permanece solo
  en la máquina local, protegido por `.gitignore` (patrones `CLAVE*.txt` y
  `*SUPABASE*.txt`). Se verificó que nunca estuvo en el historial de git.

---

## 3. Row Level Security (RLS) y políticas

**RLS activado en las 5 tablas** del esquema `public`:

| Tabla | RLS | Políticas |
|-------|-----|-----------|
| `announcements` | ✅ ON | `ann_read` (SELECT), `ann_write_staff` (ALL) |
| `assignments` | ✅ ON | `assign_read` (SELECT), `assign_write_staff` (ALL) |
| `profiles` | ✅ ON | `profiles_admin_all` (ALL), `profiles_read_self` (SELECT), `profiles_update_own` (UPDATE) |
| `progress` | ✅ ON | `prog_read_own_or_staff` (SELECT), `prog_write_own` (ALL) |
| `submissions` | ✅ ON | `sub_insert_own` (INSERT), `sub_read_own_or_staff` (SELECT), `sub_update_own_or_staff` (UPDATE) |

### Puntos fuertes verificados

1. **Todas las políticas aplican al rol `authenticated`.**
   Un visitante con solo la clave anon (sin iniciar sesión) **no puede leer ni
   modificar nada**. Debe loguearse primero.

2. **Verificación de rol del lado del servidor (no falsificable).**
   La política `profiles_admin_all` usa la función `auth_role()`:

   ```sql
   alter policy "profiles_admin_all"
   on "public"."profiles"
   to authenticated
   using ( (auth_role() = 'admin'::text) )
   with check ( (auth_role() = 'admin'::text) );
   ```

   `auth_role()` lee el rol real del usuario desde la base (según `auth.uid()`),
   por lo que **el rol no se puede falsear desde el navegador**.

3. **Alcance correcto de los datos.**
   - Alumno: ve/edita solo lo propio (`_read_self`, `_update_own`, `_own_or_staff`).
   - Staff (admin/instructor): puede gestionar anuncios, tareas y ver entregas.
   - Solo el admin gestiona todos los perfiles.

---

## 4. Edge Functions (servidor)

| Función | Protección |
|---------|-----------|
| `admin-create-user` | Verifica que quien llama sea admin antes de crear cuentas |
| `admin-delete-user` | Verifica admin + **bloquea eliminar administradores** + bloquea auto-eliminación |

Ambas:
- Verifican el JWT del que llama dentro de la función ("Verify JWT" desactivado a propósito).
- Usan la `service_role` solo desde variables de entorno.
- Devuelven `401` si no hay autenticación (verificado en vivo: respondió correctamente).

---

## 5. Buenas prácticas aplicadas en esta revisión

- Se reforzó `.gitignore` para excluir credenciales, config local del agente y backups:
  ```
  CLAVE*.txt
  *SUPABASE*.txt
  .claude/
  campus-local-backup.html
  *.docx
  ```

---

## 6. Recomendaciones a futuro (opcional)

- Mantener el archivo de credenciales **fuera** del proyecto o, como mínimo,
  asegurarse de que cualquier renombrado siga matcheando los patrones del `.gitignore`.
- Si en el futuro se agregan tablas nuevas, **activar RLS** y crear políticas antes
  de exponerlas (Supabase ofrece "Auto-enable RLS for new tables").
- Rotar la clave anon solo si se sospecha abuso; no es necesario por estar pública.

---

*Informe generado durante la sesión de mantenimiento del 25/06/2026.*
