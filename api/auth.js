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

export function generatePin() {
  return String(crypto.randomInt(1000, 10000));
}

export function normalizePhone(texto) {
  if (!texto) return "";
  const soloDigitos = String(texto).replace(/\D/g, "");
  if (!soloDigitos) return "";
  // Si tiene 10 dígitos (celular argentino sin prefijo internacional)
  if (soloDigitos.length === 10 && !soloDigitos.startsWith("54")) {
    return "549" + soloDigitos;
  }
  // Si tiene 11 dígitos y empieza con 0 (ej: 02966123456 -> 5492966123456)
  if (soloDigitos.length === 11 && soloDigitos.startsWith("0")) {
    return "549" + soloDigitos.slice(1);
  }
  // Si tiene 11 dígitos (ej: 542966123456 sin el 9)
  if (soloDigitos.length === 12 && soloDigitos.startsWith("54") && !soloDigitos.startsWith("549")) {
    return "549" + soloDigitos.slice(2);
  }
  return soloDigitos;
}

export function buildPinMessage({ name, username, pin, origin }) {
  const urlBase = (origin || "https://cursodj.desarrollar.online").replace(/\/$/, "");
  const enlaceAcceso = `${urlBase}/campus`;
  const nombre = name || "Alumno";

  return (
    `🎧 *CAMPUS VIRTUAL · TALLER DE DJ*\n` +
    `Hola ${nombre}, te enviamos tus credenciales para acceder o restablecer tu cuenta:\n\n` +
    `👤 *Usuario:* ${username}\n` +
    `🔑 *PIN Temporal:* ${pin}\n` +
    `🌐 *Enlace directo:* ${enlaceAcceso}\n\n` +
    `⏳ *Información importante:*\n` +
    `• Este PIN es temporal y tiene una vigencia máxima de 24 horas.\n` +
    `• Es de UN SOLO USO: al definir tu nueva clave quedará desactivado automáticamente.\n\n` +
    `📋 *Pasos para ingresar:*\n` +
    `1. Ingresá al enlace: ${enlaceAcceso}\n` +
    `2. Hacé clic en "¿Olvidaste tu contraseña o tenés un PIN?"\n` +
    `3. Escribí tu usuario (${username}) y el PIN (${pin})\n` +
    `4. Definí tu nueva contraseña personal\n\n` +
    `🔒 *Seguridad:* Nunca compartas este PIN con nadie.\n\n` +
    `_SISTEMAS DesarrollAR · Río Gallegos, Santa Cruz, Argentina 🇦🇷_`
  );
}

export function buildWhatsAppLink({ phone, name, username, pin, origin }) {
  const norm = normalizePhone(phone);
  const msg = buildPinMessage({ name, username, pin, origin });
  const encoded = encodeURIComponent(msg);
  if (!norm) {
    return `https://api.whatsapp.com/send?text=${encoded}`;
  }
  return `https://wa.me/${norm}?text=${encoded}`;
}
