# LongJohn Media Server

> **Self‑hosted Node.js / React media server for Raspberry Pi or Windows**
>
> **Security notice:** LongJohn has *no built‑in authentication*. Run it **only on a trusted private network**.

---

## Features

| Category       | Details                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| **Video**      | Streams MP4 (H.264/H.265) with VTT subtitles to any modern browser        |
| **Audiobooks** | Navigates multi‑level folder structures                                   |
| **Metadata**   | Auto‑fetches movie data from **OMDb** and book data from **Google Books** |
| **Indexing**   | Scans your library and stores results in PostgreSQL                       |

---

## Requirements

* **Node.js 18 +** (includes **npm**)
* **PostgreSQL 13 +** (tested on 15)
* (Optional) **pgAdmin** – GUI for PostgreSQL
* A folder containing your movies / audiobooks (ext4, NTFS, etc.)

---

## Quick start

```bash
# Clone & install
mkdir -p ~/Documents && cd ~/Documents
git clone <repo‑url> longjohn && cd longjohn
npm install
```

### 1 ▪ Configure PostgreSQL & API keys

1. Create a database (e.g. `longjohn`) in pgAdmin or via `psql`.
2. Copy **`server/util/config.js.example` → `server/util/config.js`** and fill in:

```js
module.exports = {
  db: {
    host: 'localhost', port: 5432,
    user: 'pi', password: 'secret', database: 'longjohn'
  },
  omdbApiKey: 'XXXX',              // https://www.omdbapi.com/
  googleBooksApiKey: 'XXXX',       // https://developers.google.com/books
  mediaPaths: [
    '/media/movies',
    '/media/audiobooks'
  ]
};
```

3. On Linux, grant read permission to the media folders:

```bash
sudo chmod -R 0755 /media
```

### 2 ▪ Initialise tables

```bash
npm run updateDB       # creates tables & seeds metadata
```

### 3 ▪ Launch the server

```bash
npm start              # default: http://<host>:3000/api
```

Add an *@reboot* cron entry so it starts on boot:

```cron
@reboot /usr/bin/node /home/pi/Documents/longjohn/server.js >> /var/log/longjohn.log 2>&1
```

---

## Front‑end (React SPA)

LongJohn ships with a pre‑configured React client.

### Option A – Express static (zero‑config)

```bash
cd app
npm install
npm run build      # outputs to app/public
node client.js     # serves React bundle on http://<host>:8080
```

During development use `npm start` for Webpack Dev Server.

**Tip:** edit `app/package.json` → `scripts.build` to hard‑code your API host:

```json
"build": "webpack --mode production --env BASE_HOST=http://<SERVER_IP>:4000"
```

### Option B – Nginx (production)

1. `sudo apt-get install nginx`
2. Copy `app/public` → `/var/www/longjohn`
3. `/etc/nginx/sites-available/longjohn`:

```
server {
    listen 80;
    server_name media.local;

    root /var/www/longjohn;
    try_files $uri /index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_set_header Host $host;
    }
}
```

4. Enable & reload:

```bash
sudo ln -s /etc/nginx/sites-available/longjohn /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Directory layout

```
longjohn/
├── app/             # React client
├── server/          # Express API + utilities
├── media/           # your movie & audiobook folders
└── README.md
```

---

## Troubleshooting

| Symptom                | Fix                                                                        |
| ---------------------- | -------------------------------------------------------------------------- |
| **Tables not created** | Check DB credentials in `server/util/config.js`; rerun `npm run updateDB`. |
| **Media not found**    | Verify `mediaPaths` entries and filesystem permissions (`chmod`).          |
| **Subtitles missing**  | Ensure `.vtt` file name matches movie file name.                           |

---

## Roadmap

* User authentication & roles
* HLS/DASH adaptive streaming
* Docker image & compose file

---

## License

MIT © 2025 Kevin Batchelor
