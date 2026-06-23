# SWARM_CTRL — AI Geliştirme Platformu

Üç bileşenden oluşan bir AI geliştirme ortamı:

| Bileşen | Nedir | Nasıl Çalışır |
|---|---|---|
| **Server API** | Tüm model çağrıları buradan geçer | `artifacts/api-server` |
| **Web Studio** | Tarayıcıdan AI ile çalış | `artifacts/studio` |
| **CLI** | Terminal / VSCode'dan AI ile çalış | `lib/cli` |

---

## Hızlı Başlangıç

### 1. Bağımlılıkları kur

```bash
pnpm install
```

### 2. Veritabanı şemasını uygula

```bash
pnpm --filter @workspace/db run push
```

### 3. API sunucusunu başlat

```bash
pnpm --filter @workspace/api-server run dev
```

Sunucu `PORT` ortam değişkeninde belirtilen portta çalışır (varsayılan: 8080).

### 4. Web Studio'yu başlat

```bash
pnpm --filter @workspace/studio run dev
```

Tarayıcıdan `http://localhost:<PORT>` adresine git.

---

## CLI Kullanımı

CLI, API sunucusuna HTTP üzerinden bağlanır.

### Kurulum

```bash
# CLI'yı derle (bir kez)
cd lib/cli && node build.mjs
```

### Sunucu URL'sini ayarla (bir kez)

```bash
node lib/cli/dist/cli.mjs config http://localhost:8080
```

Ayar `~/.swarm-ctrl.json` dosyasına kaydedilir.

### Komutlar

```bash
# İnteraktif REPL modu (Enter tuşuna bas ve yaz)
node lib/cli/dist/cli.mjs

# Tek komut modu
node lib/cli/dist/cli.mjs status
node lib/cli/dist/cli.mjs "list projects"
node lib/cli/dist/cli.mjs "list agents"
node lib/cli/dist/cli.mjs "list runs"

# AI ile sohbet
node lib/cli/dist/cli.mjs chat "Express.js ile auth sistemi yaz"
node lib/cli/dist/cli.mjs ask "Bu projenin amacı ne?"

# Belirli bir ajanla konuş
node lib/cli/dist/cli.mjs "agent chat backend_agent Zod ile schema doğrula"

# Model durumunu gör
node lib/cli/dist/cli.mjs models

# Metni sıkıştır (token tasarrufu)
node lib/cli/dist/cli.mjs "compress <uzun metin buraya>"

# Proje bağlamıyla çalış
node lib/cli/dist/cli.mjs config http://localhost:8080 projem
node lib/cli/dist/cli.mjs chat "Projedeki dosyaları gözden geçir"
```

### VSCode'da Kullanım

1. Terminal → New Terminal
2. `node /path/to/lib/cli/dist/cli.mjs` komutunu çalıştır
3. İnteraktif REPL açılır

### CMD (Windows) Kullanımı

```cmd
node C:\path\to\lib\cli\dist\cli.mjs
```

---

## API Server

### Model Ekleme / Çıkarma

`/api/models` endpoint'i üzerinden tüm model yönetimi yapılır.

Desteklenen sağlayıcılar:

| Sağlayıcı | URL | Ücretsiz Plan |
|---|---|---|
| **Ollama** | localhost:11434 | Evet (yerel) |
| **Groq** | console.groq.com | Evet |
| **OpenRouter** | openrouter.ai | Evet (bazı modeller) |
| **Gemini** | aistudio.google.com | Evet |
| **OpenAI** | platform.openai.com | Hayır |
| **Anthropic** | console.anthropic.com | Hayır |
| **Mistral** | console.mistral.ai | Hayır |

### Yerel Model (Ollama)

```bash
# Ollama kur
ollama serve

# Model indir
ollama pull qwen2.5-coder:7b

# CLI'dan kullan
node lib/cli/dist/cli.mjs config http://localhost:8080
node lib/cli/dist/cli.mjs chat "merhaba"
```

### API Dokümantasyonu

Sunucu çalışırken: `http://localhost:8080/api/docs`

### Önemli Endpoint'ler

```
POST /api/cli          → CLI komutları
POST /api/chat/:id/message → AI sohbet
GET  /api/models/config → Model yapılandırması
GET  /api/agents       → Ajan listesi
POST /api/runs         → Pipeline başlat
GET  /api/projects     → Proje listesi
```

---

## Token Sıkıştırma

`@workspace/compressor` paketi tüm model çağrılarına otomatik takılıdır.

**Ne yapar:**
- Her model çağrısından önce kullanıcı mesajlarını sıkıştırır
- JSON'ları minify eder
- Tekrar eden logları ve pattern'leri kaldırır
- Markdown formatlamasını sadeleştirir
- Konsola tasarruf yüzdesini yazar

**Kendi kodundan kullanmak için:**

```typescript
import { compressMessages, compressContext, compressFull } from "@workspace/compressor";

// LLM mesajı dizisini sıkıştır
const { messages, stats } = compressMessages(messages, { logStats: true });

// Tek bir string'i sıkıştır (RAG chunk, tool output, dosya içeriği)
const compressed = compressContext(longText, { level: "aggressive" });

// Detaylı sonuç
const result = compressFull(text, "aggressive", 20);
console.log(`${result.originalTokens} → ${result.compressedTokens} token (-${result.savedPercent.toFixed(1)}%)`);
```

---

## Proje Yapısı

```
/
├── artifacts/
│   ├── api-server/         # Express API sunucusu (tüm model çağrıları)
│   ├── studio/             # Web AI Studio (chat, dosyalar, projeler)
│   ├── swarm-ui/           # Agent dashboard
│   └── token-compressor/   # Token sıkıştırma demo arayüzü
├── lib/
│   ├── cli/                # Terminal CLI aracı
│   ├── compressor/         # Token sıkıştırma kütüphanesi
│   ├── db/                 # Veritabanı şeması (Drizzle + PostgreSQL)
│   ├── api-spec/           # OpenAPI şeması
│   ├── api-zod/            # Zod doğrulama şemaları
│   └── api-client-react/   # React Query hooks
└── README.md
```

---

## Ortam Değişkenleri

| Değişken | Açıklama | Zorunlu |
|---|---|---|
| `DATABASE_URL` | PostgreSQL bağlantı URL'si | Evet |
| `PORT` | Sunucu portu | Evet (API server) |
| `WORKSPACE_ROOT` | Ajan dosya çıktı dizini | Hayır (varsayılan: /tmp/swarm_workspace) |
| `SWARM_SERVER` | CLI için sunucu URL'si | Hayır (varsayılan: http://localhost:8080) |
| `SWARM_PROJECT` | CLI için varsayılan proje adı | Hayır |

---

## Geliştirici Notları

- **Tüm model çağrıları** `artifacts/api-server/src/lib/llm.ts` üzerinden geçer
- **Token sıkıştırma** her çağrıda otomatik çalışır — 100 token altı mesajlara uygulanmaz
- **Veritabanı** Drizzle ORM ile yönetilir; şema değişikliğinde `pnpm --filter @workspace/db run push` çalıştır
- **CLI** derleme gerektirir: `cd lib/cli && node build.mjs`
- **WebSocket** bağlantısı `ws://localhost:8080/api/ws` adresindedir — canlı olaylar (run_log, file_written, vb.) buradan gelir
