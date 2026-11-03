import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const globalForDb = globalThis as unknown as {
  __learningCoachDb?: Database.Database;
};

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  goal TEXT NOT NULL DEFAULT '',
  background TEXT NOT NULL DEFAULT '',
  weekly_hours INTEGER NOT NULL DEFAULT 5,
  current_stage INTEGER CHECK (current_stage BETWEEN 1 AND 5),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ladder_levels (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  must_master TEXT NOT NULL DEFAULT '[]',
  common_mistakes TEXT NOT NULL DEFAULT '[]',
  gate_criteria TEXT NOT NULL DEFAULT '',
  practice TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  UNIQUE (project_id, stage)
);
CREATE INDEX IF NOT EXISTS idx_ladder_project ON ladder_levels(project_id);

CREATE TABLE IF NOT EXISTS stage_assessments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  questions TEXT NOT NULL,
  answers TEXT,
  result TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','scored')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_assessment_project ON stage_assessments(project_id, created_at);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','finished')),
  max_questions INTEGER NOT NULL DEFAULT 8,
  difficulty INTEGER NOT NULL DEFAULT 2,
  avg_score REAL,
  report TEXT,
  model TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_exam_project ON exam_sessions(project_id, created_at);

CREATE TABLE IF NOT EXISTS exam_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  question TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  answer TEXT,
  score REAL CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
  feedback TEXT,
  created_at TEXT NOT NULL,
  answered_at TEXT,
  UNIQUE (session_id, idx)
);
CREATE INDEX IF NOT EXISTS idx_turn_session ON exam_turns(session_id, idx);

CREATE TABLE IF NOT EXISTS feynman_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','passed')),
  rounds INTEGER NOT NULL DEFAULT 0,
  mastery INTEGER,
  model TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  passed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_feynman_project ON feynman_sessions(project_id, created_at);

CREATE TABLE IF NOT EXISTS feynman_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES feynman_sessions(id) ON DELETE CASCADE,
  round INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL CHECK (role IN ('ai','user','system')),
  kind TEXT NOT NULL CHECK (kind IN ('explain','restate','feedback','retry-explain','note')),
  content TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_message_session ON feynman_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS ai_calls (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  kind TEXT NOT NULL,
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  ok INTEGER NOT NULL DEFAULT 1,
  error TEXT,
  created_at TEXT NOT NULL
);
`;

const SCHEMA_V2 = `
CREATE TABLE IF NOT EXISTS stage_lessons (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  plan TEXT NOT NULL,
  completed TEXT NOT NULL DEFAULT '[]',
  model TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (project_id, stage)
);
CREATE INDEX IF NOT EXISTS idx_lesson_project ON stage_lessons(project_id, stage);
`;

// v3: one lesson per (stage, learning mode), plus uploaded source files.
const SCHEMA_V3 = `
CREATE TABLE IF NOT EXISTS stage_lessons_v3 (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 5),
  mode TEXT NOT NULL DEFAULT 'standard',
  title TEXT NOT NULL,
  plan TEXT NOT NULL,
  completed TEXT NOT NULL DEFAULT '[]',
  model TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (project_id, stage, mode)
);
INSERT INTO stage_lessons_v3
  (id, project_id, stage, mode, title, plan, completed, model, created_at, updated_at)
SELECT id, project_id, stage, 'standard', title, plan, completed, model, created_at, updated_at
FROM stage_lessons;
DROP TABLE stage_lessons;
ALTER TABLE stage_lessons_v3 RENAME TO stage_lessons;
CREATE INDEX IF NOT EXISTS idx_lesson_project ON stage_lessons(project_id, stage);

CREATE TABLE IF NOT EXISTS project_sources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  char_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_source_project ON project_sources(project_id, created_at);
`;

// v4: exam questions became single-choice, so each turn needs its options,
// the correct index, and an explanation. Old unfinished free-text exams are
// closed instead of leaving unanswerable questions in the runner.
const SCHEMA_V4 = `
ALTER TABLE exam_turns ADD COLUMN options TEXT NOT NULL DEFAULT '[]';
ALTER TABLE exam_turns ADD COLUMN correct INTEGER;
ALTER TABLE exam_turns ADD COLUMN explanation TEXT;
UPDATE exam_sessions
SET status = 'finished',
    finished_at = COALESCE(finished_at, updated_at)
WHERE status = 'active'
  AND id IN (SELECT session_id FROM exam_turns WHERE options = '[]');
`;

// v5: local settings, project pace, ladder estimates, short-answer exams,
// and project-level Feynman self-check questions.
const SCHEMA_V5 = `
CREATE TABLE app_settings (
  setting_key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE project_self_checks (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  questions TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE projects ADD COLUMN pace TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE ladder_levels ADD COLUMN estimated_sessions INTEGER;
ALTER TABLE ladder_levels ADD COLUMN estimated_hours REAL;
ALTER TABLE ladder_levels ADD COLUMN estimated_weeks REAL;

ALTER TABLE exam_sessions ADD COLUMN question_type TEXT NOT NULL DEFAULT 'choice';
ALTER TABLE exam_turns ADD COLUMN reference TEXT;
ALTER TABLE exam_turns ADD COLUMN topic TEXT;

UPDATE exam_sessions
SET question_type = 'short'
WHERE id IN (
  SELECT s.id FROM exam_sessions s
  WHERE EXISTS (SELECT 1 FROM exam_turns t WHERE t.session_id = s.id)
    AND NOT EXISTS (
      SELECT 1 FROM exam_turns t
      WHERE t.session_id = s.id AND t.options != '[]'
    )
);
`;

function migrate(db: Database.Database) {
  const version = db.pragma("user_version", { simple: true }) as number;
  if (version < 1) {
    db.exec(SCHEMA_V1);
    db.pragma("user_version = 1");
  }
  if (version < 2) {
    db.exec(SCHEMA_V2);
    db.pragma("user_version = 2");
  }
  if (version < 3) {
    // Rebuilding stage_lessons must be atomic; otherwise a failure leaves a
    // half-created copy behind while user_version is still 2.
    const upgrade = db.transaction(() => {
      db.exec(SCHEMA_V3);
      db.pragma("user_version = 3");
    });
    upgrade();
  }
  if (version < 4) {
    const upgrade = db.transaction(() => {
      db.exec(SCHEMA_V4);
      db.pragma("user_version = 4");
    });
    upgrade();
  }
  if (version < 5) {
    const upgrade = db.transaction(() => {
      db.exec(SCHEMA_V5);
      // Move an existing .env.local key into the local settings table once,
      // without logging or returning it. The env line can then be removed.
      const envKey = process.env.DEEPSEEK_API_KEY?.trim();
      if (envKey) {
        const existing = db
          .prepare(
            "SELECT value FROM app_settings WHERE setting_key = 'ai.apiKey'",
          )
          .get();
        if (!existing) {
          db.prepare(
            "INSERT INTO app_settings (setting_key, value, updated_at) VALUES (?, ?, ?)",
          ).run("ai.apiKey", envKey, new Date().toISOString());
        }
      }
      db.pragma("user_version = 5");
    });
    upgrade();
  }
}

function openDatabase(): Database.Database {
  const dir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.__learningCoachDb) {
    globalForDb.__learningCoachDb = openDatabase();
  }
  // Re-check on every access so a long-lived dev process picks up new
  // migrations after a hot reload instead of keeping a stale user_version.
  migrate(globalForDb.__learningCoachDb);
  return globalForDb.__learningCoachDb;
}

export function dbHealth() {
  const db = getDb();
  const version = db.pragma("user_version", { simple: true }) as number;
  const row = db.prepare("SELECT COUNT(*) AS count FROM projects").get() as {
    count: number;
  };
  return { ok: true, schemaVersion: version, projects: row.count };
}
