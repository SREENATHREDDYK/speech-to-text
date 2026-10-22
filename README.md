# Speech to Text

A real-time speech-to-text web app. You speak into the browser microphone, see the transcript appear live, and every recording is saved to PostgreSQL with its original audio so it can be searched, edited, played back or deleted later.

Live transcription uses the Google Gemini Live API (`gemini-3.5-transcribe-live`). The model detects the spoken language automatically, including mixed Hindi-English speech.

> **Why Gemini instead of a self-hosted open-source model?** Gemini provides low-latency streaming transcription with automatic multilingual and code-mixed language support as a managed API, so the app needs no GPU server or model hosting to deliver real-time results.

**Live demo:** _not deployed yet — add the URL here after deployment._

---

## Table of contents

- [Key features](#key-features)
- [Screenshots](#screenshots)
- [Technology stack](#technology-stack)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and setup](#installation-and-setup)
- [Environment variables](#environment-variables)
- [Neon PostgreSQL and migrations](#neon-postgresql-and-migrations)
- [Running locally](#running-locally)
- [Production build](#production-build)
- [API reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security considerations](#security-considerations)
- [Known limitations](#known-limitations)
- [Author](#author)

---

## Key features

- **Real-time transcription**: partial text appears while you speak and is replaced by final text when you pause.
- **Recording controls**: Start, Pause, Resume and Stop, with a timer that counts only recorded time.
- **Recording status**: Ready to record, Connecting, Listening, Paused and Saving.
- **Automatic saving**: when a recording stops (or reaches the time limit), the transcript and its duration are saved to PostgreSQL.
- **Original audio playback**: the recorded audio is stored as WAV and can be played back from the dashboard.
- **Transcript history**: list of saved transcripts with date, time and duration.
- **Live search**: case-insensitive partial-text search as you type (no Enter key needed).
- **Sorting and date filters**: Newest or Oldest; All Dates, Today, Yesterday, Last 7 Days, Last 30 Days.
- **Edit and delete**: edit transcript text inline; deleting a transcript also deletes its audio.
- **Responsive UI**: desktop dashboard layout that stacks into a single column on phones.

## Screenshots

_Screenshots are not included yet. Add them to a folder such as `docs/screenshots/` and update the paths below._

| View | Screenshot |
| --- | --- |
| Dashboard (desktop) | `docs/screenshots/dashboard.png` _(placeholder)_ |
| Live transcription while recording | `docs/screenshots/recording.png` _(placeholder)_ |
| Mobile layout | `docs/screenshots/mobile.png` _(placeholder)_ |

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, JavaScript, plain CSS (no UI library) |
| Audio capture | Web Audio API with an AudioWorklet (`client/public/pcm-worklet.js`) |
| Backend | Node.js, Express 5, `ws` (WebSocket server) |
| Speech-to-text | Google Gemini Live API via `@google/genai`, model `gemini-3.5-transcribe-live` |
| Database | Neon PostgreSQL, accessed with the `pg` package (parameterized SQL, no ORM) |

## How it works

```
Browser microphone
  -> AudioWorklet converts audio to 16 kHz, 16-bit, mono PCM (100 ms chunks)
  -> WebSocket /ws to the Express server
  -> server streams the audio to the Gemini Live API
  -> partial and final text are sent back to the browser in real time
  -> on Stop: transcript saved to `transcripts`, audio saved as WAV to `transcript_audio`
```

The Gemini API key is used only on the server. The browser never connects to Gemini directly.

## Project structure

```
speech-to-text/
├── client/                         React + Vite frontend
│   ├── index.html
│   ├── vite.config.js              Dev proxy: /transcripts and /ws -> http://localhost:5000
│   ├── public/
│   │   └── pcm-worklet.js          Converts microphone audio to 16 kHz 16-bit PCM
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                 Page layout, header and status pill
│       ├── App.css                 All styles
│       ├── api.js                  REST API calls (fetch)
│       ├── Recorder.jsx            Microphone, WebSocket, Start/Pause/Resume/Stop
│       ├── LiveTranscription.jsx   Live text panel, timer, Stop/Pause buttons
│       ├── Dashboard.jsx           Saved transcripts, loading, playback, edit/delete
│       ├── TranscriptFilters.jsx   Search, sort and date filter controls
│       ├── TranscriptItem.jsx      One transcript row
│       └── Icons.jsx               Inline SVG icons
└── server/                         Node.js + Express backend
    ├── index.js                    Express app, /health, WebSocket upgrade, shutdown
    ├── connection.js               PostgreSQL connection pool
    ├── migrate.js                  Runs the SQL files in migrations/
    ├── migrations/
    │   ├── 0001_create_transcripts_table.sql
    │   └── 0002_create_transcript_audio_table.sql
    ├── .env.example
    └── src/
        ├── config/config.js        Settings read from environment variables
        ├── routes/                 Route definitions
        ├── controllers/            Request handling
        ├── models/                 SQL queries
        ├── validators/             Input validation
        ├── middlewares/            Response format and error handling
        ├── services/
        │   ├── gemini_live.js      Browser WebSocket <-> Gemini Live session
        │   └── save_recording.js   Saves transcript, then its audio
        └── utils/commonUtils.js    Response formatting and WAV header
```

## Prerequisites

- **Node.js 22.12 or newer** (the server needs 22.9+ for `--env-file-if-exists`; Vite 8 needs 22.12+)
- **npm** (comes with Node.js)
- A **Neon PostgreSQL** database (or any PostgreSQL 13+ database; `gen_random_uuid()` is used)
- A **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)
- A browser with microphone access and AudioWorklet support (recent Chrome or Edge recommended)

## Installation and setup

```bash
git clone <your-repository-url>
cd speech-to-text
```

Install the backend dependencies:

```bash
cd server
npm install
```

Install the frontend dependencies:

```bash
cd ../client
npm install
```

Create the backend environment file from the example and fill in your own values:

```bash
cd ../server
cp .env.example .env
```

(On Windows Command Prompt use `copy .env.example .env`.)

## Environment variables

All variables belong to the **server** (`server/.env`). The frontend has no environment variables and never receives the API key.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. For Neon, add `?sslmode=verify-full`. |
| `GEMINI_API_KEY` | Yes | — | Gemini API key, used only by the server. Without it, recording returns "Transcription is not configured on the server". |
| `PORT` | No | `5000` | Port for the Express and WebSocket server. |
| `NODE_ENV` | No | — | Set to `production` in production. Outside production, error stack traces are printed to the server log (never sent to clients). |
| `SESSION_LIMIT_SECONDS` | No | `300` | Maximum recording length in seconds. Capped at `600` because a Gemini live session lasts at most 10 minutes. |
| `MAX_CONCURRENT_SESSIONS` | No | `3` | How many recordings can run at the same time. |
| `ALLOWED_ORIGINS` | No | — | Extra origins (comma separated) allowed to open the WebSocket. The page's own origin is always allowed. |

Example `server/.env` (placeholders only):

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=verify-full
GEMINI_API_KEY=<your-gemini-api-key>
SESSION_LIMIT_SECONDS=300
MAX_CONCURRENT_SESSIONS=3
ALLOWED_ORIGINS=
```

**Keep secrets out of Git.** `.gitignore` excludes `.env` and `.env.*` (except `.env.example`). Never commit real keys or connection strings, and keep `.env.example` limited to empty values or placeholders.

## Neon PostgreSQL and migrations

1. Create a project at [neon.tech](https://neon.tech) and open its connection details.
2. Copy the connection string and set it as `DATABASE_URL` in `server/.env`, with `?sslmode=verify-full` at the end.
3. Create the tables:

```bash
cd server
npm run db:migrate
```

`migrate.js` runs every `.sql` file in `server/migrations/` in name order. Each file uses `CREATE ... IF NOT EXISTS`, so running it again is safe. There is no migration-tracking table.

**Schema**

`transcripts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `UUID` | Primary key, `gen_random_uuid()` |
| `text` | `TEXT` | Not null |
| `duration_ms` | `INTEGER` | Not null, `>= 0`; recorded time only (pauses excluded) |
| `created_at` | `TIMESTAMPTZ` | Not null, defaults to `now()`; indexed |
| `updated_at` | `TIMESTAMPTZ` | Not null, updated when the text is edited |

`transcript_audio`

| Column | Type | Notes |
| --- | --- | --- |
| `transcript_id` | `UUID` | Primary key; references `transcripts(id)` with `ON DELETE CASCADE` |
| `audio` | `BYTEA` | WAV file (16 kHz, 16-bit, mono) |
| `created_at` | `TIMESTAMPTZ` | Not null, defaults to `now()` |

Audio lives in its own table so listing transcripts never loads audio data.

## Running locally

Run the backend and the frontend in two terminals.

**Terminal 1 — backend** (`http://localhost:5000`, restarts on file changes):

```bash
cd server
npm run dev
```

**Terminal 2 — frontend** (`http://localhost:5173`):

```bash
cd client
npm run dev
```

Open `http://localhost:5173` and allow microphone access. In development, Vite forwards `/transcripts` and the `/ws` WebSocket to the backend on port 5000, so no CORS setup is needed.

Health check:

```bash
curl http://localhost:5000/health
```

## Production build

Build the frontend into `client/dist`:

```bash
cd client
npm run build
```

Preview the built frontend locally:

```bash
npm run preview
```

Start the backend without file watching:

```bash
cd server
npm start
```

`npm start` runs `node index.js` and does not read `server/.env`; in production, set the variables in your host's environment settings. (`npm run db:migrate` reads `server/.env` if it exists.)

Note: the Express server does not serve `client/dist`. See [Deployment](#deployment) for how to serve both from one origin.

## API reference

Base URL in development: `http://localhost:5000`

All JSON responses use one shape:

- Success: `{ "result": ..., "msg": "..." }`
- Error: `{ "msg": "...", "error": ... }`

Transcript objects look like this:

```json
{
  "id": "uuid",
  "text": "Transcript text",
  "durationMs": 9314,
  "hasAudio": true,
  "createdAt": "2026-10-22T10:21:47.257Z",
  "updatedAt": "2026-10-22T10:21:47.257Z"
}
```

### REST endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Server status and database connectivity |
| `GET` | `/transcripts` | List transcripts (newest 100 matching the filters) |
| `GET` | `/transcripts/:id` | Get one transcript |
| `GET` | `/transcripts/:id/audio` | Original recording as `audio/wav` (not JSON) |
| `POST` | `/transcripts` | Create a transcript manually |
| `PUT` | `/transcripts/:id` | Update the transcript text |
| `DELETE` | `/transcripts/:id` | Delete a transcript and its audio |

**`GET /transcripts` query parameters**

| Parameter | Description |
| --- | --- |
| `search` | Optional. Case-insensitive partial match on the text (max 200 characters). `%` and `_` are matched literally. |
| `sort` | Optional. `newest` (default) or `oldest`. |
| `from` | Optional. ISO date-time; includes transcripts created at or after this time. |
| `to` | Optional. ISO date-time; includes transcripts created before this time. Must be after `from`. |

The frontend calculates `from`/`to` in the user's own time zone (for example, Yesterday = yesterday 00:00 up to today 00:00).

**`POST /transcripts` body**

```json
{ "text": "Hello world", "durationMs": 1500 }
```

`text` is required (max 50,000 characters). `durationMs` must be a whole number from 0 to 3,600,000.

**`PUT /transcripts/:id` body**

```json
{ "text": "Edited text" }
```

**Status codes**

| Code | When |
| --- | --- |
| `200` / `201` | Success |
| `400` | Invalid input, invalid UUID or invalid JSON |
| `404` | Transcript or audio not found, or unknown route |
| `413` | Request body larger than 100 KB |
| `500` | Unexpected server error (generic message only) |
| `503` | Database not reachable |

### WebSocket: `/ws`

Used by the recorder for live transcription. The connection is accepted only from the page's own origin or an origin listed in `ALLOWED_ORIGINS`.

| Direction | Message |
| --- | --- |
| Browser → server | Binary frames: 16 kHz, 16-bit, mono PCM audio |
| Browser → server | JSON text: `{"type":"pause"}`, `{"type":"resume"}`, `{"type":"stop"}` |
| Server → browser | `ready` (with `limitSeconds`), `partial`, `final`, `paused`, `resumed`, `stopping` (with `reason`: `user`, `limit` or `disconnected`), `done` (with the saved transcript or `null`), `error` |

## Testing

There are no automated test scripts in either `package.json` yet. Use these manual checks:

1. **Health:** `curl http://localhost:5000/health` returns `"database": "connected"`.
2. **Recording:** Start → speak → Pause → speak → Resume → Stop. The live text updates, the timer pauses during Pause, and the transcript appears in the list with the correct duration.
3. **Playback:** press Play on the new row; the original audio plays and the button switches to Stop Playback.
4. **Search:** type two or three letters of a word in the transcript; the list updates without pressing Enter, regardless of letter case.
5. **Sort and date filters:** switch Newest/Oldest and each date range; an empty range shows "No transcripts found." with an explanation.
6. **Edit and delete:** edit the text and save; delete a transcript and check that `GET /transcripts/:id/audio` returns `404`.
7. **API (curl):**

```bash
curl -X POST http://localhost:5000/transcripts -H "Content-Type: application/json" -d "{\"text\":\"Hello world\",\"durationMs\":1500}"
curl "http://localhost:5000/transcripts?search=hello&sort=newest"
```

Check the frontend production build with:

```bash
cd client
npm run build
```

## Deployment

The app needs a host that supports **long-lived WebSocket connections** (for example, a VM such as AWS EC2, or a platform such as Render or Railway).

**Same-origin requirement.** The frontend calls relative paths (`/transcripts`, `/transcripts/:id/audio`) and opens the WebSocket at `wss://<page host>/ws`. Frontend and backend must therefore be served from **one domain**. The backend does not add CORS headers, and Express does not serve the built frontend, so hosting them on two different domains is not supported without code changes.

**Recommended setup: one server with a reverse proxy (example: EC2 + Nginx)**

1. Install Node.js 22.12+ and Nginx on the server.
2. Copy the project, then run `npm install` in `server/` and in `client/`.
3. Set the environment variables (see [Environment variables](#environment-variables)) with `NODE_ENV=production`.
4. Run `npm run db:migrate` in `server/`.
5. Run `npm run build` in `client/`.
6. Start the backend with `npm start` under a process manager (for example, a systemd service) so it restarts automatically.
7. Configure Nginx to serve `client/dist` and forward the API and WebSocket paths to the backend:

```nginx
server {
    listen 80;
    server_name your-domain.example;

    root /path/to/speech-to-text/client/dist;
    index index.html;

    location /transcripts {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        client_max_body_size 1m;
    }

    location /ws {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header Origin $http_origin;
        proxy_read_timeout 900s;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

8. Enable **HTTPS** (for example with Let's Encrypt). Browsers allow microphone access only on HTTPS (or `localhost`), and the page then connects to `wss://`.

`proxy_set_header Host $host` matters: the WebSocket origin check compares the browser's `Origin` with the `Host` header. If your proxy changes the host, add the site's origin to `ALLOWED_ORIGINS`.

## Security considerations

- **API key stays on the server.** `GEMINI_API_KEY` is read from server environment variables only; the browser talks to the server, never to Gemini.
- **Secrets are not committed.** `.env` files are ignored by Git; `.env.example` contains no values.
- **SQL injection protection.** All queries use parameterized values; the sort direction is chosen from a fixed list (`newest`/`oldest`); `%` and `_` in searches are escaped.
- **Input validation.** UUIDs, text length, duration, search length, sort value and dates are validated before any query.
- **WebSocket origin check.** CORS does not cover WebSockets, so the server checks the `Origin` header and rejects other sites with `403`.
- **Cost and abuse limits.** Concurrent recordings are capped (`MAX_CONCURRENT_SESSIONS`), each recording has a time limit (`SESSION_LIMIT_SECONDS`, max 600), and WebSocket messages are limited to 64 KB.
- **No error details leak.** Clients receive generic error messages; details are logged on the server only.
- **No authentication.** As specified for this assignment, there is no login. Anyone who can open the deployed URL can view, edit and delete transcripts and play recordings. Add authentication before storing private recordings.

## Known limitations

- **No login or user accounts.** All transcripts are shared by everyone who can reach the app.
- **Gemini session length.** One recording can last at most 10 minutes (Gemini limit); time spent paused also counts toward this limit, although the on-screen timer and the saved duration exclude it.
- **Pausing mid-word.** If Pause is pressed in the middle of a word, that word can occasionally be cut off or repeated in the transcript.
- **Audio storage size.** Audio is stored uncompressed (about 1.9 MB per minute) in PostgreSQL, which uses database storage quickly on small plans.
- **List size.** The dashboard shows the newest 100 transcripts that match the current filters.
- **Browser support.** Tested in Chromium-based browsers. Safari and iPhone playback have not been verified.
- **Single-origin deployment.** Frontend and backend must share one domain (see [Deployment](#deployment)).
- **In-progress recordings on restart.** Restarting or redeploying the server ends any recording in progress.
- **No automated tests** are included yet.

## Author

**Your Name**

- GitHub: [github.com/your-username](https://github.com/your-username)
- Portfolio: [your-portfolio-url](https://your-portfolio-url)
- LinkedIn: [linkedin.com/in/your-profile](https://linkedin.com/in/your-profile)
