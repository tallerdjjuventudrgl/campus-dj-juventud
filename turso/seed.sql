-- ============================================================
--  CAMPUS VIRTUAL · TALLER DE DJ — Datos Semilla (Turso Scaler)
--  SISTEMAS DesarrollAR · Río Gallegos, Santa Cruz, Argentina 🇦🇷
-- ============================================================

INSERT OR IGNORE INTO assignments (id, module_id, title, instructions, due_date, created_by) VALUES
 ('assign-mod-2', 2, 'Análisis armónico de 3 temas', 'Elegí 3 canciones, identificá su clave con la Ruleta de Camelot y proponé un orden de mezcla justificando por qué combinan.', date('now', '+7 days'), 'Instructor'),
 ('assign-mod-3', 3, 'Mini set de 5 canciones', 'Grabá un set de 5 temas aplicando beatmatching y al menos 2 transiciones limpias con EQ. Subí el audio (MP3) o el link a SoundCloud.', date('now', '+14 days'), 'Instructor'),
 ('assign-mod-6', 6, 'Set final grabado', 'Tu proyecto final: un set completo que cuente una historia (opening → pico → cierre). Subí el audio y un breve texto sobre tu identidad sonora.', date('now', '+30 days'), 'Instructor');

INSERT OR IGNORE INTO announcements (id, course_id, title, body, author) VALUES
 ('ann-welcome', 'dj', '¡Bienvenidos al Campus Virtual del Taller de DJ!', 'Te damos la bienvenida al espacio virtual oficial del Taller de DJ de la Casa de la Juventud de Río Gallegos. Acá vas a encontrar todo el material formativo, registrar tu progreso, acceder a las herramientas y entregar tus sets prácticos.', 'Gisel Duarte & Franco Esquivel');

INSERT OR IGNORE INTO instructors (id, name, title, bio, instagram, spotify, soundcloud, sort, visible) VALUES
 ('inst-gisel', 'Gisel Duarte', 'Instructora Principal', 'DJ profesional, productora y formadora artística en la Casa de la Juventud de Río Gallegos. Formando las nuevas generaciones sonoras de Santa Cruz.', 'https://instagram.com/', '', '', 1, 1),
 ('inst-franco', 'Franco Esquivel', 'Instructor Técnico', 'DJ y técnico de sonido en vivo en eventos y festivales de Río Gallegos. Especialista en beatmatching, hardware y calibración de audio.', 'https://instagram.com/', '', '', 2, 1);
