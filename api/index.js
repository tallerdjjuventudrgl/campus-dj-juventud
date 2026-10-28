// ============================================================
//  api/index.js — Router de API Vercel Serverless v3.0 (Node.js)
//  Taller de DJ · DesarrollAR · Río Gallegos, Santa Cruz, Argentina 🇦🇷
// ============================================================

import crypto from "crypto";
import { query, queryOne, execute, initDatabase } from "./db.js";
import { hashPassword, verifyPassword, createSession, deleteSession, getSessionUser, parseCookies } from "./auth.js";
import { isR2Configured, generateR2PresignedPutUrl } from "./r2.js";

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

function generateShortCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

export default async function handler(req, res) {
  // CORS & Preflight
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Range");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

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
        version: "3.0.0-lms-universitario",
        hosting: "Vercel Pro",
        database: "Turso Scaler (libSQL)",
        storage: isR2Configured() ? "Cloudflare R2 + Turso Edge" : "Turso Edge Storage (R2 Ready)",
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
    // VERIFICACIÓN PÚBLICA DE CERTIFICADOS QR (Sin Auth)
    // ----------------------------------------------------
    if (pathname === "/api/verify-certificate" && method === "GET") {
      const code = String(parsedUrl.searchParams.get("code") || "").trim().toUpperCase();
      if (!code) {
        return sendJson(res, 400, { valid: false, error: "Ingresá un código de certificado para verificar." });
      }
      const cert = await queryOne(
        "SELECT * FROM certificates WHERE upper(code) = ?",
        [code]
      );
      if (!cert || cert.status !== "valid") {
        return sendJson(res, 404, {
          valid: false,
          code,
          error: cert ? "Este certificado ha sido revocado." : "No se encontró ningún certificado con ese código."
        });
      }
      return sendJson(res, 200, {
        valid: true,
        certificate: cert,
        institucion: "Municipalidad de Río Gallegos · Casa de la Juventud",
        secretaria: "Secretaría de Niñez, Adolescencia y Familia",
        desarrollador: "SISTEMAS DesarrollAR · Jorge Adrián Duarte",
        identidad: "Hecho con orgullo en Río Gallegos, Santa Cruz, Argentina 🇦🇷"
      });
    }

    // ----------------------------------------------------
    // STREAMING PÚBLICO DE ARCHIVOS / SETS DE AUDIO
    // ----------------------------------------------------
    if (pathname === "/api/storage/stream" && method === "GET") {
      const fileId = parsedUrl.searchParams.get("id");
      if (!fileId) return sendJson(res, 400, { error: "Falta el ID del archivo." });

      const meta = await queryOne("SELECT * FROM media_files WHERE id = ?", [fileId]);
      if (!meta) return sendJson(res, 404, { error: "Archivo no encontrado." });

      if (meta.storage_provider === "cloudflare_r2" && meta.external_url) {
        res.writeHead(302, { Location: meta.external_url });
        res.end();
        return;
      }

      const chunks = await query(
        "SELECT data FROM media_chunks WHERE file_id = ? ORDER BY chunk_index ASC",
        [fileId]
      );
      if (!chunks.length) return sendJson(res, 404, { error: "Contenido del archivo no encontrado." });

      const buffers = chunks.map((c) => Buffer.from(c.data, "base64"));
      const fullBuffer = Buffer.concat(buffers);
      const total = fullBuffer.length;
      const mimeType = meta.mime_type || "application/octet-stream";
      const safeName = encodeURIComponent(meta.filename || "archivo");

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
        const chunksize = end - start + 1;
        const sliced = fullBuffer.subarray(start, end + 1);
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        res.end(sliced);
        return;
      }

      res.writeHead(200, {
        "Content-Length": total,
        "Content-Type": mimeType,
        "Accept-Ranges": "bytes",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      res.end(fullBuffer);
      return;
    }

    // ----------------------------------------------------
    // AUTENTICACIÓN
    // ----------------------------------------------------
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

    if (pathname === "/api/auth/login" && method === "POST") {
      const body = await readJson(req);
      const username = String(body.username || "").trim().toLowerCase().replace(/\s+/g, "");
      const password = String(body.password || "");

      if (!username || !password) {
        return sendJson(res, 400, { error: "Ingresá usuario y contraseña." });
      }

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

    if (pathname === "/api/auth/me" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) {
        return sendJson(res, 401, { error: "No autenticado" });
      }
      const profile = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      };
      return sendJson(res, 200, { ok: true, user: profile, profile });
    }

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
    // SUBMISSIONS / ENTREGAS + RÚBRICA 4 EJES
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
      const audioDuration = body.audio_duration ? parseFloat(body.audio_duration) : null;

      if (!assignmentId) return sendJson(res, 400, { error: "Falta el ID de la tarea." });

      const id = "sub-" + crypto.randomUUID();
      await execute(
        `INSERT INTO submissions (id, assignment_id, student_id, body, file_path, file_name, file_size, file_type, audio_duration, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
         ON CONFLICT (assignment_id, student_id) DO UPDATE SET
           body = excluded.body,
           file_path = COALESCE(excluded.file_path, submissions.file_path),
           file_name = COALESCE(excluded.file_name, submissions.file_name),
           file_size = COALESCE(excluded.file_size, submissions.file_size),
           file_type = COALESCE(excluded.file_type, submissions.file_type),
           audio_duration = COALESCE(excluded.audio_duration, submissions.audio_duration),
           submitted_at = CURRENT_TIMESTAMP`,
        [id, assignmentId, user.id, submissionBody, filePath, fileName, fileSize, fileType, audioDuration]
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
      if (!id) return sendJson(res, 400, { error: "Falta el ID de la entrega." });

      const rbBeat = body.rubric_beatmatching !== undefined && body.rubric_beatmatching !== "" ? parseFloat(body.rubric_beatmatching) : null;
      const rbHarm = body.rubric_harmony !== undefined && body.rubric_harmony !== "" ? parseFloat(body.rubric_harmony) : null;
      const rbStru = body.rubric_structure !== undefined && body.rubric_structure !== "" ? parseFloat(body.rubric_structure) : null;
      const rbEq   = body.rubric_eq !== undefined && body.rubric_eq !== "" ? parseFloat(body.rubric_eq) : null;

      let grade = body.grade !== undefined && body.grade !== null && body.grade !== "" ? parseFloat(body.grade) : null;
      const rubricAxes = [rbBeat, rbHarm, rbStru, rbEq].filter((v) => v !== null && !isNaN(v));
      if ((grade === null || isNaN(grade)) && rubricAxes.length > 0) {
        const avg = rubricAxes.reduce((a, b) => a + b, 0) / rubricAxes.length;
        grade = Math.round(avg * 10) / 10;
      }

      const feedback = String(body.feedback || "");

      await execute(
        `UPDATE submissions SET
           grade = ?,
           feedback = ?,
           rubric_beatmatching = ?,
           rubric_harmony = ?,
           rubric_structure = ?,
           rubric_eq = ?,
           status = 'graded',
           graded_at = CURRENT_TIMESTAMP,
           graded_by = ?
         WHERE id = ?`,
        [grade, feedback, rbBeat, rbHarm, rbStru, rbEq, user.name, id]
      );
      const updated = await queryOne("SELECT * FROM submissions WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true, data: updated });
    }

    // ----------------------------------------------------
    // COMENTARIOS EN LA ONDA (Timecoded Waveform Feedback)
    // ----------------------------------------------------
    if (pathname === "/api/submissions/comments" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      const subId = parsedUrl.searchParams.get("submission_id");
      if (subId) {
        const rows = await query(
          "SELECT * FROM submission_comments WHERE submission_id = ? ORDER BY timestamp_sec ASC, created_at ASC",
          [subId]
        );
        return sendJson(res, 200, rows);
      }
      const rows = await query("SELECT * FROM submission_comments ORDER BY timestamp_sec ASC, created_at ASC");
      return sendJson(res, 200, rows);
    }

    if (pathname === "/api/submissions/comments" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      const body = await readJson(req);
      const submissionId = String(body.submission_id || "");
      const timestampSec = Math.max(0, parseFloat(body.timestamp_sec) || 0);
      const commentBody = String(body.body || "").trim();
      const category = String(body.category || "tecnica");

      if (!submissionId || !commentBody) {
        return sendJson(res, 400, { error: "Faltan datos del comentario." });
      }

      const id = "wfc-" + crypto.randomUUID();
      await execute(
        `INSERT INTO submission_comments (id, submission_id, author_id, author_name, author_role, timestamp_sec, body, category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, submissionId, user.id, user.name, user.role, timestampSec, commentBody, category]
      );
      const created = await queryOne("SELECT * FROM submission_comments WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true, data: created });
    }

    if (pathname === "/api/submissions/comments" && method === "DELETE") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });
      const id = parsedUrl.searchParams.get("id");
      if (!id) return sendJson(res, 400, { error: "Falta el ID del comentario." });

      const existing = await queryOne("SELECT * FROM submission_comments WHERE id = ?", [id]);
      if (!existing) return sendJson(res, 404, { error: "No encontrado." });
      if (user.role === "student" && existing.author_id !== user.id) {
        return sendJson(res, 403, { error: "No autorizado." });
      }
      await execute("DELETE FROM submission_comments WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true });
    }

    // ----------------------------------------------------
    // ASISTENCIA PRESENCIAL CON QR DINÁMICO
    // ----------------------------------------------------
    if (pathname === "/api/attendance" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      const sessions = await query("SELECT * FROM attendance_sessions ORDER BY session_date DESC, created_at DESC");
      let records;
      if (user.role === "student") {
        records = await query("SELECT * FROM attendance_records WHERE student_id = ?", [user.id]);
      } else {
        records = await query("SELECT * FROM attendance_records ORDER BY checked_in_at DESC");
      }
      return sendJson(res, 200, { sessions, records });
    }

    if (pathname === "/api/attendance/session" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Solo docentes pueden abrir clases de asistencia." });
      }
      const body = await readJson(req);
      const title = String(body.title || "").trim();
      const moduleId = Number(body.module_id) || 1;
      const sessionDate = body.session_date || new Date().toISOString().slice(0, 10);
      const code = (body.code ? String(body.code).toUpperCase().trim() : generateShortCode(6));

      if (!title) return sendJson(res, 400, { error: "El título de la clase es obligatorio." });

      const id = "att-" + crypto.randomUUID();
      await execute(
        `INSERT INTO attendance_sessions (id, title, module_id, session_date, code, active, created_by)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [id, title, moduleId, sessionDate, code, user.name]
      );
      const created = await queryOne("SELECT * FROM attendance_sessions WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true, data: created });
    }

    if (pathname === "/api/attendance/session" && method === "PUT") {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Acceso denegado." });
      }
      const body = await readJson(req);
      const id = String(body.id || "");
      if (!id) return sendJson(res, 400, { error: "Falta ID de sesión." });

      if (body.rotate_code) {
        const newCode = generateShortCode(6);
        await execute("UPDATE attendance_sessions SET code = ?, active = 1 WHERE id = ?", [newCode, id]);
      } else if (body.active !== undefined) {
        await execute("UPDATE attendance_sessions SET active = ? WHERE id = ?", [body.active ? 1 : 0, id]);
      }
      const updated = await queryOne("SELECT * FROM attendance_sessions WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true, data: updated });
    }

    if (pathname === "/api/attendance/session" && method === "DELETE") {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Acceso denegado." });
      }
      const id = parsedUrl.searchParams.get("id");
      if (!id) return sendJson(res, 400, { error: "Falta ID de sesión." });
      await execute("DELETE FROM attendance_sessions WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/attendance/checkin" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "Iniciá sesión en el campus para registrar tu asistencia." });

      const body = await readJson(req);
      const code = String(body.code || "").trim().toUpperCase();
      if (!code) return sendJson(res, 400, { error: "Ingresá el código QR de la clase." });

      const session = await queryOne("SELECT * FROM attendance_sessions WHERE upper(code) = ?", [code]);
      if (!session) {
        return sendJson(res, 404, { error: "Código de asistencia inválido o inexistente." });
      }
      if (!session.active) {
        return sendJson(res, 400, { error: "El registro QR para esta clase ya fue cerrado por el docente." });
      }

      const id = "attrec-" + crypto.randomUUID();
      await execute(
        `INSERT INTO attendance_records (id, session_id, student_id, student_name, status, method)
         VALUES (?, ?, ?, ?, 'present', 'qr')
         ON CONFLICT(session_id, student_id) DO UPDATE SET
           status = 'present',
           method = 'qr',
           checked_in_at = CURRENT_TIMESTAMP`,
        [id, session.id, user.id, user.name]
      );
      return sendJson(res, 200, {
        ok: true,
        message: `¡Presente registrado con éxito en "${session.title}"!`,
        session
      });
    }

    if (pathname === "/api/attendance/manual" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Solo docentes pueden modificar asistencias manualmente." });
      }
      const body = await readJson(req);
      const sessionId = String(body.session_id || "");
      const studentId = String(body.student_id || "");
      const studentName = String(body.student_name || "Alumno");
      const status = ["present", "late", "absent", "excused"].includes(body.status) ? body.status : "present";

      if (!sessionId || !studentId) return sendJson(res, 400, { error: "Datos incompletos." });

      const id = "attrec-" + crypto.randomUUID();
      await execute(
        `INSERT INTO attendance_records (id, session_id, student_id, student_name, status, method)
         VALUES (?, ?, ?, ?, ?, 'manual')
         ON CONFLICT(session_id, student_id) DO UPDATE SET
           status = excluded.status,
           method = 'manual',
           checked_in_at = CURRENT_TIMESTAMP`,
        [id, sessionId, studentId, studentName, status]
      );
      return sendJson(res, 200, { ok: true });
    }

    // ----------------------------------------------------
    // CERTIFICADOS DIGITALES VERIFICABLES CON QR
    // ----------------------------------------------------
    if (pathname === "/api/certificates" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      if (user.role === "student") {
        const rows = await query("SELECT * FROM certificates WHERE student_id = ?", [user.id]);
        return sendJson(res, 200, rows);
      } else {
        const rows = await query("SELECT * FROM certificates ORDER BY issued_at DESC");
        return sendJson(res, 200, rows);
      }
    }

    if (pathname === "/api/certificates/issue" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      const body = await readJson(req);
      let targetStudentId = user.id;

      if (["instructor", "admin"].includes(user.role) && body.student_id) {
        targetStudentId = String(body.student_id);
      } else if (user.role === "student") {
        // Verificar que el alumno tenga 100% de lecciones completadas (19 lecciones)
        const prog = await query("SELECT lesson_id FROM progress WHERE user_id = ?", [user.id]);
        if ((prog || []).length < 19) {
          return sendJson(res, 400, {
            error: "Para autogenerar tu certificado debés completar el 100% de las lecciones del curso (o solicitar la emisión a tu instructor)."
          });
        }
      }

      const student = await queryOne("SELECT * FROM users WHERE id = ?", [targetStudentId]);
      if (!student) return sendJson(res, 404, { error: "Alumno no encontrado." });

      // Calcular promedio de entregas calificadas
      const gradedSubs = await query(
        "SELECT grade FROM submissions WHERE student_id = ? AND status = 'graded' AND grade IS NOT NULL",
        [targetStudentId]
      );
      let calcGrade = body.final_grade ? parseFloat(body.final_grade) : null;
      if (!calcGrade && gradedSubs.length > 0) {
        const avg = gradedSubs.reduce((acc, r) => acc + Number(r.grade), 0) / gradedSubs.length;
        calcGrade = Math.round(avg * 10) / 10;
      }
      if (!calcGrade) calcGrade = 9.0;

      // Calcular porcentaje de asistencia
      const totalSessions = await queryOne("SELECT COUNT(*) as c FROM attendance_sessions");
      const presentCount = await queryOne(
        "SELECT COUNT(*) as c FROM attendance_records WHERE student_id = ? AND status IN ('present', 'late', 'excused')",
        [targetStudentId]
      );
      let attPct = 100;
      if (Number(totalSessions?.c || 0) > 0) {
        attPct = Math.min(100, Math.round((Number(presentCount?.c || 0) / Number(totalSessions.c)) * 100));
        if (attPct === 0) attPct = 100;
      }

      const existing = await queryOne("SELECT * FROM certificates WHERE student_id = ?", [targetStudentId]);
      if (existing) {
        await execute(
          `UPDATE certificates SET final_grade = ?, attendance_pct = ?, status = 'valid', issued_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [calcGrade, attPct, existing.id]
        );
        const updated = await queryOne("SELECT * FROM certificates WHERE id = ?", [existing.id]);
        return sendJson(res, 200, { ok: true, data: updated });
      }

      const id = "cert-" + crypto.randomUUID();
      const shortUser = (student.username || "DJ").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
      const code = `DJ-RGL-2026-${shortUser}-${generateShortCode(4)}`;

      await execute(
        `INSERT INTO certificates (id, code, student_id, student_name, student_username, final_grade, attendance_pct, issued_by, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Gisel Duarte & Franco Esquivel', 'valid')`,
        [id, code, student.id, student.name, student.username, calcGrade, attPct]
      );
      const created = await queryOne("SELECT * FROM certificates WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true, data: created });
    }

    if (pathname === "/api/certificates" && method === "DELETE") {
      const user = await getSessionUser(req);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return sendJson(res, 403, { error: "Acceso denegado." });
      }
      const id = parsedUrl.searchParams.get("id");
      if (!id) return sendJson(res, 400, { error: "Falta ID del certificado." });
      await execute("DELETE FROM certificates WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true });
    }

    // ----------------------------------------------------
    // ALMACENAMIENTO HÍBRIDO (Cloudflare R2 + Turso Edge)
    // ----------------------------------------------------
    if (pathname === "/api/storage/config" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });
      const stats = await queryOne("SELECT COUNT(*) as files, COALESCE(SUM(total_size), 0) as bytes FROM media_files");
      return sendJson(res, 200, {
        r2_configured: isR2Configured(),
        r2_bucket: process.env.R2_BUCKET_NAME || "cursodj-media",
        turso_edge_active: true,
        total_files: Number(stats?.files || 0),
        total_bytes: Number(stats?.bytes || 0),
        turso_quota_gb: 24,
        r2_free_quota_gb: 10
      });
    }

    if (pathname === "/api/storage/init" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      const body = await readJson(req);
      const filename = String(body.filename || "audio.mp3").replace(/[^\w.\- ]/g, "_");
      const mimeType = String(body.mime_type || "audio/mpeg");
      const totalSize = Number(body.total_size) || 0;
      const totalChunks = Math.max(1, Number(body.total_chunks) || 1);
      const folder = String(body.folder || "submissions");

      const fileId = "media-" + crypto.randomUUID();

      // Si Cloudflare R2 está configurado en variables de entorno, emitir URL prefirmada S3 directa
      if (isR2Configured() && !body.force_turso) {
        const key = `${folder}/${user.id}/${Date.now()}_${filename.replace(/\s+/g, "_")}`;
        const presigned = generateR2PresignedPutUrl({ key, contentType: mimeType });
        await execute(
          `INSERT INTO media_files (id, filename, mime_type, total_size, total_chunks, storage_provider, external_url, uploaded_by)
           VALUES (?, ?, ?, ?, 1, 'cloudflare_r2', ?, ?)`,
          [fileId, filename, mimeType, totalSize, presigned.publicUrl, user.name]
        );
        return sendJson(res, 200, {
          ok: true,
          provider: "cloudflare_r2",
          file_id: fileId,
          upload_url: presigned.uploadUrl,
          public_url: presigned.publicUrl,
        });
      }

      // Motor Híbrido Turso Edge Storage (soporta archivos fragmentados sin límite de 4.5MB de Lambda)
      const streamUrl = `/api/storage/stream?id=${fileId}`;
      await execute(
        `INSERT INTO media_files (id, filename, mime_type, total_size, total_chunks, storage_provider, external_url, uploaded_by)
         VALUES (?, ?, ?, ?, ?, 'turso_edge', ?, ?)`,
        [fileId, filename, mimeType, totalSize, totalChunks, streamUrl, user.name]
      );

      return sendJson(res, 200, {
        ok: true,
        provider: "turso_edge",
        file_id: fileId,
        public_url: streamUrl,
      });
    }

    if (pathname === "/api/storage/chunk" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "No autenticado" });

      const body = await readJson(req);
      const fileId = String(body.file_id || "");
      const chunkIndex = Number(body.chunk_index) || 0;
      const data = String(body.data || "");

      if (!fileId || !data) {
        return sendJson(res, 400, { error: "Faltan datos del fragmento." });
      }

      await execute(
        `INSERT INTO media_chunks (file_id, chunk_index, data)
         VALUES (?, ?, ?)
         ON CONFLICT(file_id, chunk_index) DO UPDATE SET data = excluded.data`,
        [fileId, chunkIndex, data]
      );

      return sendJson(res, 200, { ok: true, file_id: fileId, chunk_index: chunkIndex });
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
        const [progressRows, students] = await Promise.all([
          query("SELECT user_id, lesson_id, completed_at FROM progress"),
          query("SELECT id, name, username, email, created_at FROM users WHERE role = 'student' ORDER BY name ASC")
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
    // ADMINISTRACIÓN DE USUARIOS
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

      await execute("DELETE FROM users WHERE id = ?", [targetId]);
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { error: "Endpoint no encontrado.", path: pathname });
  } catch (err) {
    console.error("API Error:", err);
    return sendJson(res, 500, {
      error: "Error interno del servidor.",
      message: err.message || String(err)
    });
  }
}
