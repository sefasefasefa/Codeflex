#!/usr/bin/env bash
# ============================================================
# SWARM_CTRL — Kurulum ve Başlatma Scripti
# Kullanım: chmod +x setup.sh && ./setup.sh
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

log()    { echo -e "${CYAN}[setup]${RESET} $*"; }
ok()     { echo -e "${GREEN}[ok]${RESET} $*"; }
warn()   { echo -e "${YELLOW}[warn]${RESET} $*"; }
error()  { echo -e "${RED}[error]${RESET} $*"; exit 1; }
header() { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}\n"; }

# ─── Ön Koşul Kontrolleri ──────────────────────────────────
header "Ön Koşul Kontrolleri"

command -v node   >/dev/null 2>&1 || error "Node.js bulunamadı. https://nodejs.org adresinden kurun."
command -v pnpm   >/dev/null 2>&1 || error "pnpm bulunamadı. 'npm install -g pnpm' ile kurun."
command -v psql   >/dev/null 2>&1 || warn  "psql bulunamadı. Docker Compose kullanılacak."
command -v docker >/dev/null 2>&1 && HAS_DOCKER=true || HAS_DOCKER=false

NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -ge 20 ] || error "Node.js 20+ gerekli. Mevcut: $(node --version)"

ok "Node.js $(node --version)"
ok "pnpm $(pnpm --version)"

# ─── .env Dosyası ──────────────────────────────────────────
header ".env Yapılandırması"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/deploy/.env.example" "$ROOT/.env"
  ok ".env dosyası oluşturuldu — lütfen değerleri düzenleyin"
  warn "DATABASE_URL değerini ayarlamayı unutmayın!"
else
  ok ".env dosyası zaten mevcut"
fi

# .env'yi yükle
set -a
source "$ROOT/.env"
set +a

# ─── Veritabanı ────────────────────────────────────────────
header "Veritabanı Kurulumu"

if [ -z "${DATABASE_URL:-}" ]; then
  error "DATABASE_URL tanımlı değil. .env dosyasını düzenleyin."
fi

# Docker Compose ile otomatik kurulum
if $HAS_DOCKER && [ -f "$ROOT/deploy/docker-compose.yml" ]; then
  log "Docker Compose ile PostgreSQL başlatılıyor..."
  docker compose -f "$ROOT/deploy/docker-compose.yml" up -d --wait
  sleep 2
  ok "PostgreSQL başlatıldı (Docker)"
else
  warn "Docker bulunamadı. Manuel PostgreSQL bağlantısı kullanılacak."
  log "Bağlantı test ediliyor: $DATABASE_URL"
  psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1 || error "Veritabanına bağlanılamadı. DATABASE_URL değerini kontrol edin."
  ok "Veritabanı bağlantısı başarılı"
fi

# ─── Bağımlılıklar ─────────────────────────────────────────
header "Bağımlılıkların Yüklenmesi"

log "pnpm install çalışıyor..."
cd "$ROOT"
pnpm install --frozen-lockfile
ok "Bağımlılıklar yüklendi"

# ─── DB Schema Push ────────────────────────────────────────
header "Veritabanı Şeması"

log "Drizzle şeması uygulanıyor..."
pnpm --filter @workspace/db run push
ok "Şema uygulandı"

# ─── OpenAPI Codegen ───────────────────────────────────────
header "Kod Üretimi (OpenAPI)"

log "API istemcisi oluşturuluyor..."
pnpm --filter @workspace/api-spec run codegen
ok "Kod üretimi tamamlandı"

# ─── Workspace Dizini ──────────────────────────────────────
header "Workspace Dizini"

WORKSPACE="${WORKSPACE_ROOT:-/tmp/swarm_workspace}"
mkdir -p "$WORKSPACE"
ok "Workspace dizini: $WORKSPACE"

# ─── API Server Build ──────────────────────────────────────
header "API Server"

log "API server build ediliyor..."
pnpm --filter @workspace/api-server run build
ok "API server build tamamlandı"

# ─── Özet ──────────────────────────────────────────────────
header "Kurulum Tamamlandı"

echo -e "${GREEN}${BOLD}Sistem hazır! Başlatmak için:${RESET}"
echo ""
echo -e "  ${CYAN}# API Server başlat (terminal 1)${RESET}"
echo -e "  pnpm --filter @workspace/api-server run dev"
echo ""
echo -e "  ${CYAN}# Frontend başlat (terminal 2)${RESET}"
echo -e "  pnpm --filter @workspace/swarm-ui run dev"
echo ""
echo -e "  ${CYAN}# Veya ikisini aynı anda başlat${RESET}"
echo -e "  pnpm run dev"
echo ""
echo -e "  ${CYAN}# Tarayıcıda aç${RESET}"
echo -e "  http://localhost:5173"
echo ""
echo -e "  ${CYAN}# API endpoint${RESET}"
echo -e "  http://localhost:8080/api"
echo ""
echo -e "  ${CYAN}# WebSocket${RESET}"
echo -e "  ws://localhost:8080/api/ws"
echo ""
