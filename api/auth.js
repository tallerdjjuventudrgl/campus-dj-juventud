// ============================================================
//  api/auth.js — Autenticación y Sesiones
//  SISTEMAS DesarrollAR · Río Gallegos, Santa Cruz, Argentina 🇦🇷
// ============================================================

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { queryOne, execute } from "./db.js";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  // Soporte nativo para contraseñas históricas migradas de Supabase (bcrypt $2a$ / $2b$)
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    try {
      return bcrypt.compareSync(password, storedHash);
    } catch (_) {
      return false;
    }
  }
  if (!storedHash.includes(":")) return false;
  const [salt, originalHash] = storedHash.split(":");
  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(testHash, "hex"), Buffer.from(originalHash, "hex"));
}

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId, daysValid = 30) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000).toISOString();
  await execute(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
    [token, userId, expiresAt]
  );
  return { token, expiresAt };
}

export async function deleteSession(token) {
  if (!token) return;
  await execute("DELETE FROM sessions WHERE token = ?", [token]);
}

export function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    let [name, ...rest] = cookie.split("=");
    name = name?.trim();
    if (!name) return;
    const value = rest.join("=").trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

export async function getSessionUser(req) {
  let token = null;
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }
  if (!token && req.headers["cookie"]) {
    const cookies = parseCookies(req.headers["cookie"]);
    token = cookies["cursodj_session"];
  }

  if (!token) return null;

  const now = new Date().toISOString();
  const session = await queryOne(
    `SELECT s.token, s.expires_at, u.id, u.username, u.name, u.email, u.role, u.created_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, now]
  );

  return session || null;
}
