# CI/CD Pipeline Visualiser — Backend

REST API built with Node.js and Express. Connects to the GitHub Actions API using a Personal Access Token and exposes clean endpoints consumed by the frontend dashboard.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/repos` | List repos with active workflows |
| GET | `/api/pipeline/:owner/:repo/workflows` | List workflows for a repo |
| GET | `/api/pipeline/:owner/:repo/runs` | Paginated workflow runs with status, duration, trigger |
| GET | `/api/pipeline/:owner/:repo/stats` | Aggregated stats: pass rate, avg duration, daily trend |
| GET | `/api/pipeline/:owner/:repo/runs/:run_id/jobs` | Job-level detail for a specific run |

## Getting Started

### Prerequisites
- Node.js 18+
- A GitHub Personal Access Token with scopes: `repo`, `workflow`, `read:user`
  - Create one at: https://github.com/settings/tokens

### Setup

```bash
# Clone and install
git clone https://github.com/Nivaschill/cicd-visualiser-backend.git
cd cicd-visualiser-backend
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your GITHUB_TOKEN

# Run in development mode
npm run dev

# Run in production
npm start
```

The server starts on `http://localhost:4000` by default.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ | GitHub PAT (scopes: repo, workflow, read:user) |
| `CLIENT_URL` | ✅ | Frontend origin for CORS (default: http://localhost:3000) |
| `PORT` | ❌ | Server port (default: 4000) |

## Tech Stack

- **Node.js / Express** — HTTP server and routing
- **@octokit/rest** — Official GitHub REST API client
- **helmet** — HTTP security headers
- **cors** — Cross-origin resource sharing
- **express-rate-limit** — Basic rate limiting
- **dotenv** — Environment variable management

## Project Structure

```
src/
├── index.js          # Express app entry point
├── lib/
│   └── github.js     # Octokit client initialisation
└── routes/
    ├── repos.js      # Repo listing endpoints
    └── pipeline.js   # Workflow runs, stats, job detail
```

## Frontend

The frontend repo lives at: https://github.com/Nivaschill/cicd-visualiser-frontend
