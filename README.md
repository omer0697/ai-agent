# AI Agent — Şirket İçi LLM Kodlama Asistanı

Şirket içi LLM gateway'ine bağlanan, dosya okuma/yazma yetkisine sahip bir kodlama asistanı.  
VS Code extension'a benzer bir arayüzle: sol panel dosya ağacı, orta panel kod editörü, sağ panel AI chat.

![Mimari](https://img.shields.io/badge/Backend-Spring%20Boot%203.2-brightgreen) ![Frontend](https://img.shields.io/badge/Frontend-React%2018-blue) ![Deploy](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED)

---

## Özellikler

- **LLM Gateway Entegrasyonu** — OpenAI uyumlu endpoint, Bearer token auth, SSE streaming
- **Dosya Ağacı** — Windows yolu girerek projeyi aç, klasörleri genişlet, dosyalara tıkla
- **Kod Editörü** — Dosya içeriğini görüntüle ve düzenle, `Ctrl+S` ile kaydet
- **AI Bağlamı** — Açık dosyaları tek tıkla AI'ya tanıt (system prompt'a ekler)
- **Otomatik Dosya Düzenleme** — AI'ın önerdiği değişiklikler "Dosyaya Uygula" butonuyla anında uygulanır
- **Self-signed SSL** — Şirket içi sertifikalara otomatik izin verir

---

## Gereksinimler

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows)
- Docker Desktop → Settings → Resources → **File Sharing** → `C:\` eklenmeli

---

## Kurulum ve Çalıştırma

```bash
# 1. Repoyu klonla
git clone https://github.com/omer0697/ai-agent.git
cd ai-agent

# 2. İlk kurulumda image'ları build et (5-10 dk, sadece bir kere)
docker compose build

# 3. Başlat
docker compose up -d
```

Tarayıcıda aç: **http://localhost:3000**

### Diğer Komutlar

```bash
docker compose down          # Durdur
docker compose logs -f       # Tüm loglar
docker compose logs -f backend   # Sadece backend logları

# Kod değişikliği sonrası
docker compose build backend && docker compose up -d
docker compose build frontend && docker compose up -d
```

---

## Kullanım

### 1. Bağlantı

Login ekranında doldurulacak alanlar:

| Alan | Örnek |
|---|---|
| Gateway URL | `https://your-llm-gateway.company.com` |
| Chat Endpoint Path | `/v1/chat/completions` |
| Model | `gpt-4` |
| Kullanıcı Adı | `kullanici_adi` |
| Şifre | `****` |

### 2. Proje Açma

Sol paneldeki kutuya Windows yolu girin ve `→` butonuna basın:

```
C:\Users\omer\proje
```

### 3. Dosya Düzenleme

- Dosya ağacından herhangi bir dosyaya tıklayın → ortada editörde açılır
- Değişiklik yapın → `Ctrl+S` veya "Kaydet" butonuna tıklayın

### 4. AI ile Çalışma

- **"+ Bağlama Ekle"** — Açık dosyayı AI'nın görebileceği bağlama ekler
- Sağ panelde sorunuzu yazın, `Enter` ile gönderin
- AI bir dosyayı değiştirmek istediğinde **"Dosyaya Uygula"** butonu çıkar, tıklayınca gerçek dosyaya yazar

---

## Mimari

```
┌─────────────────────────────────────────────────┐
│                  Docker Compose                  │
│                                                  │
│  ┌──────────────┐        ┌───────────────────┐  │
│  │   Frontend   │        │     Backend       │  │
│  │ React + Vite │──/api/→│  Spring Boot 3.2  │  │
│  │ Nginx :3000  │        │  Tomcat :8080     │  │
│  └──────────────┘        └────────┬──────────┘  │
│                                   │              │
│                           ┌───────▼────────┐    │
│                           │  LLM Gateway   │    │
│                           │  (Şirket İçi)  │    │
│                           └────────────────┘    │
│                                   │              │
│                     Volume Mount: C:\ → /c_drive │
└─────────────────────────────────────────────────┘
```

### Backend API

| Method | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/api/auth/login` | Gateway'den token al |
| `POST` | `/api/chat/stream` | SSE ile streaming chat |
| `GET` | `/api/files/tree?path=...` | Dosya ağacı |
| `GET` | `/api/files/content?path=...` | Dosya içeriği oku |
| `PUT` | `/api/files/content` | Dosya içeriği yaz |

### AI Dosya Düzenleme Formatı

AI, dosya değişikliğini şu XML formatıyla bildirir:

```xml
<file_edit path="C:\Users\omer\proje\Service.java">
// dosyanın tam yeni içeriği buraya gelir
</file_edit>
```

---

## Proje Yapısı

```
ai-agent/
├── docker-compose.yml
├── CLAUDE.md                        # Claude Code için dokümantasyon
├── backend/
│   ├── Dockerfile
│   └── src/main/java/com/aiagent/
│       ├── config/
│       │   ├── WebConfig.java       # CORS
│       │   └── WebClientConfig.java # SSL bypass
│       ├── controller/              # Auth, Chat, File endpoint'leri
│       ├── service/
│       │   ├── LLMService.java      # SSE proxy
│       │   └── FileService.java     # Dosya işlemleri + Windows path çevirimi
│       └── model/                   # Request/Response modelleri
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── api/index.js             # fetch + SSE client
        └── components/
            ├── Login.jsx
            ├── FileTree.jsx
            ├── FileEditor.jsx
            └── ChatPanel.jsx
```
