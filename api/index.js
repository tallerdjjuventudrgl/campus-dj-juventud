// ============================================================
//  api/index.js — Router de API Vercel Serverless (Node.js)
//  Taller de DJ · DesarrollAR · Río Gallegos, Santa Cruz, Argentina 🇦🇷
// ============================================================

import crypto from "crypto";
import { query, queryOne, execute, initDatabase } from "./db.js";
import { hashPassword, verifyPassword, createSession, deleteSession, getSessionUser, parseCookies } from "./auth.js";

// Helper para parsear JSON en Node http serverless
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length) {
    try { return JSON.parse(req.body); } catch (_) {}
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Powered-By": "DesarrollAR - Rio Gallegos, Santa Cruz",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  // CORS & Preflight
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Parse URL y ruta
  const parsedUrl = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  let pathname = parsedUrl.pathname.replace(/\/+$/, "") || "/";
  if (!pathname.startsWith("/api")) {
    pathname = "/api" + pathname;
  }
  const method = req.method.toUpperCase();

  try {
    // ----------------------------------------------------
    // SALUD / ESTADO
    // ----------------------------------------------------
    if (pathname === "/api/health" || pathname === "/api") {
      return sendJson(res, 200, {
        ok: true,
        sistema: "Campus Virtual · Taller de DJ",
        version: "2.0.0-turso-scaler",
        hosting: "Vercel Pro",
        database: "Turso Scaler (libSQL)",
        timestamp: new Date().toISOString(),
        marca: "SISTEMAS DesarrollAR",
        identidad: "Hecho con orgullo en Río Gallegos, Santa Cruz, Argentina 🇦🇷",
      });
    }

    // ----------------------------------------------------
    // INICIALIZACIÓN / MIGRACIÓN DE TABLAS
    // ----------------------------------------------------
    if (pathname === "/api/setup/init" && method === "POST") {
      await initDatabase();
      return sendJson(res, 200, { ok: true, message: "Tablas y datos iniciales configurados con éxito." });
    }

    // ----------------------------------------------------
    // AUTENTICACIÓN
    // ----------------------------------------------------

    // Primer admin inicial si no existe ninguno
    if (pathname === "/api/auth/setup-admin" && method === "POST") {
      await initDatabase();
      const adminCount = await queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      const totalCount = Number(adminCount?.count || 0);
      if (totalCount > 0) {
        return sendJson(res, 400, { error: "Ya existe un usuario administrador en el sistema." });
      }
      const body = await readJson(req);
      const username = String(body.username || "admin").trim().toLowerCase().replace(/\s+/g, "");
      const name = String(body.name || "Administrador").trim();
      const password = String(body.password || "");

      if (!username || !password || password.length < 6) {
        return sendJson(res, 400, { error: "La contraseña debe tener al menos 6 caracteres." });
      }

      const id = "usr-" + crypto.randomUUID();
      const hash = hashPassword(password);
      await execute(
        "INSERT INTO users (id, username, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, 'admin')",
        [id, username, name, `${username}@casadelajuventud.gob`, hash]
      );

      const { token } = await createSession(id);
      return sendJson(res, 200, {
        ok: true,
        message: "Administrador inicial creado correctamente.",
        token,
        user: { id, username, name, email: `${username}@casadelajuventud.gob`, role: "admin" }
      }, {
        "Set-Cookie": `cursodj_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure`
      });
    }

    // Login
    if (pathname === "/api/auth/login" && method === "POST") {
      const body = await readJson(req);
      const username = String(body.username || "").trim().toLowerCase().replace(/\s+/g, "");
      const password = String(body.password || "");

      if (!username || !password) {
        return sendJson(res, 400, { error: "Ingresá usuario y contraseña." });
      }

      // Asegurar que las tablas existan
      try {
        await initDatabase();
      } catch (_) {}

      const user = await queryOne("SELECT * FROM users WHERE lower(username) = ?", [username]);
      if (!user) {
        return sendJson(res, 401, { error: "Usuario o contraseña incorrectos." });
      }

      const valid = verifyPassword(password, user.password_hash);
      if (!valid) {
        return sendJson(res, 401, { error: "Usuario o contraseña incorrectos." });
      }

      const { token, expiresAt } = await createSession(user.id);
      const profile = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      };

      return sendJson(res, 200, {
        ok: true,
        token,
        expiresAt,
        user: profile,
        profile,
      }, {
        "Set-Cookie": `cursodj_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure`
      });
    }

    // Sesión activa (me)
    if (pathname === "/api/auth/me" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) {
        return sendJson(res, 401, { error: "No autenticado" });
      }
      return sendJson(res, 200, {
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        },
        profile: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        }
      });
    }

    // Logout
    if (pathname === "/api/auth/logout" && method === "POST") {
      const cookies = parseCookies(req.headers["cookie"]);
      const token = cookies["cursodj_session"];
      if (token) {
        await deleteSession(token);
      }
      return sendJson(res, 200, { ok: true }, {
        "Set-Cookie": "cursodj_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure"
      });
    }

    // ----------------------------------------------------
    // INSTRUCTORES (Público y Staff)
    // ----------------------------------------------------
    if (pathname === "/api/instructors" && method === "GET") {
      const rows = await query("SELECT * FROM instructors WHERE visible = 1 ORDER BY sort ASC, updated_at DESC");
      return sendJson(res, 200, rows);
    }

    if (pathname === "/api/instructors" && (method === "PUT" || method === "POST")) {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Acceso denegado." });
      }

      const body = await readJson(req);
      const name = String(body.name || user.name).trim();
      const title = String(body.title || "").trim();
      const bio = String(body.bio || "").trim();
      const photo_url = String(body.photo_url || "").trim();
      const instagram = String(body.instagram || "").trim();
      const spotify = String(body.spotify || "").trim();
      const soundcloud = String(body.soundcloud || "").trim();
      const youtube = String(body.youtube || "").trim();
      const tiktok = String(body.tiktok || "").trim();
      const website = String(body.website || "").trim();
      const whatsapp = String(body.whatsapp || "").trim();
      const targetUserId = (user.role === "admin" && body.user_id) ? body.user_id : user.id;

      const existing = await queryOne("SELECT id FROM instructors WHERE user_id = ?", [targetUserId]);
      if (existing) {
        await execute(
          `UPDATE instructors SET name=?, title=?, bio=?, photo_url=?, instagram=?, spotify=?, soundcloud=?,
           youtube=?, tiktok=?, website=?, whatsapp=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          [name, title, bio, photo_url, instagram, spotify, soundcloud, youtube, tiktok, website, whatsapp, existing.id]
        );
      } else {
        const id = "inst-" + crypto.randomUUID();
        await execute(
          `INSERT INTO instructors (id, user_id, name, title, bio, photo_url, instagram, spotify, soundcloud, youtube, tiktok, website, whatsapp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, targetUserId, name, title, bio, photo_url, instagram, spotify, soundcloud, youtube, tiktok, website, whatsapp]
        );
      }
      const updated = await queryOne("SELECT * FROM instructors WHERE user_id = ?", [targetUserId]);
      return sendJson(res, 200, { ok: true, data: updated });
    }

    // ----------------------------------------------------
    // ASIGNACIONES / TAREAS
    // ----------------------------------------------------
    if (pathname === "/api/assignments" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });
      const rows = await query("SELECT * FROM assignments ORDER BY module_id ASC, created_at ASC");
      return sendJson(res, 200, rows);
    }

    if (pathname === "/api/assignments" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Solo instructores y administradores pueden crear tareas." });
      }
      const body = await readJson(req);
      const id = "assign-" + crypto.randomUUID();
      const moduleId = Number(body.module_id) || 1;
      const title = String(body.title || "").trim();
      const instructions = String(body.instructions || "").trim();
      const dueDate = body.due_date || null;

      if (!title) return sendJson(res, 400, { error: "El título es obligatorio." });

      await execute(
        "INSERT INTO assignments (id, module_id, title, instructions, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        [id, moduleId, title, instructions, dueDate, user.name]
      );
      const created = await queryOne("SELECT * FROM assignments WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true, data: created });
    }

    // ----------------------------------------------------
    // SUBMISSIONS / ENTREGAS
    // ----------------------------------------------------
    if (pathname === "/api/submissions" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      let rows;
      if (user.role === "student") {
        rows = await query(
          "SELECT s.*, a.title as assignment_title, a.module_id FROM submissions s JOIN assignments a ON s.assignment_id = a.id WHERE s.student_id = ? ORDER BY s.submitted_at DESC",
          [user.id]
        );
      } else {
        rows = await query(
          "SELECT s.*, a.title as assignment_title, a.module_id, u.name as student_name, u.username as student_username FROM submissions s JOIN assignments a ON s.assignment_id = a.id JOIN users u ON s.student_id = u.id ORDER BY s.submitted_at DESC"
        );
      }
      return sendJson(res, 200, rows);
    }

    if (pathname === "/api/submissions" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      const body = await readJson(req);
      const assignmentId = String(body.assignment_id || "");
      const submissionBody = String(body.body || "");
      const filePath = body.file_path || body.file_url || null;
      const fileName = body.file_name || null;
      const fileSize = Number(body.file_size) || null;
      const fileType = body.file_type || null;

      if (!assignmentId) return sendJson(res, 400, { error: "Falta el ID de la tarea." });

      const id = "sub-" + crypto.randomUUID();
      await execute(
        `INSERT INTO submissions (id, assignment_id, student_id, body, file_path, file_name, file_size, file_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
         ON CONFLICT (assignment_id, student_id) DO UPDATE SET
           body = excluded.body,
           file_path = excluded.file_path,
           file_name = excluded.file_name,
           file_size = excluded.file_size,
           file_type = excluded.file_type,
           submitted_at = CURRENT_TIMESTAMP`,
        [id, assignmentId, user.id, submissionBody, filePath, fileName, fileSize, fileType]
      );

      const saved = await queryOne("SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?", [assignmentId, user.id]);
      return sendJson(res, 200, { ok: true, data: saved });
    }

    if (pathname === "/api/submissions/grade" && (method === "PUT" || method === "POST")) {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Solo instructores y administradores pueden corregir." });
      }

      const body = await readJson(req);
      const id = String(body.id || body.submission_id || "");
      const grade = body.grade !== undefined && body.grade !== null ? parseFloat(body.grade) : null;
      const feedback = String(body.feedback || "");

      if (!id) return sendJson(res, 400, { error: "Falta el ID de la entrega." });

      await execute(
        "UPDATE submissions SET grade = ?, feedback = ?, status = 'graded', graded_at = CURRENT_TIMESTAMP, graded_by = ? WHERE id = ?",
        [grade, feedback, user.name, id]
      );
      const updated = await queryOne("SELECT * FROM submissions WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true, data: updated });
    }

    // ----------------------------------------------------
    // ANUNCIOS
    // ----------------------------------------------------
    if (pathname === "/api/announcements" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });
      const rows = await query("SELECT * FROM announcements ORDER BY created_at DESC");
      return sendJson(res, 200, rows);
    }

    if (pathname === "/api/announcements" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Acceso denegado." });
      }

      const body = await readJson(req);
      const title = String(body.title || "").trim();
      const annBody = String(body.body || "").trim();
      if (!title) return sendJson(res, 400, { error: "El título es obligatorio." });

      const id = "ann-" + crypto.randomUUID();
      await execute(
        "INSERT INTO announcements (id, course_id, title, body, author) VALUES (?, 'dj', ?, ?, ?)",
        [id, title, annBody, user.name]
      );
      const created = await queryOne("SELECT * FROM announcements WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true, data: created });
    }

    if (pathname === "/api/announcements" && method === "DELETE") {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Acceso denegado." });
      }
      const id = parsedUrl.searchParams.get("id");
      if (!id) return sendJson(res, 400, { error: "Falta el ID del anuncio." });
      await execute("DELETE FROM announcements WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true });
    }

    // ----------------------------------------------------
    // PROGRESO DE LECCIONES
    // ----------------------------------------------------
    if (pathname === "/api/progress" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      if (user.role === "student") {
        const rows = await query("SELECT lesson_id, completed_at FROM progress WHERE user_id = ?", [user.id]);
        return sendJson(res, 200, rows);
      } else {
        // Staff ve progreso de todos los estudiantes
        const [progressRows, students] = await Promise.all([
          query("SELECT user_id, lesson_id, completed_at FROM progress"),
          query("SELECT id, name, username, email FROM users WHERE role = 'student' ORDER BY name ASC")
        ]);
        return sendJson(res, 200, { progress: progressRows, students });
      }
    }

    if (pathname === "/api/progress/toggle" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      const body = await readJson(req);
      const lessonId = String(body.lesson_id || "");
      if (!lessonId) return sendJson(res, 400, { error: "Falta el ID de la lección." });

      const existing = await queryOne("SELECT 1 FROM progress WHERE user_id = ? AND lesson_id = ?", [user.id, lessonId]);
      if (existing) {
        await execute("DELETE FROM progress WHERE user_id = ? AND lesson_id = ?", [user.id, lessonId]);
        return sendJson(res, 200, { ok: true, completed: false, lesson_id: lessonId });
      } else {
        await execute("INSERT INTO progress (user_id, lesson_id) VALUES (?, ?)", [user.id, lessonId]);
        return sendJson(res, 200, { ok: true, completed: true, lesson_id: lessonId });
      }
    }

    // ----------------------------------------------------
    // HERRAMIENTAS Y RECURSOS
    // ----------------------------------------------------
    if (pathname === "/api/tools" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });
      const rows = await query("SELECT * FROM tools ORDER BY created_at DESC");
      return sendJson(res, 200, rows);
    }

    if (pathname === "/api/tools" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Acceso denegado." });
      }

      const body = await readJson(req);
      const category = String(body.category || "software");
      const title = String(body.title || "").trim();
      const description = String(body.description || "").trim();
      const toolUrl = body.url || null;
      const filePath = body.file_path || null;
      const fileName = body.file_name || null;
      const fileSize = Number(body.file_size) || null;
      const fileType = body.file_type || null;

      if (!title) return sendJson(res, 400, { error: "El título es obligatorio." });

      const id = "tool-" + crypto.randomUUID();
      await execute(
        `INSERT INTO tools (id, category, title, description, url, file_path, file_name, file_size, file_type, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, category, title, description, toolUrl, filePath, fileName, fileSize, fileType, user.name]
      );
      const created = await queryOne("SELECT * FROM tools WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true, data: created });
    }

    if (pathname === "/api/tools" && method === "DELETE") {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Acceso denegado." });
      }
      const id = parsedUrl.searchParams.get("id");
      if (!id) return sendJson(res, 400, { error: "Falta el ID del recurso." });
      await execute("DELETE FROM tools WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/tools/download" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      const body = await readJson(req);
      const toolId = body.tool_id;
      const toolTitle = body.tool_title || "";
      const id = "dl-" + crypto.randomUUID();

      await execute(
        "INSERT INTO tool_downloads (id, tool_id, tool_title, user_id, user_name) VALUES (?, ?, ?, ?, ?)",
        [id, toolId, toolTitle, user.id, user.name]
      );
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/tools/downloads" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Acceso denegado." });
      }
      const rows = await query("SELECT * FROM tool_downloads ORDER BY downloaded_at DESC LIMIT 500");
      return sendJson(res, 200, rows);
    }

    // ----------------------------------------------------
    // ADMINISTRACIÓN DE USUARIOS (Reemplazo de Edge Functions)
    // ----------------------------------------------------
    if (pathname === "/api/admin/users" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user || user.role !== "admin") {
        return sendJson(res, 403, { error: "Solo administradores pueden gestionar usuarios." });
      }
      const rows = await query("SELECT id, username, name, email, role, created_at FROM users ORDER BY created_at ASC");
      return sendJson(res, 200, rows);
    }

    if (pathname === "/api/admin/create-user" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user || user.role !== "admin") {
        return sendJson(res, 403, { error: "Solo administradores pueden crear usuarios." });
      }

      const body = await readJson(req);
      const username = String(body.username || "").trim().toLowerCase().replace(/\s+/g, "");
      const name = String(body.name || "").trim();
      const password = String(body.password || "");
      const role = ["student", "instructor", "admin"].includes(body.role) ? body.role : "student";

      if (!username || !name) {
        return sendJson(res, 400, { error: "Faltan usuario o nombre." });
      }
      if (password.length < 6) {
        return sendJson(res, 400, { error: "La contraseña debe tener al menos 6 caracteres." });
      }

      const existing = await queryOne("SELECT 1 FROM users WHERE lower(username) = ?", [username]);
      if (existing) {
        return sendJson(res, 400, { error: "Ese usuario ya existe." });
      }

      const id = "usr-" + crypto.randomUUID();
      const email = `${username}@casadelajuventud.gob`;
      const hash = hashPassword(password);

      await execute(
        "INSERT INTO users (id, username, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)",
        [id, username, name, email, hash, role]
      );

      return sendJson(res, 200, { ok: true, id, username, name, email, role });
    }

    if (pathname === "/api/admin/change-role" && method === "PUT") {
      const user = await getSessionUser(req);
      if (!user || user.role !== "admin") {
        return sendJson(res, 403, { error: "Solo administradores pueden modificar roles." });
      }

      const body = await readJson(req);
      const targetId = String(body.id || "");
      const newRole = body.role;

      if (!targetId || !["student", "instructor", "admin"].includes(newRole)) {
        return sendJson(res, 400, { error: "Datos inválidos." });
      }

      await execute("UPDATE users SET role = ? WHERE id = ?", [newRole, targetId]);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/admin/delete-user" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user || user.role !== "admin") {
        return sendJson(res, 403, { error: "Solo administradores pueden eliminar usuarios." });
      }

      const body = await readJson(req);
      const targetId = String(body.id || "");
      if (!targetId) return sendJson(res, 400, { error: "Falta el ID del usuario." });

      if (targetId === user.id) {
        return sendJson(res, 400, { error: "No podés eliminarte a vos mismo." });
      }

      const targetUser = await queryOne("SELECT role FROM users WHERE id = ?", [targetId]);
      if (targetUser && targetUser.role === "admin") {
        return sendJson(res, 403, { error: "No se puede eliminar a otro administrador." });
      }

      await execute("DELETE FROM users WHERE id = ?", [targetId]);
      return sendJson(res, 200, { ok: true });
    }

    // Ruta no encontrada
    return sendJson(res, 404, { error: "Endpoint no encontrado.", path: pathname });
  } catch (err) {
    console.error("API Error:", err);
    return sendJson(res, 500, {
      error: "Error interno del servidor.",
      message: err.message || String(err)
    });
  }
}
