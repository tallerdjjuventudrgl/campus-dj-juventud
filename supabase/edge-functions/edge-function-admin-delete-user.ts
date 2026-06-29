// ============================================================
//  Edge Function: admin-delete-user
//  Solo un ADMIN autenticado puede eliminar cuentas.
//  NO se puede eliminar a otros administradores ni a uno mismo.
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
    if (!prof || prof.role !== "admin") return json({ error: "Solo un administrador puede eliminar usuarios" }, 403);

    // 3) Validar el id objetivo
    const { id } = await req.json();
    const targetId = String(id || "").trim();
    if (!targetId) return json({ error: "Falta el id del usuario" }, 400);
    if (targetId === user.id) return json({ error: "No podés eliminarte a vos mismo" }, 400);

    // 4) Verificar que el objetivo NO sea administrador
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: targetProf } = await admin.from("profiles").select("role").eq("id", targetId).single();
    if (targetProf && targetProf.role === "admin") return json({ error: "No se puede eliminar a un administrador" }, 403);

    // 5) Eliminar el usuario de auth (el profile cae por ON DELETE CASCADE; igual lo borramos por las dudas)
    await admin.from("profiles").delete().eq("id", targetId);
    const { error: dErr } = await admin.auth.admin.deleteUser(targetId);
    if (dErr) return json({ error: dErr.message }, 400);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
