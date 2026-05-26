# VedaAI — AI-Powered Assessment Creator

A full-stack assessment creator portal that lets teachers generate structured exam papers using AI. Upload reference material, configure question types and difficulty, and get a complete question paper with answer keys — all in real-time.

> Built as a hiring assignment for VedaAI. Designed pixel-perfect from the provided Figma mockups.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| **State** | Zustand |
| **Forms** | React Hook Form + Zod validation |
| **Backend** | Express.js (TypeScript) |
| **Database** | SQLite via Prisma ORM — chosen for zero-config local setup (no external DB server needed) |
| **Job Queue** | BullMQ + Redis (background AI generation) |
| **AI (Primary)** | Google Gemini (`gemini-2.5-flash`) |
| **AI (Fallback 1)** | OpenAI (`gpt-4o-mini`) |
| **Real-time** | Socket.io (progress updates during generation) |
| **PDF Export** | Headless Puppeteer (server-side A4 rendering) |
| **File Parsing** | pdf-parse (extracts text from uploaded PDFs) |

---

## Architecture

```
┌─────────────────────┐
│   Next.js Client    │
│  (React 19 + Zustand)│
└──────────┬──────────┘
           │ REST + WebSocket
           ▼
┌─────────────────────┐
│   Express Server    │
│  (TypeScript)       │
├─────────────────────┤
│  Multer (file upload)│
│  Prisma (SQLite ORM) │
│  Socket.io (events)  │
└──────────┬──────────┘
           │ Job dispatch
           ▼
┌─────────────────────┐
│  BullMQ Worker      │
│  (Redis-backed)     │
├─────────────────────┤
│ 1. Parse uploaded PDF│
│ 2. Build AI prompt   │
│ 3. Call Gemini API   │
│    ↳ fallback: OpenAI│
│ 4. Validate with Zod │
│ 5. Save to SQLite    │
│ 6. Emit completion   │
└─────────────────────┘
```

### Flow

1. Teacher fills out the form (title, question types, marks, optional PDF upload)
2. Server creates an Assignment record with status `queued` and dispatches a BullMQ job
3. Worker picks up the job, transitions status to `generating`, and emits a Socket.io event
4. Worker builds a structured prompt and sends it to **Gemini 2.5 Flash** (primary)
5. If Gemini fails (rate limit, network, etc.), it falls back to **OpenAI gpt-4o-mini**
6. AI response is validated against strict Zod schemas and saved to SQLite in an atomic transaction
7. Status transitions to `completed` and the client is notified via Socket.io
8. Teacher views the generated paper with sections, questions, difficulty badges, and answer keys
9. Paper can be exported as a pixel-perfect A4 PDF via Puppeteer

---

## Why SQLite?

SQLite was chosen intentionally for assessment/hiring ease:

- **Zero infrastructure** — no need to install or configure PostgreSQL/MySQL
- **Single file database** — the entire DB is one `dev.db` file, trivial to reset or inspect
- **Prisma compatible** — same ORM, same migration workflow; swapping to PostgreSQL for production is a one-line config change in `schema.prisma`
- **Fast for single-user/demo** — perfect for local development and assessment review

---

## Quick Start

### Prerequisites

- **Node.js** v18+
- **Redis** running on `localhost:6379` (or use a hosted provider like [Upstash](https://upstash.com))
- **AI API Key** — at minimum a [Google Gemini API key](https://aistudio.google.com/apikey)

### 1. Clone & Setup Server

```bash
cd server
npm install

# Copy env template and fill in your keys
cp .env.example .env

# Run database migrations
npx prisma migrate dev --name init

# Start server (runs on port 5000)
npm run dev
```

### 2. Setup Client

```bash
cd client
npm install

# Copy env template
cp .env.example .env.local

# Start client (runs on port 3000)
npm run dev
```

### 3. Open

Visit [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (default: `5000`) |
| `DATABASE_URL` | Yes | Prisma SQLite path (default: `file:./dev.db`) |
| `REDIS_URL` | Yes | Redis connection string |
| `GEMINI_API_KEY` | Yes | Google Gemini API key (primary AI provider) |
| `OPENAI_API_KEY` | No | OpenAI API key (fallback provider) |
| `CLIENT_URL` | Yes | Frontend URL for CORS (default: `http://localhost:3000`) |

### Client (`client/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (default: `http://localhost:5000`) |

---

## Database Schema

```
Assignment (1) ──→ (1) Result ──→ (N) Section ──→ (N) Question
```

| Model | Purpose |
|-------|---------|
| **Assignment** | Stores form input: title, due date, question types, marks, uploaded file path, status |
| **Result** | Links to a completed generation output |
| **Section** | Groups questions (e.g. "Section A — MCQ", "Section B — Short Answer") |
| **Question** | Individual question with text, type, options (MCQ), answer key, difficulty, marks |

---

## AI Failover Strategy

The generation pipeline is designed for resilience:

```
Gemini 2.5 Flash (primary)
    ↓ on failure
OpenAI gpt-4o-mini (fallback)
    ↓ on failure
Error returned to client
```

- **Gemini** uses `responseMimeType: "application/json"` for structured output
- **OpenAI** uses `response_format: { type: "json_object" }`
- Both outputs are validated against the same **Zod schema** before database insertion
- If the AI returns malformed JSON, the error is caught and reported

---

## Features

- **AI Question Generation** — generates MCQ, short answer, long answer, numerical, and diagram questions
- **Answer Keys** — every question type gets a model answer (MCQ gets correct letter, others get written answers)
- **PDF Export** — server-side Puppeteer rendering produces clean A4 PDFs
- **Real-time Progress** — Socket.io pushes status updates (queued → generating → completed)
- **File Upload** — upload PDF/TXT reference material to ground the AI's questions
- **Responsive Design** — mobile, tablet, and desktop layouts matching Figma specs
- **URL-persisted State** — assignment ID in URL slug + show/hide answers in query params survive refresh

---

## Production Considerations

If deploying this beyond a local demo:

### Database
- **Swap SQLite → PostgreSQL**: Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma` and update `DATABASE_URL`. Run `npx prisma migrate dev`.
- SQLite has no concurrent write support — PostgreSQL is required for multi-user production.

### Redis
- Use a managed Redis provider (Upstash, Redis Cloud, AWS ElastiCache) instead of local Redis.
- The current config already supports `rediss://` (TLS) connection strings.

### AI Keys
- Set up proper API key rotation and rate limit handling.
- Consider adding **Anthropic Claude** (`claude-sonnet-4-20250514`) as a third fallback provider.
- Add retry logic with exponential backoff for transient API failures.

### File Storage
- Move uploaded files from local disk (`uploads/`) to cloud storage (S3, GCS, Cloudflare R2).
- Add file size limits and virus scanning.

### Deployment
- **Frontend**: Deploy to Vercel (`next build && next start`)
- **Backend**: Deploy to Railway, Render, or a VPS with PM2
- Set proper CORS origins in `CLIENT_URL`
- Add rate limiting (e.g. `express-rate-limit`) to the API

### Security
- Add authentication (currently the portal has no login)
- Sanitize AI-generated HTML before rendering (XSS prevention)
- Environment variables should be injected via CI/CD secrets, never committed

---

## Project Structure

```
vedaAI-assesment/
├── client/                    # Next.js frontend
│   ├── app/
│   │   ├── page.tsx           # Dashboard (list + create form)
│   │   └── assignments/
│   │       └── [id]/page.tsx  # Assignment detail view
│   ├── components/
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── AssignmentForm.tsx  # Create assignment form
│   │   ├── ExamPaper.tsx       # Question paper viewer
│   │   └── LoadingScreen.tsx   # Generation progress overlay
│   └── store/
│       └── assignmentStore.ts  # Zustand global state
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── server.ts          # Entry point
│   │   ├── assignment/
│   │   │   ├── assignment.controller.ts  # REST endpoints + PDF
│   │   │   ├── assignment.service.ts     # AI generation logic
│   │   │   ├── assignment.worker.ts      # BullMQ job processor
│   │   │   ├── assignment.queue.ts       # Queue config
│   │   │   └── assignment.route.ts       # Express routes
│   │   ├── socket/socket.ts   # Socket.io setup
│   │   ├── config/prisma.ts   # Prisma client
│   │   └── utils/fileParser.ts # PDF text extraction
│   └── prisma/
│       └── schema.prisma      # Database schema
│
├── .gitignore
├── .env.example               # (not committed — see server/.env.example)
└── README.md
```

---

## License

Built for the VedaAI hiring assessment.
