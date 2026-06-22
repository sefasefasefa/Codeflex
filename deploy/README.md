# SWARM_CTRL — Yerel Kurulum Kılavuzu

## Gereksinimler

| Araç | Minimum Sürüm | Kurulum |
|------|--------------|---------|
| Node.js | 20+ | https://nodejs.org |
| pnpm | 9+ | `npm install -g pnpm` |
| PostgreSQL | 14+ | https://postgresql.org veya Docker |
| Docker (opsiyonel) | 24+ | https://docker.com |

---

## Hızlı Başlangıç (Önerilen — Docker ile)

```bash
# 1. Repoyu klonlayın
git clone <repo_url>
cd swarm-ctrl

# 2. Otomatik kurulum
chmod +x deploy/setup.sh
./deploy/setup.sh

# 3. Terminal 1 — API Server
pnpm --filter @workspace/api-server run dev

# 4. Terminal 2 — Frontend
pnpm --filter @workspace/swarm-ui run dev

# 5. Tarayıcıda açın
# http://localhost:5173
```

---

## Manuel Kurulum (Docker olmadan)

### 1. Veritabanı Oluştur

```bash
# PostgreSQL'e bağlan (postgres kullanıcısı ile)
psql -U postgres

# Veritabanı ve kullanıcı oluştur
psql -U postgres -f deploy/init_manual.sql

# Şemayı uygula
psql -U swarm -d swarm_ctrl -f deploy/schema.sql

# Örnek veriyi yükle
psql -U swarm -d swarm_ctrl -f deploy/seed.sql
```

### 2. Ortam Değişkenleri

```bash
cp deploy/.env.example .env
# .env dosyasını düzenleyin — en az DATABASE_URL'yi ayarlayın
```

### 3. Bağımlılıkları Yükle

```bash
pnpm install
```

### 4. Drizzle Şemasını Uygula

```bash
pnpm --filter @workspace/db run push
```

### 5. API Kodunu Oluştur (OpenAPI → TypeScript)

```bash
pnpm --filter @workspace/api-spec run codegen
```

### 6. Build ve Çalıştır

```bash
# API Server
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run dev

# Frontend (ayrı terminal)
pnpm --filter @workspace/swarm-ui run dev
```

---

## Dosya Yapısı

```
deploy/
├── schema.sql        ← Tüm CREATE TABLE tanımları
├── seed.sql          ← Örnek veriler (7 ajan, 3 proje, 2 run)
├── init_manual.sql   ← DB + kullanıcı oluşturma (Docker olmadan)
├── docker-compose.yml← PostgreSQL Docker Compose
├── .env.example      ← Ortam değişkenleri şablonu
├── setup.sh          ← Tam otomatik kurulum scripti
└── README.md         ← Bu dosya
```

---

## Tablolar

| Tablo | Açıklama |
|-------|----------|
| `agents` | AI ajan tanımları (model, sıcaklık, rol) |
| `projects` | Projeler + birikimli JSONB hafıza |
| `runs` | Her pipeline çalıştırması |
| `run_logs` | Ajan log satırları (info/think/file/output/error) |
| `project_files` | Ajanların yazdığı dosyalar (versiyonlu) |
| `snapshots` | ZIP tabanlı checkpoint'ler |
| `activity` | Sistem geneli etkinlik akışı |
| `cli_history` | Terminal komut geçmişi |

---

## API Endpointleri

```
GET    /api/healthz
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
PATCH  /api/projects/:id/memory
GET    /api/projects/:id/files
GET    /api/projects/:id/files/:fileId

GET    /api/agents
POST   /api/agents
GET    /api/agents/:id
PUT    /api/agents/:id
DELETE /api/agents/:id

POST   /api/runs
GET    /api/runs
GET    /api/runs/:id
DELETE /api/runs/:id        (iptal)

GET    /api/snapshots
POST   /api/snapshots
GET    /api/snapshots/:id
DELETE /api/snapshots/:id
POST   /api/snapshots/:id/rollback

GET    /api/workspace
GET    /api/workspace/file?path=...

GET    /api/stats
GET    /api/activity

POST   /api/cli             (terminal REPL)
GET    /api/cli/history

WS     /api/ws              (gerçek zamanlı olaylar)
```

---

## CLI Komutları (Terminal Sayfasından)

```
help                          → Yardım
status                        → Sistem özeti
list projects                 → Tüm projeler
list agents                   → Tüm ajanlar
list runs [projectName]       → Run listesi
list files [projectName]      → Ajan dosyaları
memory <projectName>          → Proje hafızası
show <projectName>            → Proje detayı
```

---

## WebSocket Olayları

```javascript
const ws = new WebSocket('ws://localhost:8080/api/ws');

ws.onmessage = (e) => {
  const { event, data } = JSON.parse(e.data);
  // event: "run_started" | "run_completed" | "run_log"
  //        | "file_written" | "snapshot_created" | "memory_updated"
};
```

---

## Sıfırlama (Veritabanını Temizle)

```bash
# Tabloları sil ve yeniden oluştur
psql -U swarm -d swarm_ctrl -f deploy/schema.sql

# Örnek veriyi yeniden yükle
psql -U swarm -d swarm_ctrl -f deploy/seed.sql
```

---

## Sorun Giderme

### "DATABASE_URL tanımlı değil"
`.env` dosyasını oluşturun: `cp deploy/.env.example .env`

### "Port 5432 zaten kullanımda"
`docker compose -f deploy/docker-compose.yml down` ile Docker container'ı durdurun.

### "pnpm: command not found"
`npm install -g pnpm` ile yükleyin.

### Şema değişikliklerini production'a uygulama
```bash
DATABASE_URL=<production_url> pnpm --filter @workspace/db run push
```
