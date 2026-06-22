-- ============================================================
-- SWARM_CTRL — Manuel Veritabanı Oluşturma
-- Docker kullanmıyorsanız bu scripti önce çalıştırın:
--
--   psql -U postgres -f init_manual.sql
--
-- Sonra schema ve seed'i uygulayın:
--   psql -U postgres -d swarm_ctrl -f schema.sql
--   psql -U postgres -d swarm_ctrl -f seed.sql
-- ============================================================

-- Veritabanı ve kullanıcı oluştur
CREATE USER swarm WITH PASSWORD 'swarm_secret_change_me';

CREATE DATABASE swarm_ctrl
    OWNER = swarm
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Yetkilendirme
GRANT ALL PRIVILEGES ON DATABASE swarm_ctrl TO swarm;

-- Bağlan ve schema izinleri ver
\c swarm_ctrl

GRANT ALL ON SCHEMA public TO swarm;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO swarm;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO swarm;

\echo 'Veritabanı oluşturuldu: swarm_ctrl'
\echo 'Kullanici: swarm'
\echo 'Simdi schema.sql ve seed.sql dosyalarini uygulayin.'
