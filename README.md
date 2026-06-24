# AI Geliştirme Platformu

Üç ana bileşenden oluşan bir yapay zeka geliştirme ortamı.

---

## Bileşenler

### 1. API Sunucusu (`artifacts/api-server`)

Tüm LLM çağrılarını, proje yönetimini ve ajan koordinasyonunu yöneten merkezi backend.

**Başlatma:**
```bash
pnpm --filter @workspace/api-server run dev
```

**API Dökümantasyonu:** Sunucu çalışırken `/api/docs` adresinden Swagger UI'ya erişilebilir.

**Temel Endpointler:**

| Endpoint | Açıklama |
|---|---|
| `GET /api/healthz` | Sunucu sağlık kontrolü |
| `GET/POST /api/projects` | Proje listesi / yeni proje oluştur |
| `GET/PUT/DELETE /api/projects/:id` | Proje detay / güncelle / sil |
| `PATCH /api/projects/:id/memory` | Proje hafıza bağlamını güncelle |
| `GET /api/projects/:id/files` | Proje dosyalarını listele |
| `GET /api/agents` | Ajan listesi |
| `GET/POST /api/runs` | Çalıştırma listesi / yeni çalıştırma |
| `DELETE /api/runs/:id` | Çalıştırmayı iptal et |
| `GET/POST /api/chat` | Konuşma listesi / yeni konuşma |
| `POST /api/chat/:id/message` | Konuşmaya mesaj gönder |
| `GET /api/models` | Mevcut model kaynakları |
| `POST /api/cli` | CLI komutu çalıştır |
| `GET /api/workspace` | Çalışma alanı dosyaları |
| `GET /api/stats` | Sistem istatistikleri |
| `GET /api/activity` | Son etkinlik akışı |
| `GET /api/auth/user` | Oturum açmış kullanıcı bilgisi |
| `GET /api/login` | Replit Auth ile giriş başlat |
| `GET /api/logout` | Oturumu kapat |

**Ortam Değişkenleri:**

| Değişken | Açıklama |
|---|---|
| `PORT` | Sunucu portu (zorunlu) |
| `DATABASE_URL` | PostgreSQL bağlantı dizesi (zorunlu) |
| `REPL_ID` | Replit kimliği — auth için otomatik sağlanır |

---

### 2. CLI Aracı (`lib/cli`)

Terminal üzerinden API sunucusuna bağlanan interaktif komut satırı arayüzü. VSCode terminali ve CMD'de çalışır.

**Derleme:**
```bash
cd lib/cli && node build.mjs
```

**Tek komut modu:**
```bash
node lib/cli/dist/cli.mjs status
node lib/cli/dist/cli.mjs list projects
node lib/cli/dist/cli.mjs create project "Proje Adı" "Açıklama"
node lib/cli/dist/cli.mjs chat "Merhaba!"
node lib/cli/dist/cli.mjs models
```

**İnteraktif REPL modu:**
```bash
node lib/cli/dist/cli.mjs
```

REPL içinde kullanılabilir komutlar:
```
status              → Sunucu durumunu kontrol et
list projects       → Projeleri listele
list agents         → Ajanları listele
list runs           → Çalıştırmaları listele
create project <ad> → Yeni proje oluştur
chat <mesaj>        → Yapay zeka ile sohbet et
models              → Mevcut modelleri listele
help                → Yardım göster
exit / quit         → Çık
```

**Sunucu adresi:**
CLI varsayılan olarak `http://localhost:8080` adresini kullanır. Farklı adres için:
```bash
API_URL=http://localhost:3000 node lib/cli/dist/cli.mjs
```

---

### 3. AI Studio (`artifacts/studio`)

Tarayıcı tabanlı yapay zeka geliştirme ortamı. CLI ile aynı işlevselliği sunan tam özellikli web uygulaması.

**Başlatma:**
```bash
pnpm --filter @workspace/studio run dev
```

**Özellikler:**
- Replit Auth ile güvenli giriş / çıkış
- Yapay zeka ile gerçek zamanlı sohbet
- Konuşma geçmişi ve yönetimi
- Proje oluşturma, düzenleme, silme
- Proje dosyalarını görüntüleme
- Ajan çalıştırmalarını takip etme
- Çalışma alanı dosya tarayıcı
- Tam Türkçe arayüz

**Sayfalar:**

| Adres | Açıklama |
|---|---|
| `/studio/` | Ana sayfa — giriş yoksa login ekranı |
| `/studio/chat` | Yapay zeka sohbet arayüzü |
| `/studio/chat/:id` | Belirli konuşma |
| `/studio/projects` | Proje listesi ve yönetimi |
| `/studio/projects/:id` | Proje detayı (dosyalar, çalıştırmalar) |
| `/studio/files` | Çalışma alanı dosya tarayıcı |
| `/studio/settings` | Ayarlar |

---

## Token Sıkıştırma (`lib/compressor`)

API sunucusu, 100 token'dan uzun kullanıcı mesajlarını otomatik sıkıştırır.

- LLM çağrıları daha az token kullanır
- Bağlam penceresi daha verimli kullanılır
- Sıkıştırma stratejileri: `aggressive`, `balanced`, `light`

---

## Kurulum

### Gereksinimler
- Node.js 20+
- pnpm
- PostgreSQL (Replit'te otomatik sağlanır)

### Adımlar

```bash
# 1. Bağımlılıkları yükle
pnpm install

# 2. Veritabanı şemasını uygula
pnpm --filter @workspace/db run push

# 3. API sunucusunu başlat
pnpm --filter @workspace/api-server run dev

# 4. Studio'yu başlat (ayrı terminalde)
pnpm --filter @workspace/studio run dev
```

---

## Mimari

```
workspace/
├── artifacts/
│   ├── api-server/          # Express.js backend — tüm API ve auth
│   │   ├── src/routes/      # API rotaları
│   │   ├── src/lib/         # LLM, auth, broadcast yardımcıları
│   │   └── src/middlewares/ # Auth middleware
│   └── studio/              # React + Vite web uygulaması
│       └── src/pages/       # Sayfa bileşenleri
├── lib/
│   ├── api-spec/            # OpenAPI spec (openapi.yaml)
│   ├── api-client-react/    # Orval üretimli React Query hook'ları
│   ├── api-zod/             # Orval üretimli Zod şemaları
│   ├── db/                  # Drizzle ORM + PostgreSQL şema
│   ├── compressor/          # Token sıkıştırma kütüphanesi
│   ├── replit-auth-web/     # Replit Auth React hook (useAuth)
│   └── cli/                 # CLI aracı
└── README.md                # Bu dosya
```

---

## Geliştirme Notları

- **API şema değişikliği:** `lib/api-spec/openapi.yaml` güncellendikten sonra `pnpm --filter @workspace/api-spec run codegen` çalıştırın.
- **DB şema değişikliği:** `lib/db/src/schema/` düzenlendikten sonra `pnpm --filter @workspace/db run push` çalıştırın.
- **CLI derlemesi:** `cd lib/cli && node build.mjs`
- **Auth:** Replit OpenID Connect kullanılır. `REPL_ID` otomatik sağlanır, ek yapılandırma gerekmez.
- **WebSocket:** Gerçek zamanlı log akışı için `wss://.../api/ws` adresine bağlanın.
