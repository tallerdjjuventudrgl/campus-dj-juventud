// ============================================================
//  api/db.js — Conexión Turso Scaler (libSQL) · Campus DJ v3.0
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
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
      pin_hash TEXT,
      pin_expira_en TEXT,
      pin_intentos INTEGER DEFAULT 0,
      must_change_password INTEGER DEFAULT 0,
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
      rubric_beatmatching REAL,
      rubric_harmony REAL,
      rubric_structure REAL,
      rubric_eq REAL,
      audio_duration REAL,
      UNIQUE (assignment_id, student_id)
    );`,
    `CREATE TABLE IF NOT EXISTS submission_comments (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      timestamp_sec REAL NOT NULL DEFAULT 0,
      body TEXT NOT NULL,
      category TEXT DEFAULT 'tecnica',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    );`,
    `CREATE TABLE IF NOT EXISTS attendance_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      module_id INTEGER DEFAULT 1,
      session_date TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      expires_at DATETIME,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'present',
      method TEXT DEFAULT 'qr',
      checked_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(session_id, student_id)
    );`,
    `CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      student_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      student_name TEXT NOT NULL,
      student_username TEXT,
      course_title TEXT NOT NULL DEFAULT 'Taller de DJ · Formación Profesional en Cabina y Mezcla',
      hours INTEGER NOT NULL DEFAULT 48,
      final_grade REAL,
      attendance_pct INTEGER DEFAULT 100,
      issued_by TEXT NOT NULL DEFAULT 'Gisel Duarte & Franco Esquivel',
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'valid'
    );`,
    `CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      total_size INTEGER NOT NULL,
      total_chunks INTEGER NOT NULL DEFAULT 1,
      storage_provider TEXT NOT NULL DEFAULT 'turso_edge',
      external_url TEXT,
      uploaded_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS media_chunks (
      file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (file_id, chunk_index)
    );`
  ];

  for (const stmt of statements) {
    await client.execute(stmt);
  }

  // Migraciones automáticas seguras de columnas para el sistema de recuperación por PIN
  const safeColumns = [
    "ALTER TABLE users ADD COLUMN phone TEXT;",
    "ALTER TABLE users ADD COLUMN pin_hash TEXT;",
    "ALTER TABLE users ADD COLUMN pin_expira_en TEXT;",
    "ALTER TABLE users ADD COLUMN pin_intentos INTEGER DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;"
  ];
  for (const sql of safeColumns) {
    try {
      await client.execute(sql);
    } catch (_) {
      // Ignorar si la columna ya existe
    }
  }
}
