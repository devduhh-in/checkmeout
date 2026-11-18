# Running CheckMeOut on your computer

This guide walks you through running CheckMeOut locally, step by step. No programming knowledge is needed: you'll copy commands into a terminal and open a few web addresses.

**What you'll end up with:** three different "websites" running on your own computer — the marketing site, the creator dashboard, and a sample portfolio — plus the backend API that the dashboard talks to.

---

## 1. What is what (30-second overview)

| Piece | Folder | What it does | Runs at |
|---|---|---|---|
| **Frontend** | `frontend/` | Everything people see in the browser (built with Next.js) | `http://localhost:3000` |
| **Backend (API)** | `backend/` | The server that will store data and enforce security (built with FastAPI) | `http://localhost:8000` |

You run each one in its **own terminal window** and leave both running while you test.

> **Terminal** = the text window where you type commands. On a Mac it's the *Terminal* app; on Windows use *PowerShell* (or *Windows Terminal*).

---

## 2. One-time setup

You only do this once per computer.

### 2.1 Install the tools

| Tool | Why | How to check it's installed |
|---|---|---|
| [Git](https://git-scm.com/downloads) | Downloads the code from GitHub | `git --version` |
| [Node.js 22 (LTS)](https://nodejs.org/) | Runs the frontend | `node --version` → should start with `v22` (v20.9+ also works) |
| [uv](https://docs.astral.sh/uv/getting-started/installation/) | Runs the backend and installs the right Python for it automatically | `uv --version` |

Install each one using the link (the default options are fine), then **close and reopen your terminal** so it notices the new tools. You do **not** need to install Python separately — `uv` handles it.

### 2.2 Download the code

```bash
git clone https://github.com/devduhh-in/checkmeout.git
```

```bash
cd checkmeout
```

### 2.3 Install the frontend's packages

```bash
cd frontend
```

```bash
npm ci
```

This reads the exact package versions from `package-lock.json`, so everyone gets the same setup. It takes about a minute.

### 2.4 Install the backend's packages

Open a terminal in the `checkmeout` folder, then:

```bash
cd backend
```

```bash
uv sync
```

`uv` downloads the correct Python version (if needed) and the exact package versions from `uv.lock`.

### 2.5 Settings (optional)

Everything works with built-in defaults — **you don't need to create any settings files** to run locally.

If you ever want to change a setting, copy the example file and edit the copy:

- Frontend: copy `frontend/.env.example` to `frontend/.env.local`
- Backend: copy `backend/.env.example` to `backend/.env`

These copies are ignored by Git, so they never get uploaded. **Never put real passwords or keys into the `.env.example` files.**

---

## 3. Start CheckMeOut

### Terminal 1 — backend

```bash
cd backend
```

```bash
uv run uvicorn app.main:app --reload --port 8000
```

You should see a line like `Uvicorn running on http://127.0.0.1:8000`. Leave this window open.

### Terminal 2 — frontend

```bash
cd frontend
```

```bash
npm run dev
```

You should see `Ready` and `Local: http://localhost:3000`. Leave this window open too.

To **stop** either one, click its terminal window and press `Ctrl + C`.

---

## 4. What to test

Open these addresses in **Chrome, Edge or Firefox** (see section 6 for Safari):

| Open this | You should see | What it proves |
|---|---|---|
| http://localhost:3000 | "MARKETING SITE — CheckMeOut" | The main domain shows the marketing site |
| http://app.localhost:3000 | "CREATOR DASHBOARD — Dashboard" and, after a moment, **"API: healthy (version 0.1.0)"** | The `app.` address shows the dashboard, and the dashboard can talk to the backend |
| http://priya.localhost:3000 | "PUBLIC PORTFOLIO — Portfolio for: priya" | Any other name shows that person's portfolio |
| http://priya.localhost:3000/projects/brand-film | Same portfolio, "Requested page: /projects/brand-film" | Portfolios can have their own pages |
| http://yourname.localhost:3000 | "Portfolio for: yourname" | Works for any valid username |

**Things that should be blocked** (each shows "Page not found"):

| Open this | Why it's blocked |
|---|---|
| http://admin.localhost:3000 | `admin` is a reserved name (so are `www`, `api`, `help`, `mail`, …) |
| http://ab.localhost:3000 | Usernames must be 3–30 characters |
| http://a.priya.localhost:3000 | Only one level of subdomain is allowed |
| http://localhost:3000/dashboard | The dashboard is only reachable at `app.localhost`, never as a path on another site |

**Check what happens when the backend is off:** stop Terminal 1 (`Ctrl + C`), then refresh http://app.localhost:3000. It should say **"API: unreachable — the API is not responding. Is the backend running?"** Start the backend again and refresh: it goes back to "healthy".

**Design system showcase:** http://localhost:3000/design-system shows every colour, button, form field, card, modal, drawer and notification. Use the Light/Dark buttons to preview dark mode. (It's also on Vercel preview links, never on the live site.)

**Bonus — the backend on its own:** http://localhost:8000/api/health shows the raw health response, and http://localhost:8000/api/docs shows interactive API documentation (only available in development).

---

## 5. How local addresses map to the real ones

| On your computer | When live |
|---|---|
| `localhost:3000` | `checkmeout.in` |
| `app.localhost:3000` | `app.checkmeout.in` |
| `priya.localhost:3000` | `priya.checkmeout.in` |
| `app.localhost:3000/api/…` → `localhost:8000` | `app.checkmeout.in/api/…` → the hosted backend |

The code is identical in both places. Only one setting changes: `ROOT_DOMAIN` is `localhost` on your computer and `checkmeout.in` in production. The file `frontend/src/proxy.ts` reads the address in the browser, removes the root domain, and decides which part of the app to show.

**Why `*.localhost` needs no setup:** `.localhost` is reserved for "this computer", and Chrome, Edge and Firefox send every `something.localhost` address to your own machine automatically.

---

## 6. Safari and other troubleshooting

**Safari can't open `priya.localhost:3000`.**
Safari doesn't reliably support `*.localhost`. Either use Chrome/Edge/Firefox, or:
1. Create `frontend/.env.local` containing the line `ROOT_DOMAIN=lvh.me`
2. Restart the frontend (`Ctrl + C`, then `npm run dev`)
3. Use `http://lvh.me:3000`, `http://app.lvh.me:3000`, `http://priya.lvh.me:3000`

(`lvh.me` is a public name that always points back to your own computer. It needs an internet connection to look up the name.)

**"API: unreachable" even though the backend is running.**
Check that Terminal 1 shows `Uvicorn running on http://127.0.0.1:8000`. If you started it on a different port, either restart it with `--port 8000` or set `API_ORIGIN` in `frontend/.env.local`.

**"Port 3000 is in use" / the frontend starts on 3001.**
Another program is using port 3000. Everything still works — just use `:3001` in all the addresses above.

**`npm` or `uv` "command not found".**
Close and reopen the terminal after installing. If it still fails, re-run the installer from section 2.1.

**The portfolio page looks plain.**
That's expected: portfolios will be styled by themes (Milestone 7), not by the platform design system.

---

## 7. Running the automated checks yourself (optional)

The same checks run automatically on GitHub for every pull request. To run them locally:

**Frontend** (inside `frontend/`):

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

**Backend** (inside `backend/`):

```bash
uv run ruff check .
```

```bash
uv run pytest
```

Each should finish without errors. `npm test` runs the routing tests (which address goes where); `uv run pytest` runs the backend tests.
