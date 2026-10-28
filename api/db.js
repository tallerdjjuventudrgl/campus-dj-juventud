// ============================================================
//  api/db.js — Conexión Turso Scaler (libSQL)
//  SISTEMAS DesarrollAR · Río Gallegos, Santa Cruz, Argentina 🇦🇷
// ============================================================

import { createClient } from "@libsql/client";

const isVercel = Boolean(process.env.VERCEL);
const defaultUrl = isVercel ? "file:/tmp/cursodj.db" : "file:cursodj_local.db";
const url = process.env.TURSO_DATABASE_URL || defaultUrl;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const client = createClient({
  url,
  authToken,
});

export async function query(sql, args = []) {
  const rs = await client.execute({ sql, args });
  const cols = rs.columns;
  return rs.rows.map((row) => {
    const obj = {};
    cols.forEach((c, idx) => {
      obj[c] = row[idx];
    });
    return obj;
  });
}

export async function queryOne(sql, args = []) {
  const rows = await query(sql, args);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql, args = []) {
  return await client.execute({ sql, args });
}

export async function batch(statements) {
  return await client.batch(statements, "write");
}

export async function initDatabase() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      name TEXT NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);`,
    `CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      course_id TEXT DEFAULT 'dj',
      module_id INTEGER,
      title TEXT NOT NULL,
      instructions TEXT,
      due_date TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT,
      file_path TEXT,
      file_name TEXT,
      file_size INTEGER,
      file_type TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'graded')),
      grade REAL,
      feedback TEXT,
      graded_at DATETIME,
      graded_by TEXT,
      UNIQUE (assignment_id, student_id)
    );`,
    `CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      course_id TEXT DEFAULT 'dj',
      title TEXT NOT NULL,
      body TEXT,
      author TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, lesson_id)
    );`,
    `CREATE TABLE IF NOT EXISTS instructors (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      name TEXT,
      title TEXT,
      bio TEXT,
      photo_url TEXT,
      instagram TEXT,
      spotify TEXT,
      soundcloud TEXT,
      youtube TEXT,
      tiktok TEXT,
      website TEXT,
      whatsapp TEXT,
      sort INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT,
      file_path TEXT,
      file_name TEXT,
      file_size INTEGER,
      file_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS tool_downloads (
      id TEXT PRIMARY KEY,
      tool_id TEXT,
      tool_title TEXT,
      user_id TEXT,
      user_name TEXT,
      downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  for (const stmt of statements) {
    await client.execute(stmt);
  }

  // Seed initial data if tables are empty
  const countAssign = await queryOne("SELECT COUNT(*) as count FROM assignments");
  if (countAssign && Number(countAssign.count) === 0) {
    await client.execute({
      sql: `INSERT INTO assignments (id, module_id, title, instructions, due_date, created_by) VALUES
        ('assign-mod-2', 2, 'Análisis armónico de 3 temas', 'Elegí 3 canciones, identificá su clave con la Ruleta de Camelot y proponé un orden de mezcla justificando por qué combinan.', date('now', '+7 days'), 'Instructor'),
        ('assign-mod-3', 3, 'Mini set de 5 canciones', 'Grabá un set de 5 temas aplicando beatmatching y al menos 2 transiciones limpias con EQ. Subí el audio (MP3) o el link a SoundCloud.', date('now', '+14 days'), 'Instructor'),
        ('assign-mod-6', 6, 'Set final grabado', 'Tu proyecto final: un set completo que cuente una historia (opening → pico → cierre). Subí el audio y un breve texto sobre tu identidad sonora.', date('now', '+30 days'), 'Instructor')`,
      args: []
    });
  }

  const countAnn = await queryOne("SELECT COUNT(*) as count FROM announcements");
  if (countAnn && Number(countAnn.count) === 0) {
    await client.execute({
      sql: `INSERT INTO announcements (id, course_id, title, body, author) VALUES
        ('ann-welcome', 'dj', '¡Bienvenidos al Campus Virtual del Taller de DJ!', 'Te damos la bienvenida al espacio virtual oficial del Taller de DJ de la Casa de la Juventud de Río Gallegos. Acá vas a encontrar todo el material formativo, registrar tu progreso, acceder a las herramientas y entregar tus sets prácticos.', 'Gisel Duarte & Franco Esquivel')`,
      args: []
    });
  }

  const countInst = await queryOne("SELECT COUNT(*) as count FROM instructors");
  if (countInst && Number(countInst.count) === 0) {
    await client.execute({
      sql: `INSERT INTO instructors (id, name, title, bio, instagram, spotify, soundcloud, sort, visible) VALUES
        ('inst-gisel', 'Gisel Duarte', 'Instructora Principal', 'DJ profesional, productora y formadora artística en la Casa de la Juventud de Río Gallegos. Formando las nuevas generaciones sonoras de Santa Cruz.', 'https://instagram.com/', '', '', 1, 1),
        ('inst-franco', 'Franco Esquivel', 'Instructor Técnico', 'DJ y técnico de sonido en vivo en eventos y festivales de Río Gallegos. Especialista en beatmatching, hardware y calibración de audio.', 'https://instagram.com/', '', '', 2, 1)`,
      args: []
    });
  }
}
