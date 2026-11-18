# Decision log

Short records of important decisions: what we chose, why, and what it affects. Newest first. Larger reasoning lives in [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

### 2026-11-18 — Design system: tokens in CSS, Tailwind restricted to them

**Decision:** all colours, type, spacing, radii, shadows and motion are CSS variables in `frontend/src/design-system/tokens.css`. Tailwind v4 maps them to utilities, and its default palette/scales are switched off.
**Why:** one place to change the look; nobody can accidentally use an off-brand colour.
**Dark mode:** colours use CSS `light-dark()`, so each is defined once. Light is the default; dark is enabled with `data-theme="dark"` on `<html>` (no user setting yet).

### 2026-11-18 — Platform styles stay off portfolios

**Decision:** the design system and overlays are loaded by the marketing and dashboard layouts (`PlatformLayout`), not the root layout.
**Why:** portfolio themes must own their look (ARCHITECTURE §7). The portfolio placeholder is intentionally unstyled until themes arrive.

### 2026-11-18 — One overlay system on Radix UI

**Decision:** `ModalShell` (Radix Dialog) is the single frame for modals and drawers; `useModal()` opens confirmations, forms and custom overlays; `useToast()` uses Radix Toast. Selects use the native `<select>`.
**Why:** accessibility (focus trap, keyboard, screen readers) comes from a proven library; native select gives the familiar picker on phones with no extra code.
**Note:** Radix only returns focus to its own trigger button, so `ModalShell` restores focus itself for overlays opened from code (covered by tests).

### 2026-11-18 — Forms without a form library (for now)

**Decision:** `FormModal` reads values with the browser's `FormData` and takes a plain `validate` function. React Hook Form and Zod aren't added yet.
**Why:** current needs are simple; `validate` can wrap a Zod schema later without changing `FormModal`'s callers.

### 2026-11-18 — Internal showcase only outside production

**Decision:** `/design-system` renders only when `VERCEL_ENV` is not `production` (or, off Vercel, `NODE_ENV` is not `production`).
**Why:** reviewers can see every component on preview deployments without exposing an internal page on the live site. No new environment variable needed.

### 2026-11-18 — `www` handled by Vercel, not by the app

**Decision:** `www.checkmeout.in` → `checkmeout.in` is configured as a redirect on the Vercel domain (deployment step). Inside the app, `www` is a reserved name that shows "Page not found".
**Why:** an app-level redirect caused an infinite redirect loop during local development (the Next.js dev server shortens redirects to its own address), and Vercel's built-in domain redirect is simpler and happens before the app runs.
**Affects:** deployment checklist must include the `www` redirect.

### 2026-11-18 — ESLint 9 for now

**Decision:** use ESLint 9, not 10.
**Why:** Next.js's lint rules (`eslint-config-next` 16.4) don't yet support ESLint 10. ESLint only runs during development and CI; it never ships to users.
**Revisit:** when `eslint-config-next` supports ESLint 10.

### 2026-11-18 — `uv` for the backend

**Decision:** manage the backend's Python version and packages with `uv` (`pyproject.toml` + `uv.lock`).
**Why:** one tool installs the right Python and the exact locked package versions on every machine and in CI; fewer setup steps for a non-developer than managing Python and virtual environments by hand.

### 2026-11-18 — API is reached through the dashboard address

**Decision:** the browser calls `app.<domain>/api/*`; the frontend's proxy forwards it to the FastAPI backend. `/api` is **not** forwarded from the marketing site or portfolios.
**Why:** keeps the future login cookie on the dashboard address only (portfolio subdomains never see it) and avoids cross-site cookie/CORS setup. See ARCHITECTURE §3.

### 2026-11-18 — Interactive API docs only in development

**Decision:** `/api/docs` and `/api/openapi.json` exist only when `ENVIRONMENT=development`.
**Why:** a public map of every endpoint helps attackers more than users.

### 2026-11-18 — Architecture approved (revision 3)

Next.js frontend, FastAPI backend, MongoDB, Cloudinary; authentication built into FastAPI with mandatory security controls; workspace-based ownership; theme contract where themes own their full page structure. See [`ARCHITECTURE.md`](ARCHITECTURE.md).
