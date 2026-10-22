# Speech to Text

A real-time speech-to-text web app. You speak into the browser microphone, see the transcript appear live, and every recording is saved to PostgreSQL with its original audio so it can be searched, edited, played back or deleted later.

Live transcription uses the Google Gemini Live API (`gemini-3.5-transcribe-live`). The model detects the spoken language automatically, including mixed Hindi-English speech.

> **Why Gemini instead of a self-hosted open-source model?** Gemini provides low-latency streaming transcription with automatic multilingual and code-mixed language support as a managed API, so the app needs no GPU server or model hosting to deliver real-time results.

**Live demo (frontend, Vercel):** `https://<your-app>.vercel.app` _(placeholder — replace after deploying)_

**Backend (Render):** `https://speech-to-text-ddk6.onrender.com` — health check at [`/health`](https://speech-to-text-ddk6.onrender.com/health)

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
│   ├── .env.example                VITE_API_BASE_URL and VITE_WS_URL placeholders
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

### Backend (`server/.env` locally, Render environment in production)

All secrets belong to the server. The frontend never receives the Gemini API key or the database URL.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. For Neon, add `?sslmode=verify-full`. |
| `GEMINI_API_KEY` | Yes | — | Gemini API key, used only by the server. Without it, recording returns "Transcription is not configured on the server". |
| `PORT` | No | `5000` | Port for the Express and WebSocket server. |
| `NODE_ENV` | No | — | Set to `production` in production. Outside production, error stack traces are printed to the server log (never sent to clients). |
| `SESSION_LIMIT_SECONDS` | No | `300` | Maximum recording length in seconds. Capped at `600` because a Gemini live session lasts at most 10 minutes. |
| `MAX_CONCURRENT_SESSIONS` | No | `3` | How many recordings can run at the same time. |
| `ALLOWED_ORIGINS` | In production | — | Frontend origins allowed to call the API (CORS) and open the WebSocket, comma separated, for example `https://<your-app>.vercel.app`. Not needed locally, where the Vite proxy makes requests same-origin. |

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

### Frontend (`client/.env` locally, Vercel environment in production)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | In production | Backend base URL, for example `https://speech-to-text-ddk6.onrender.com` (no trailing slash). Leave empty locally to use the Vite proxy. |
| `VITE_WS_URL` | In production | WebSocket URL, for example `wss://speech-to-text-ddk6.onrender.com/ws`. Leave empty locally to use the Vite proxy. |

`VITE_` variables are built into the public JavaScript bundle, so they must never contain secrets. See `client/.env.example`.

**Keep secrets out of Git.** `.gitignore` excludes `.env` and `.env.*` (except `.env.example`). Never commit real keys or connection strings, and keep `.env.example` files limited to empty values or placeholders.

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

For a production frontend build, set `VITE_API_BASE_URL` and `VITE_WS_URL` before running `npm run build`; their values are built into the bundle. In production the frontend (Vercel) and backend (Render) run on different domains; see [Deployment](#deployment).

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

Used by the recorder for live transcription. The connection is accepted only from the server's own origin or an origin listed in `ALLOWED_ORIGINS`; other origins get `403`.

### CORS

Browser requests from an origin listed in `ALLOWED_ORIGINS` receive `Access-Control-Allow-Origin` for that origin (methods `GET, POST, PUT, DELETE, OPTIONS`, header `Content-Type`). `OPTIONS` preflight requests are answered with `204`. Other origins receive no CORS headers, so browsers block their requests.

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

The frontend is deployed to **Vercel** and the backend to **Render**, which supports the long-lived WebSocket connections used for live transcription. They run on different domains: the frontend reaches the backend through `VITE_API_BASE_URL` and `VITE_WS_URL`, and the backend allows the frontend's origin through `ALLOWED_ORIGINS` (CORS for the REST API, and the origin check for the WebSocket).

Deploy the backend first, because the frontend needs its URL.

### 1. Backend on Render

Create a **Web Service** from the GitHub repository with these settings:

| Setting | Value |
| --- | --- |
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |

The server requires Node.js 22.9 or newer (`engines` in `server/package.json`). Render provides the `PORT` variable, which the server reads automatically.

**Environment variables** (Render → your service → Environment):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Your Neon connection string, ending with `?sslmode=verify-full` |
| `GEMINI_API_KEY` | Your Gemini API key |
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGINS` | Your exact Vercel frontend origin, for example `https://<your-app>.vercel.app` |

Optional: `SESSION_LIMIT_SECONDS` and `MAX_CONCURRENT_SESSIONS` (see [Environment variables](#environment-variables)).

**Setting `ALLOWED_ORIGINS` correctly**

The value must match the browser's `Origin` header **exactly**:

- Include the scheme: `https://<your-app>.vercel.app`
- **No trailing slash** and no path: not `https://<your-app>.vercel.app/` and not `https://<your-app>.vercel.app/app`
- Use the domain users actually open. Vercel preview deployments use different URLs; add each one you need, comma separated: `https://<your-app>.vercel.app,https://<your-preview>.vercel.app`
- If you later add a custom domain, add it as well.

After changing environment variables, redeploy the service. Check it at `https://speech-to-text-ddk6.onrender.com/health`, which should return `"database": "connected"`.

### 2. Database migrations

Run the migrations once for a new database, and again whenever a new file is added to `server/migrations/`. They are safe to re-run (`CREATE ... IF NOT EXISTS`).

Run them from your machine against the same Neon database the backend uses:

```bash
cd server
npm run db:migrate
```

`db:migrate` reads `DATABASE_URL` from `server/.env` if it exists, otherwise from the environment. Make sure it points to the production Neon database when you run it for production.

### 3. Frontend on Vercel

Import the same repository as a new Vercel project with these settings:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `client` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Use Node.js 22.x in the project settings (Vite 8 requires Node.js 22.12+ or 20.19+).

**Environment variables** (Vercel → Project → Settings → Environment Variables):

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://speech-to-text-ddk6.onrender.com` |
| `VITE_WS_URL` | `wss://speech-to-text-ddk6.onrender.com/ws` |

These values are built into the bundle, so **redeploy the frontend after changing them**. Then copy the Vercel URL into `ALLOWED_ORIGINS` on Render and redeploy the backend.

Vercel serves the site over HTTPS, which browsers require for microphone access. Because the page is HTTPS, the WebSocket URL must use `wss://`.

### 4. Verify the deployment

Open the Vercel URL and check:

1. **REST API:** `https://speech-to-text-ddk6.onrender.com/health` returns `"database": "connected"`.
2. **Transcript history:** the Saved Transcripts list loads without errors in the browser console (a CORS error here means `ALLOWED_ORIGINS` does not exactly match the Vercel origin).
3. **WebSocket recording:** Start Recording, allow the microphone, speak, Pause, Resume, then Stop. Live text should appear and the new transcript should appear in the list. A failed connection usually means a wrong `VITE_WS_URL` or an `ALLOWED_ORIGINS` mismatch.
4. **Editing:** edit a transcript, save it, and reload the page to confirm the change was stored.
5. **Audio playback:** press Play on the new recording; the original audio should play.
6. **Deleting:** delete a test transcript and confirm it disappears after reloading.

**Troubleshooting**

- **CORS error in the browser console:** `ALLOWED_ORIGINS` on Render does not match the page origin exactly (check `https://`, the domain, and the trailing slash), or the backend was not redeployed after the change.
- **Requests go to the Vercel domain instead of Render:** `VITE_API_BASE_URL` was not set when the frontend was built; set it and redeploy.
- **First request is slow:** if your Render plan suspends idle services, the first request after a quiet period waits for the service to start.

## Security considerations

- **API key stays on the server.** `GEMINI_API_KEY` is read from server environment variables only; the browser talks to the server, never to Gemini.
- **Never commit secrets.** `.env` files are ignored by Git, and the `.env.example` files contain only empty values or placeholders. Set real values only in your local `.env` files and in the Render and Vercel dashboards. Frontend `VITE_` variables are public, so never put keys or passwords in them.
- **Restricted origins (CORS).** Only origins listed in `ALLOWED_ORIGINS` receive CORS headers, so other websites cannot call the API from a browser. CORS is a browser protection, not authentication: tools such as `curl` can still call the API directly.
- **SQL injection protection.** All queries use parameterized values; the sort direction is chosen from a fixed list (`newest`/`oldest`); `%` and `_` in searches are escaped.
- **Input validation.** UUIDs, text length, duration, search length, sort value and dates are validated before any query.
- **WebSocket origin check.** CORS does not cover WebSockets, so the server checks the `Origin` header and rejects other sites with `403`.
- **Cost and abuse limits.** Concurrent recordings are capped (`MAX_CONCURRENT_SESSIONS`), each recording has a time limit (`SESSION_LIMIT_SECONDS`, max 600), and WebSocket messages are limited to 64 KB.
- **No error details leak.** Clients receive generic error messages; details are logged on the server only.
- **No authentication.** The app currently has no login or user accounts. Anyone who can open the deployed frontend, or who sends requests directly to the backend URL, can view, edit and delete transcripts and play recordings. Do not store private or sensitive recordings, and add authentication before real-world use.

## Known limitations

- **No login or user accounts.** All transcripts are shared by everyone who can reach the app.
- **Gemini session length.** One recording can last at most 10 minutes (Gemini limit); time spent paused also counts toward this limit, although the on-screen timer and the saved duration exclude it.
- **Pausing mid-word.** If Pause is pressed in the middle of a word, that word can occasionally be cut off or repeated in the transcript.
- **Audio storage size.** Audio is stored uncompressed (about 1.9 MB per minute) in PostgreSQL, which uses database storage quickly on small plans.
- **List size.** The dashboard shows the newest 100 transcripts that match the current filters.
- **Browser support.** Tested in Chromium-based browsers. Safari and iPhone playback have not been verified.
- **In-progress recordings on restart.** Restarting or redeploying the server ends any recording in progress.
- **No automated tests** are included yet.

## Author

**Your Name**

- GitHub: [github.com/your-username](https://github.com/your-username)
- Portfolio: [your-portfolio-url](https://your-portfolio-url)
- LinkedIn: [linkedin.com/in/your-profile](https://linkedin.com/in/your-profile)
