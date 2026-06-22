-- ============================================================
-- SWARM_CTRL — Tam Veritabanı Şeması
-- PostgreSQL 14+
-- Kullanım: psql -U postgres -d swarm_ctrl -f schema.sql
-- ============================================================

-- Temiz başlangıç (geliştirme ortamı için)
-- Üretimde bu satırları yorum satırı yapın!
DROP TABLE IF EXISTS cli_history CASCADE;
DROP TABLE IF EXISTS activity CASCADE;
DROP TABLE IF EXISTS snapshots CASCADE;
DROP TABLE IF EXISTS run_logs CASCADE;
DROP TABLE IF EXISTS project_files CASCADE;
DROP TABLE IF EXISTS runs CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- ============================================================
-- agents
-- Her AI ajanının model yapılandırması
-- ============================================================
CREATE TABLE agents (
    id          TEXT PRIMARY KEY,
    key         TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL,
    model_name  TEXT NOT NULL,
    temperature REAL NOT NULL DEFAULT 0.2,
    description TEXT NOT NULL DEFAULT '',
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- projects
-- Her proje kendi birikimli hafızasını (JSONB) taşır
-- ============================================================
CREATE TABLE projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'initialized'
                    CHECK (status IN ('initialized','active','paused','completed')),
    stack       TEXT,
    memory      JSONB NOT NULL DEFAULT '{"facts":[],"summary":"","lastUpdated":""}',
    total_runs  INTEGER NOT NULL DEFAULT 0,
    total_files INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- runs
-- Her pipeline çalıştırması
-- ============================================================
CREATE TABLE runs (
    id            TEXT PRIMARY KEY,
    project_id    TEXT REFERENCES projects(id) ON DELETE SET NULL,
    project_name  TEXT NOT NULL,
    prompt        TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','running','completed','failed','cancelled')),
    agent_keys    JSONB NOT NULL DEFAULT '[]',
    parallel_count INTEGER NOT NULL DEFAULT 1,
    snapshot_id   TEXT,
    ollama_url    TEXT,
    files_written INTEGER NOT NULL DEFAULT 0,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX runs_project_idx ON runs(project_id);
CREATE INDEX runs_status_idx  ON runs(status);
CREATE INDEX runs_created_idx ON runs(created_at DESC);

-- ============================================================
-- run_logs
-- Her ajanın her adımda ürettiği log satırları
-- ============================================================
CREATE TABLE run_logs (
    id          TEXT PRIMARY KEY,
    run_id      TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    agent_key   TEXT NOT NULL,
    level       TEXT NOT NULL DEFAULT 'info'
                    CHECK (level IN ('info','warn','error','think','output','file')),
    message     TEXT NOT NULL,
    think_trace TEXT,
    file_path   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX rl_run_idx     ON run_logs(run_id);
CREATE INDEX rl_created_idx ON run_logs(run_id, created_at);

-- ============================================================
-- project_files
-- Ajanların yazdığı her dosya — versiyonlu geçmiş ile
-- ============================================================
CREATE TABLE project_files (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    run_id      TEXT NOT NULL,
    agent_key   TEXT NOT NULL,
    path        TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    language    TEXT NOT NULL DEFAULT 'text',
    operation   TEXT NOT NULL DEFAULT 'create'
                    CHECK (operation IN ('create','update','delete')),
    version     INTEGER NOT NULL DEFAULT 1,
    size_bytes  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX pf_project_idx ON project_files(project_id);
CREATE INDEX pf_path_idx    ON project_files(project_id, path);
CREATE INDEX pf_version_idx ON project_files(project_id, path, version DESC);

-- ============================================================
-- snapshots
-- ZIP tabanlı checkpoint sistemi
-- ============================================================
CREATE TABLE snapshots (
    id             TEXT PRIMARY KEY,
    project_name   TEXT NOT NULL,
    label          TEXT NOT NULL,
    checkpoint_id  TEXT NOT NULL,
    size_bytes     INTEGER NOT NULL DEFAULT 0,
    run_id         TEXT,
    agent_key      TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX snap_project_idx ON snapshots(project_name);

-- ============================================================
-- activity
-- Sistem geneli etkinlik akışı
-- ============================================================
CREATE TABLE activity (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    message     TEXT NOT NULL,
    entity_id   TEXT NOT NULL,
    entity_type TEXT NOT NULL
                    CHECK (entity_type IN ('run','snapshot','agent','project','file')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_created_idx ON activity(created_at DESC);
CREATE INDEX activity_type_idx    ON activity(type);

-- ============================================================
-- cli_history
-- Terminal komut geçmişi
-- ============================================================
CREATE TABLE cli_history (
    id          TEXT PRIMARY KEY,
    project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
    command     TEXT NOT NULL,
    output      TEXT NOT NULL,
    exit_code   INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cli_project_idx ON cli_history(project_id);
CREATE INDEX cli_created_idx ON cli_history(created_at DESC);
