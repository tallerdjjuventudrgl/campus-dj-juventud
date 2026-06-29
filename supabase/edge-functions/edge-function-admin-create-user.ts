// ============================================================
//  Edge Function: admin-create-user
//  Solo un ADMIN autenticado puede crear cuentas.
//  La service_role key vive acá (servidor), nunca en el navegador.
//  Deploy: Supabase → Edge Functions → Create function → pegar esto.
//  IMPORTANTE: desactivar "Verify JWT" (lo verificamos adentro).
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const DOMAIN = "@casadelajuventud.gob";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) Identificar a quien llama (por su token)
    const authHeader = req.headers.get("Authorization") || "";
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await caller.auth.getUser();
    if (uErr || !user) return json({ error: "No autenticado" }, 401);

    // 2) Verificar que sea ADMIN
    const { data: prof } = await caller.from("profiles").select("role").eq("id", user.id).single();
    if (!prof || prof.role !== "admin") return json({ error: "Solo un administrador puede crear usuarios" }, 403);

    // 3) Validar datos
    const { username, name, password, role } = await req.json();
    const u = String(username || "").trim().toLowerCase().replace(/\s+/g, "");
    if (!u || !String(name || "").trim()) return json({ error: "Faltan usuario o nombre" }, 400);
    if (String(password || "").length < 6) return json({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);
    const finalRole = ["student", "instructor", "admin"].includes(role) ? role : "student";

    // 4) Crear el usuario con la service_role (bypassa el registro deshabilitado)
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: u + DOMAIN,
      password,
      email_confirm: true,
      user_metadata: { name: String(name).trim(), username: u },
    });
    if (cErr) return json({ error: cErr.message.includes("already") ? "Ese usuario ya existe" : cErr.message }, 400);

    // 5) Asignar el rol pedido (el trigger lo creó como 'student')
    if (finalRole !== "student") {
      await admin.from("profiles").update({ role: finalRole }).eq("id", created.user.id);
    }
    return json({ ok: true, id: created.user.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
