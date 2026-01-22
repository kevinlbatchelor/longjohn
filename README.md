# LongJohn Media Server

> **Self‑hosted Node.js / React media server for Raspberry Pi or Windows**
>
> **Security notice:** LongJohn has *no built‑in authentication*. Run it **only on a trusted private network**.

---

## Features

| Category       | Details                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| **Video**      | Streams MP4 (H.264/H.265) with VTT subtitles to any modern browser        |
| **TV Shows**   | Organizes TV series by show name with episode listings                    |
| **Audiobooks** | Navigates multi‑level folder structures                                   |
| **Metadata**   | Auto‑fetches movie data from **OMDb** and book data from **Google Books** |
| **Indexing**   | Scans your library and stores results in PostgreSQL                       |

---

## Tech Stack

| Component    | Technologies                                      |
| ------------ | ------------------------------------------------- |
| **Backend**  | Node.js, Express, Sequelize ORM, PostgreSQL       |
| **Frontend** | React 18, Material UI (MUI), Webpack              |
| **Testing**  | Jasmine (backend via console, frontend in browser)|

---

## Requirements

* **Node.js 18+** (includes **npm**)
* **PostgreSQL 13+** (tested on 15)
* (Optional) **pgAdmin** – GUI for PostgreSQL administration
* A folder containing your movies / audiobooks

---

## Project Structure

```
longjohn/
├── app/                    # React frontend application
│   ├── src/                # React source files (.jsx)
│   ├── public/             # Built bundle and index.html
│   ├── client.js           # Static file server for production
│   ├── webpack.config.js   # Webpack configuration
│   └── package.json        # Frontend dependencies
├── server/                 # Express backend API
│   ├── util/
│   │   ├── config.js       # Main configuration file (you create this)
│   │   └── database/
│   │       ├── db.js       # Sequelize database connection
│   │       └── dbSetup.js  # Table creation and seeding
│   ├── movie/              # Movie routes and data model
│   ├── tv/                 # TV show routes (shares movie model)
│   ├── audioBooks/         # Audiobook routes and data model
│   ├── scanner/            # Media library scanner
│   ├── streaming/          # Video/audio streaming utilities
│   └── server.js           # Express app entry point
├── package.json            # Root dependencies and npm scripts
└── README.md
```

---

## Backend Setup (Windows PowerShell)

### Step 1: Clone and Install Dependencies

Open PowerShell and run:

```powershell
cd C:\dev
git clone <repo-url> longjohn
cd longjohn
npm install
```

This installs all backend dependencies including:
- `express` - Web server framework
- `sequelize` - ORM for PostgreSQL
- `pg` - PostgreSQL client
- `axios` - HTTP client for API calls
- `lodash` - Utility library

### Step 2: Set Up PostgreSQL Database

1. **Install PostgreSQL** if not already installed (download from https://www.postgresql.org/download/windows/)

2. **Create a new database** using pgAdmin or psql:
   ```sql
   CREATE DATABASE movies;
   ```
   > **Note:** The default database name in the config is `movies`, not `longjohn`.

### Step 3: Create the Configuration File

Create the file `server/util/config.js` with your settings:

```javascript
// Windows paths example
const tvFolderName = 'TV';
const moviesPath = ['C:\\Users\\YourUsername\\Documents\\Movies'];
const audioBookPath = ['C:\\Users\\YourUsername\\Documents\\AudioBooks'];
const TV = ['C:\\Users\\YourUsername\\Documents\\' + tvFolderName];
const cover = 'C:\\Users\\YourUsername\\Documents\\Cover';

// Linux/Raspberry Pi paths example (commented out)
// const moviesPath = ['/media/pi/LongJohn/Movies'];
// const audioBookPath = ['/media/pi/LongJohn/Audio Books'];
// const TV = ['/media/pi/LongJohn/' + tvFolderName];
// const cover = '/media/pi/LongJohn/Covers';

const config = {
    omdbApiKey: '',           // Get from https://www.omdbapi.com/
    goog: '',                 // Google Books API key (https://developers.google.com/books)
    tvFolderName,
    database: {
        host: '127.0.0.1',
        port: 5432,
        name: 'movies',       // Database name you created in PostgreSQL
        username: 'postgres', // Your PostgreSQL username
        password: 'yourpassword'  // Your PostgreSQL password
    },
    server: {
        port: 3000            // Backend API will run on this port
    },
    movies: moviesPath,
    TV: TV,
    cover: cover,
    audioBooks: audioBookPath
};

module.exports = config;
```

**Configuration Options Explained:**

| Property | Description |
| -------- | ----------- |
| `omdbApiKey` | API key for fetching movie metadata from OMDb |
| `goog` | Google Books API key for audiobook metadata |
| `tvFolderName` | Name of the folder containing TV shows (used for path parsing) |
| `database.host` | PostgreSQL server address (use `127.0.0.1` for local) |
| `database.port` | PostgreSQL port (default: `5432`) |
| `database.name` | Name of your PostgreSQL database |
| `database.username` | PostgreSQL username |
| `database.password` | PostgreSQL password |
| `server.port` | Port the backend API runs on |
| `movies` | Array of paths to movie folders |
| `TV` | Array of paths to TV show folders |
| `cover` | Path to cover art storage folder |
| `audioBooks` | Array of paths to audiobook folders |

### Step 4: Initialize the Database Tables

Run the database setup command:

```powershell
npm run updateDB
```

This runs `server/updateDatabase.js`, which calls the setup function in `server/util/database/dbSetup.js`.

---

## How Database Tables Are Created (Sequelize sync)

LongJohn uses **Sequelize ORM** to define and create database tables. Instead of writing raw SQL, tables are defined as JavaScript objects (called "models") and Sequelize automatically generates the SQL to create them.

### How It Works

**1. Database Connection (`server/util/database/db.js`)**

First, Sequelize connects to PostgreSQL using your config settings:

```javascript
const db = require('sequelize');
const config = require('../util/config');

const connection = new db(
    config.database.name,      // database name
    config.database.username,  // postgres username
    config.database.password,  // postgres password
    {
        host: config.database.host,
        port: config.database.port,
        dialect: 'postgres',
        logging: false
    }
);
```

**2. Model Definitions (Schema Files)**

Each table is defined as a "model" using `connection.define()`. Here's how the movie table is defined in `server/movie/movie.js`:

```javascript
const db = require('../util/database/db');

const movieSchema = {
    name: { type: db.STRING, allowNull: false },
    description: { type: db.STRING },
    path: { type: db.STRING },
    rating: { type: db.STRING },
    genre: { type: db.STRING, default: 'ALL' },
    imdb: { type: db.JSONB }
};

const Movie = db.connection.define('movie', movieSchema, {
    paranoid: true,        // enables soft delete (deletedAt column)
    freezeTableName: true  // use exact table name, don't pluralize
});

module.exports = Movie;
```

The audiobook model (`server/audioBooks/audioBook.js`) follows the same pattern:

```javascript
const movieSchema = {
    name: { type: db.STRING, allowNull: false },
    track: { type: db.STRING },
    path: { type: db.STRING },
    info: { type: db.JSONB }
};

const Movie = db.connection.define('audioBook', movieSchema, {
    paranoid: true,
    freezeTableName: true
});
```

**3. Table Creation with sync() (`server/util/database/dbSetup.js`)**

The `dbSetup.js` file uses Sequelize's `sync()` method to create all tables:

```javascript
const db = require('./db');
const Category = require('../../movie/movieCategory');
const Movie = require('../../movie/movie');
const Audiobook = require('../../audioBooks/audioBook');

const setup = function () {
    console.log('set up database');
    return db.connection.sync({ force: true }).then(() => {
        return Category.updateFunction();
    }).catch((error) => {
        console.log(error, 'error');
    });
};

module.exports = setup;
```

**Key points about `sync()`:**

| Option | Behavior |
| ------ | -------- |
| `sync()` | Creates tables if they don't exist; leaves existing tables unchanged |
| `sync({ force: true })` | **Drops all tables first**, then recreates them (⚠️ destroys all data) |
| `sync({ alter: true })` | Alters existing tables to match the model (adds/removes columns) |

> **⚠️ Warning:** This project uses `force: true`, which means running `npm run updateDB` will **delete all existing data** and recreate empty tables.

**4. Seeding Default Data**

After tables are created, `Category.updateFunction()` seeds the category table with default values:

```javascript
const categories = [
    { id: 1, name: 'Scifi' },
    { id: 2, name: 'Drama' },
    { id: 3, name: 'Comedy' },
    { id: 4, name: 'Action' },
    { id: 5, name: 'TV' },
    { id: 6, name: 'Kids' }
];

Category.updateFunction = function () {
    return Promise.each(categories, (cat) => {
        return Category.upsert(cat);  // insert or update
    });
};
```

### What Sequelize Generates

When you run `npm run updateDB`, Sequelize generates and executes SQL like this:

```sql
-- Drop existing tables (force: true)
DROP TABLE IF EXISTS "movie" CASCADE;
DROP TABLE IF EXISTS "audioBook" CASCADE;
DROP TABLE IF EXISTS "category" CASCADE;

-- Create movie table
CREATE TABLE IF NOT EXISTS "movie" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "path" VARCHAR(255),
    "rating" VARCHAR(255),
    "genre" VARCHAR(255) DEFAULT 'ALL',
    "imdb" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "deletedAt" TIMESTAMP WITH TIME ZONE
);

-- Create audioBook table
CREATE TABLE IF NOT EXISTS "audioBook" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "track" VARCHAR(255),
    "path" VARCHAR(255),
    "info" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "deletedAt" TIMESTAMP WITH TIME ZONE
);

-- Create category table
CREATE TABLE IF NOT EXISTS "category" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL
);

-- Seed categories
INSERT INTO "category" ("id", "name") VALUES (1, 'Scifi') ON CONFLICT ("id") DO UPDATE SET "name" = 'Scifi';
-- ... more inserts
```

### Database Schema Summary

**The `movie` table** (also used for TV shows):
| Column | Type | Notes |
| ------ | ---- | ----- |
| id | SERIAL | Auto-generated primary key |
| name | VARCHAR(255) | Required |
| description | VARCHAR(255) | Optional |
| path | VARCHAR(255) | File system path to media |
| rating | VARCHAR(255) | Movie rating |
| genre | VARCHAR(255) | Default: 'ALL' |
| imdb | JSONB | Stores OMDb API response |
| createdAt | TIMESTAMP | Auto-managed by Sequelize |
| updatedAt | TIMESTAMP | Auto-managed by Sequelize |
| deletedAt | TIMESTAMP | Soft delete (paranoid mode) |

**The `audioBook` table:**
| Column | Type | Notes |
| ------ | ---- | ----- |
| id | SERIAL | Auto-generated primary key |
| name | VARCHAR(255) | Required |
| track | VARCHAR(255) | Track/chapter info |
| path | VARCHAR(255) | File system path |
| info | JSONB | Stores Google Books API response |
| createdAt | TIMESTAMP | Auto-managed by Sequelize |
| updatedAt | TIMESTAMP | Auto-managed by Sequelize |
| deletedAt | TIMESTAMP | Soft delete (paranoid mode) |

**The `category` table:**
| Column | Type | Notes |
| ------ | ---- | ----- |
| id | SERIAL | Primary key |
| name | VARCHAR(255) | Required |

---

### Step 5: Start the Backend Server

```powershell
npm start
```

The server will start on the port specified in your config (default: `http://localhost:3000`).

**Available npm scripts:**
| Script | Command | Description |
| ------ | ------- | ----------- |
| `npm start` | `node ./server/server.js` | Start the backend API server |
| `npm run updateDB` | `node ./server/updateDatabase.js` | Create/reset database tables |
| `npm run client` | `node ./app/client.js` | Start the frontend static server |

---

## Frontend Setup (React)

### Step 1: Install Frontend Dependencies

```powershell
cd app
npm install
```

This installs React and related dependencies:
- `react` and `react-dom` - React framework
- `@mui/material` - Material UI component library
- `@emotion/react` and `@emotion/styled` - CSS-in-JS styling
- `webpack` - Module bundler
- `babel` - JavaScript transpiler

### Step 2: Configure the API Host

The frontend needs to know where the backend API is running. This is configured via the `BASE_HOST` environment variable in `app/package.json`:

**For development** (backend on localhost:3000):
```json
"start": "cross-env BASE_HOST=http://localhost:3000 webpack serve --mode development --open"
```

**For production** (backend on a different machine):
Edit the `build` script in `app/package.json`:
```json
"build": "cross-env BASE_HOST=http://192.168.1.12:3000 webpack --mode production"
```

Replace `192.168.1.12` with your backend server's IP address.

### Step 3: Run the Frontend

**Development mode** (with hot reload):
```powershell
cd app
npm start
```
This starts Webpack Dev Server on `http://localhost:3033` and opens your browser.

**Production build:**
```powershell
cd app
npm run build
```
This creates an optimized bundle in `app/public/`.

### Step 4: Serve the Production Build

After building, serve the static files:

```powershell
# From the project root
npm run client
```

This starts a static file server on port 80 serving the React app from `app/public/`.

> **Note:** Port 80 may require administrator privileges on Windows. You can modify `app/client.js` to use a different port if needed.

---

## Running Both Frontend and Backend

For local development, you need two terminal windows:

**Terminal 1 - Backend:**
```powershell
cd C:\dev\longjohn
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd C:\dev\longjohn\app
npm start
```

The frontend dev server runs on port 3033 and connects to the backend on port 3000.

---

## Media Folder Structure

Organize your media files as follows:

```
Movies/
├── Movie Title (2020).mp4
├── Movie Title (2020).vtt          # Optional subtitles (same name as movie)
└── Another Movie.mp4

TV/
├── Show Name/
│   ├── S01E01 - Episode Title.mp4
│   ├── S01E02 - Episode Title.mp4
│   └── ...
└── Another Show/
    └── ...

AudioBooks/
├── Book Title/
│   ├── Chapter 01.mp3
│   ├── Chapter 02.mp3
│   └── ...
└── ...

Cover/
├── movie-id.jpg                    # Cover art images
└── ...
```

> **Important:** The TV folder name in your file system must match the `tvFolderName` value in your config.

---

## Testing

### Backend Testing (Jasmine)

Run Jasmine tests from PowerShell:
```powershell
npx jasmine
```

### Frontend Testing (Jasmine in Browser)

Jasmine tests for React components run in the browser console. Open the browser developer tools (F12) to view test output.

---

## Troubleshooting

| Symptom | Possible Cause | Fix |
| ------- | -------------- | --- |
| **"ECONNREFUSED" on npm run updateDB** | PostgreSQL not running | Start PostgreSQL service |
| **"password authentication failed"** | Wrong database credentials | Check `database.username` and `database.password` in config.js |
| **"database does not exist"** | Database not created | Create the database in pgAdmin or psql |
| **Tables not created** | Config file missing or incorrect | Verify `server/util/config.js` exists with correct settings |
| **Media not found** | Wrong paths in config | Verify `movies`, `TV`, and `audioBooks` paths exist |
| **Frontend can't connect to API** | Wrong BASE_HOST | Update BASE_HOST in `app/package.json` to match backend URL |
| **Subtitles not showing** | VTT file name mismatch | Ensure `.vtt` file has exact same name as the video file |
| **Port 80 access denied** | Requires admin privileges | Run PowerShell as Administrator or change port in `app/client.js` |

---

## API Endpoints

The backend exposes these REST endpoints:

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/v1/movie` | List all movies |
| GET | `/api/v1/movie/:id` | Stream a movie |
| GET | `/api/v1/tv` | List all TV shows |
| GET | `/api/v1/tv/:id` | Stream a TV episode |
| GET | `/api/v1/audiobook` | List all audiobooks |
| GET | `/api/v1/category` | List all categories |
| GET | `/api/v1/cover/:id` | Get cover art image |
| POST | `/api/v1/scanner` | Scan media folders |

---

## Roadmap

* User authentication & roles
* HLS/DASH adaptive streaming
* Docker image & compose file

---

## License

MIT © 2025 Kevin Batchelor
