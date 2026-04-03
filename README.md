# Rejeki MCP Server

AI-powered personal finance agent built with the MCP SDK and SQLite. Implements envelope budgeting — setiap rupiah punya tugasnya masing-masing.

Didesain untuk dipakai di **claude.ai** sebagai MCP integration.

---

## Arsitektur

```
claude.ai
   │
   ▼ HTTPS
Nginx (reverse proxy)
   ├── /rejeki/mcp/   → Rejeki MCP Server  (port 8001)
   └── /rejeki/auth/  → Rejeki Auth Server (port 9004)
```

Dua proses berjalan di belakang Nginx:
- **MCP Server** (`server.py`) — tools untuk transaksi, envelope, rekening
- **Auth Server** (`auth_server.py`) — OAuth 2.1 dengan login form berbasis `users.json`

---

## Setup Lokal (Development)

### 1. Clone & install dependencies

```bash
git clone https://github.com/maulairfani/rejeki-mcp-server.git
cd rejeki-mcp-server
pip install -e .
```

### 2. Buat file `.env`

```bash
cp .env.example .env
```

Untuk development lokal, cukup set dua variabel ini di `.env`:

```env
TEST_TOKEN=token-rahasia-bebas
TEST_DB=./users/test.db
```

### 3. Seed test user & data

```bash
python scripts/seed_test_user.py
```

Ini akan membuat `users/test.db` berisi 3 bulan data keuangan (Jan–Mar 2025) dan mendaftarkan user `testuser` ke `users.json`.

### 4. Jalankan MCP server

```bash
python -m rejeki.server
# atau
rejeki
```

Server berjalan di `http://localhost:8001`. Test dengan:

```bash
curl http://localhost:8001/health
```

### 5. Konek ke claude.ai (lokal)

Gunakan MCP Inspector atau tambahkan ke claude desktop config dengan `TEST_TOKEN`.

---

## Setup VPS

### Prasyarat

- Ubuntu 22.04+
- Python 3.11+
- Nginx + Certbot (TLS)
- Domain dengan DNS mengarah ke VPS

### 1. Clone repo

```bash
cd /root  # atau direktori pilihan
git clone https://github.com/maulairfani/rejeki-mcp-server.git
cd rejeki-mcp-server
pip install -e .
```

### 2. Buat `users.json`

```bash
cp users.example.json users.json
```

Edit `users.json` — isi username, password, dan path ke SQLite file user:

```json
{
  "irfani": {
    "password": "password-kamu",
    "db": "/root/rejeki-mcp-server/users/irfani.db"
  }
}
```

Buat direktori untuk database user:

```bash
mkdir -p users
```

### 3. Buat file `.env`

```bash
cp .env.example .env
```

Isi `.env` sesuai domain kamu:

```env
MCP_BASE_URL=https://domain-kamu.com/rejeki/mcp
AS_BASE_URL=https://domain-kamu.com/rejeki/auth
INTROSPECT_URL=http://127.0.0.1:9004/introspect
USERS_CONFIG=/root/rejeki-mcp-server/users.json
PORT=8001
AUTH_PORT=9004
```

### 4. Buat systemd service untuk Auth Server

```bash
nano /etc/systemd/system/rejeki-auth.service
```

```ini
[Unit]
Description=Rejeki Auth Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/rejeki-mcp-server
EnvironmentFile=/root/rejeki-mcp-server/.env
ExecStart=/usr/bin/python3 /root/rejeki-mcp-server/auth_server.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 5. Buat systemd service untuk MCP Server

```bash
nano /etc/systemd/system/rejeki-mcp.service
```

```ini
[Unit]
Description=Rejeki MCP Server
After=network.target rejeki-auth.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/rejeki-mcp-server
EnvironmentFile=/root/rejeki-mcp-server/.env
ExecStart=/usr/bin/python3 -m rejeki.server
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 6. Aktifkan & jalankan service

```bash
systemctl daemon-reload
systemctl enable rejeki-auth rejeki-mcp
systemctl start rejeki-auth rejeki-mcp

# Cek status
systemctl status rejeki-auth
systemctl status rejeki-mcp
```

### 7. Konfigurasi Nginx

Tambahkan blok berikut ke dalam `server { ... }` di config Nginx kamu (biasanya `/etc/nginx/sites-enabled/default`):

```nginx
# Rejeki MCP Server
location /rejeki/mcp/ {
    proxy_pass http://127.0.0.1:8001/mcp/;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header Mcp-Session-Id $http_mcp_session_id;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 600s;
    add_header Access-Control-Expose-Headers "Mcp-Session-Id";
}

# Rejeki Auth Server
location /rejeki/auth/ {
    proxy_pass http://127.0.0.1:9004/;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# OAuth discovery untuk Rejeki (claude.ai membutuhkan ini di root)
location /.well-known/oauth-protected-resource/rejeki {
    proxy_pass http://127.0.0.1:8001/mcp/.well-known/oauth-protected-resource;
    proxy_set_header Host $http_host;
}
```

Test dan reload Nginx:

```bash
nginx -t && systemctl reload nginx
```

### 8. Tambah ke claude.ai

1. Buka **claude.ai → Settings → Integrations → Add**
2. Masukkan URL: `https://domain-kamu.com/rejeki/mcp/`
3. Login dengan username & password dari `users.json`

---

## Manajemen User

### Tambah user baru

Edit `scripts/add_user.py`, ubah `USERNAME`, `PASSWORD`, dan `DB_PATH`, lalu jalankan:

```bash
python scripts/add_user.py
```

Atau edit `users.json` langsung:

```json
{
  "username_baru": {
    "password": "passwordnya",
    "db": "/root/rejeki-mcp-server/users/username_baru.db"
  }
}
```

> Perubahan `users.json` langsung aktif tanpa restart service.

### Seed data awal untuk user baru

Gunakan MCP tool `finance_add_account` dan `finance_add_envelope` melalui claude.ai, atau buat script seed sendiri mengacu ke `scripts/seed_test_user.py`.

---

## Update Deployment

```bash
cd /root/rejeki-mcp-server
git pull
systemctl restart rejeki-auth rejeki-mcp
```

---

## Troubleshooting

```bash
# Lihat log realtime
journalctl -u rejeki-mcp -f
journalctl -u rejeki-auth -f

# Cek apakah service jalan
systemctl status rejeki-mcp rejeki-auth

# Test endpoint langsung (bypass Nginx)
curl http://localhost:8001/health
curl -X POST http://localhost:9004/introspect -d "token=test"
```
