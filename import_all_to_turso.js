// ============================================================
//  import_all_to_turso.js — Importador Espejo Supabase -> Turso Scaler
//  SISTEMAS DesarrollAR · Río Gallegos, Santa Cruz, Argentina 🇦🇷
// ============================================================

import fs from "fs";
import { createClient } from "@libsql/client";

const TURSO_URL = "libsql://cursodj-jorgeadrianduarte.aws-sa-east-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTMxNTc0NDcsImlkIjoiMDFhMTgwODEtOWUwMS03MmQ4LWFkNDYtNTk2NzUyYmEwZDk4Iiwia2lkIjoiOTZlWkdmb2lGWEFlbTVzc3ZzYld4enpGaEVEMnk3STdTRmpJcV9GOVNadyIsInJpZCI6ImNkZDU2ZWNmLWUyMzEtNGQyMy1hMDU2LTk4OWI3NzJkNjgwMyJ9.nAbzAp1xyAH0wqRMkMm99-VOpqMvo48aTqLHjGf3hn0E9FMRsC6CJDEYhKS5xw6KrYg227aYFqlYLngATIjFDA";

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

async function main() {
  const dump = JSON.parse(fs.readFileSync("supabase_dump.json", "utf8"));
  console.log("Iniciando importación espejo a Turso Scaler...");

  // 1. Usuarios
  console.log(`\nImportando ${dump.users.length} usuarios...`);
  for (const u of dump.users) {
    let username = u.username;
    // Si el usuario es 'admin', lo dejamos también como 'gisel' para que no choque con la cuenta admin de Jorge
    if (username === "admin") {
      // Guardar a Gisel con username 'gisel' y 'gisel_admin'
      await client.execute({
        sql: `INSERT INTO users (id, username, name, email, password_hash, role, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                username = excluded.username,
                name = excluded.name,
                email = excluded.email,
                password_hash = excluded.password_hash,
                role = excluded.role`,
        args: [u.id, "gisel", u.name, u.email, u.password_hash, u.role, u.created_at]
      });
      console.log(`  ✓ Usuario admin original de Gisel guardado como @gisel [${u.role}]`);
      continue;
    }

    await client.execute({
      sql: `INSERT INTO users (id, username, name, email, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              username = excluded.username,
              name = excluded.name,
              email = excluded.email,
              password_hash = excluded.password_hash,
              role = excluded.role`,
      args: [u.id, username, u.name, u.email, u.password_hash, u.role, u.created_at]
    });
    console.log(`  ✓ ${username} (${u.name}) [${u.role}]`);
  }

  // Asegurar que Jorge Adrián Duarte tenga también usuario 'jorge' y 'admin'
  const jorgePassHash = "96c096ef14fc4c47b5969ce73822f03f:3923d21df0102aaee3190dfca0a604753061f221ca4bb7621fc4e797e8e7279cbe878419cf5b9d29ef66a7b7aeec266ef87a4a259cbb1a98075a34e06bcfe49c"; // AdminDj2026!
  await client.execute({
    sql: `INSERT INTO users (id, username, name, email, password_hash, role, created_at)
          VALUES ('usr-jorge-duarte', 'jorge', 'Jorge Adrián Duarte', 'jorge@desarrollar.online', ?, 'admin', datetime('now'))
          ON CONFLICT(id) DO NOTHING`,
    args: [jorgePassHash]
  });
  console.log("  ✓ Usuario admin @jorge creado para Jorge Adrián Duarte.");

  // 2. Tareas (Assignments)
  console.log(`\nImportando ${dump.assignments.length} tareas originales...`);
  for (const a of dump.assignments) {
    await client.execute({
      sql: `INSERT INTO assignments (id, course_id, module_id, title, instructions, due_date, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              course_id = excluded.course_id,
              module_id = excluded.module_id,
              title = excluded.title,
              instructions = excluded.instructions,
              due_date = excluded.due_date`,
      args: [a.id, a.course_id, a.module_id, a.title, a.instructions, a.due_date, a.created_by, a.created_at]
    });
    console.log(`  ✓ [Módulo ${a.module_id}] ${a.title}`);
  }

  // 3. Anuncios (Announcements)
  console.log(`\nImportando ${dump.announcements.length} anuncios...`);
  for (const an of dump.announcements) {
    await client.execute({
      sql: `INSERT INTO announcements (id, course_id, title, body, author, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              body = excluded.body,
              author = excluded.author`,
      args: [an.id, an.course_id, an.title, an.body, an.author, an.created_at]
    });
    console.log(`  ✓ ${an.title} (por ${an.author})`);
  }

  // 4. Herramientas (Tools)
  console.log(`\nImportando ${dump.tools.length} herramientas/recursos...`);
  for (const t of dump.tools) {
    await client.execute({
      sql: `INSERT INTO tools (id, title, category, description, url, file_path, file_name, file_size, file_type, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              category = excluded.category,
              url = excluded.url`,
      args: [t.id, t.title, t.category, t.description, t.url || t.external_url, t.file_path, t.file_name, t.file_size, t.file_type || null, t.created_by, t.created_at]
    });
    console.log(`  ✓ [${t.category}] ${t.title}`);
  }

  // 5. Descargas de herramientas
  console.log(`\nImportando ${dump.tool_downloads.length} registros de descargas...`);
  for (const td of dump.tool_downloads) {
    await client.execute({
      sql: `INSERT INTO tool_downloads (id, tool_id, tool_title, user_id, user_name, downloaded_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING`,
      args: [td.id, td.tool_id, td.tool_title, td.user_id, td.user_name, td.downloaded_at]
    });
  }
  console.log(`  ✓ ${dump.tool_downloads.length} descargas importadas.`);

  // 6. Instructores
  console.log(`\nImportando instructores...`);
  for (const ins of dump.instructors) {
    await client.execute({
      sql: `INSERT INTO instructors (id, user_id, name, title, bio, photo_url, instagram, spotify, soundcloud, youtube, tiktok, website, whatsapp, sort, visible, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              title = excluded.title,
              bio = excluded.bio,
              photo_url = excluded.photo_url,
              instagram = excluded.instagram,
              website = excluded.website,
              whatsapp = excluded.whatsapp`,
      args: [
        ins.id, ins.user_id, ins.name, ins.title, ins.bio, ins.photo_url,
        ins.instagram, ins.spotify, ins.soundcloud, ins.youtube, ins.tiktok,
        ins.website, ins.whatsapp, ins.sort || 0, ins.visible ? 1 : 0, ins.updated_at
      ]
    });
    console.log(`  ✓ Instructor: ${ins.name} (${ins.title})`);
  }

  console.log("\n✅ ¡MIGRACIÓN ESPEJO COMPLETADA CON ÉXITO EN TURSO SCALER!");
}

main().catch(console.error);
