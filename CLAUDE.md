# AI Agent — CLAUDE.md

Şirket içi LLM gateway'ine bağlanan, dosya düzenleme yetkisi olan kodlama asistanı.

## Mimari

```
frontend (React + Vite → Nginx :3000)
    │  /api/* → proxy
backend (Spring Boot :8080)
    │  Windows dosya sistemi
    └── /c_drive/ (Docker volume: C:\ mount)
```

## Çalıştırma

```bash
# İlk kurulum veya kod değişikliği sonrası
docker compose build

# Başlat (arkaplanda)
docker compose up -d

# Durdur
docker compose down

# Loglar
docker compose logs -f backend
docker compose logs -f frontend
```

Uygulama: **http://localhost:3000**

## Proje Yapısı

```
ai-agent/
├── docker-compose.yml          # C:\ → /c_drive mount içerir
├── backend/                    # Spring Boot 3.2 / Java 17
│   ├── Dockerfile
│   └── src/main/java/com/aiagent/
│       ├── config/
│       │   ├── WebConfig.java          # CORS
│       │   └── WebClientConfig.java    # SSL bypass (self-signed cert)
│       ├── controller/
│       │   ├── AuthController.java     # POST /api/auth/login
│       │   ├── ChatController.java     # POST /api/chat/stream (SSE)
│       │   └── FileController.java     # GET/PUT /api/files/*
│       ├── service/
│       │   ├── LLMService.java         # Gateway proxy + SSE forwarding
│       │   └── FileService.java        # Dosya oku/yaz + Windows path çevirimi
│       └── model/
└── frontend/                   # React 18 + Vite
    ├── Dockerfile
    ├── nginx.conf              # proxy_buffering off (SSE için kritik)
    └── src/
        ├── api/index.js        # fetch + ReadableStream ile SSE client
        └── components/
            ├── Login.jsx       # Gateway URL, chat path, model, kimlik bilgileri
            ├── FileTree.jsx    # Recursive dosya ağacı
            ├── FileEditor.jsx  # Textarea editör, Ctrl+S kaydet
            └── ChatPanel.jsx   # SSE streaming chat, dosya edit parser
```

## Önemli Tasarım Kararları

### Windows Path Çevirimi
`FileService.resolvePath()` Windows yollarını container içi yola çevirir:
- `C:\Users\omer\proje` → `/c_drive/Users/omer/proje`
- Docker Compose'da `C:\:/c_drive:rw` volume mount var
- Docker Desktop → Settings → Resources → File Sharing'de `C:\` açık olmalı

### SSE Forwarding
`LLMService.streamChat()` LLM gateway'den gelen SSE akışını frontend'e iletir:
- `data: {...}` satırlarını alır, `data: ` prefix'ini sıyırır
- Temiz JSON chunk'larını `SseEmitter` ile frontend'e gönderir
- `[DONE]` gelince stream'i kapatır

### AI Dosya Düzenleme Formatı
AI yanıtlarında dosya değişikliği şu XML formatıyla gelir:
```xml
<file_edit path="/c_drive/Users/omer/proje/Service.java">
// dosyanın tam yeni içeriği
</file_edit>
```
Frontend bu blokları parse eder, "Dosyaya Uygula" butonuyla `PUT /api/files/content` çağrılır.

### SSE + Nginx
`nginx.conf` içinde `/api/` için `proxy_buffering off` ve `proxy_read_timeout 300s` ayarlı. SSE akışı için bu zorunlu.

## LLM Gateway

- Auth: `POST {baseUrl}/api/auth/login` → `{"access_token": "...", "token_type": "bearer"}`
- Chat: `POST {baseUrl}/v1/chat/completions` (OpenAI uyumlu, `stream: true`)
- Self-signed SSL cert: `WebClientConfig` içinde `InsecureTrustManagerFactory` kullanılıyor

## Rebuild Ne Zaman Gerekir

| Değişiklik | Gereken Komut |
|---|---|
| Java / Spring Boot kodu | `docker compose build backend && docker compose up -d` |
| React kodu | `docker compose build frontend && docker compose up -d` |
| docker-compose.yml | `docker compose up -d` |
