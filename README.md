# CheckMeOut

CheckMeOut is a platform for creators, freelancers and agencies to build, customise and publish professional portfolio websites without writing code.

| Address | What it is |
|---|---|
| `checkmeout.in` | Marketing site |
| `app.checkmeout.in` | Creator dashboard |
| `username.checkmeout.in` | Public portfolios |

## Project status

**Milestone 1 — project skeleton & routing.** The three addresses above work locally as placeholder pages, and the dashboard talks to the backend. No accounts, database, design or portfolio features yet.

## Run it on your computer

Step-by-step guide (no programming knowledge needed): **[docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md)**

Short version, in two terminals:

```bash
cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend && npm ci && npm run dev
```

Then open http://localhost:3000, http://app.localhost:3000 and http://priya.localhost:3000.

## Repository layout

```
frontend/   Next.js app — marketing site, dashboard and portfolios (one app, routed by address)
backend/    FastAPI app — the API
docs/       Architecture, decisions and setup guides
.github/    Automatic checks that run on every pull request
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — how the product is designed and why
- [Decision log](docs/DECISIONS.md) — key decisions in short form
- [Local development](docs/LOCAL_DEVELOPMENT.md) — running and testing locally

## Contributing workflow

All changes go through feature branches and pull requests. Nothing is pushed directly to `main`, merged or deployed without the project owner's approval.
