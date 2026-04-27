# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LongJohn is a self-hosted Node.js/React media server for movies, TV shows, and audiobooks. It runs on Raspberry Pi or Windows with PostgreSQL storage. **No built-in authentication** — assumes a trusted private network.

## Commands

```bash
# Backend
npm start                # Start Express server via pm2 (auto-restarts on crash)
npm run updateDB         # Reset database tables (WARNING: force:true drops all data)
npm run client           # Serve frontend static files on port 80

# Frontend (run from app/ directory)
cd app && npm start      # Webpack dev server on port 3033 with hot reload
cd app && npm run build  # Production bundle to app/public/

# Testing
npx jasmine              # Backend tests (Jasmine)

# pm2 management
npx pm2 logs longjohn    # View server logs
npx pm2 restart longjohn # Restart server
npx pm2 stop longjohn    # Stop server
```

Development requires two terminals: backend (`npm start` from root) and frontend (`cd app && npm start`).

## Architecture

**Backend** (`server/`): Express REST API with Sequelize ORM on PostgreSQL.
- Entry point: `server/server.js`
- API routes versioned at `/api/v1/` via custom router (`server/util/router.js`)
- Domain modules each have their own model + routes file: `movie/`, `tv/`, `audioBooks/`, `scanner/`
- TV shows reuse the `movie` model/table (filtered by `genre` field containing 'TV')
- Streaming uses HTTP 206 range requests (`server/streaming/streamers.js`)
- Configuration lives in `server/util/config.js` (user-created, not committed) — contains DB creds, API keys, media folder paths

**Frontend** (`app/`): React 18 + Material UI + Emotion, bundled with Webpack.
- Entry: `app/src/index.jsx` → `app/src/app.jsx` (hash-based SPA routing)
- `BASE_HOST` env var (injected at build time via Webpack DefinePlugin) points to the backend API
- Production builds require updating `BASE_HOST` in `app/package.json` to the server's IP
- Pages: `movies.jsx`, `tv.jsx`, `audiobooks.jsx`, `moviePlayer.jsx`, `admin.jsx`
- Custom dark/hacker theme in `styles.jsx`

**Database**: PostgreSQL with three tables:
- `movie` — movies and TV episodes (soft delete via `paranoid: true`, JSONB `imdb` field for OMDb metadata)
- `audioBook` — audiobooks (JSONB `info` field for Google Books metadata)
- `category` — seeded with: Scifi, Drama, Comedy, Action, TV, Kids

## Key Patterns

- All Sequelize models use `paranoid: true` (soft delete) and `freezeTableName: true`
- Bluebird promises used for `Promise.map()` and `Promise.reduce()` in scanner/setup code
- Cross-platform path handling: detects OS for correct path separators
- Cover art auto-downloaded from OMDb (movies) and Google Books (audiobooks) to the configured cover folder
- Audiobook ZIP downloads are cached on disk inside the audiobook's folder to avoid re-zipping
- VTT subtitles must share the exact filename as their video file

## Deployment

Production runs on Raspberry Pi with a crontab entry for auto-start:
```
@reboot sh -c 'cd /home/pi/Documents/dev/longjohn && npm start'
```
