# CheckMeOut — Architecture

> Status: **Draft for approval** (revision 2). Nothing in this document is built yet.
> This is the reference every milestone is checked against. When a decision changes, update this file in the same pull request.

CheckMeOut lets creators, freelancers and agencies build and publish a portfolio website without writing code. This document explains how the product is put together, in plain language, and why.

---

## 1. Big picture

```
   checkmeout.in            app.checkmeout.in           priya.checkmeout.in
  (marketing site)        (login + dashboard)          (public portfolio)
          \                       |                            /
           \______________________|___________________________/
                                  |
                 ONE frontend app (Next.js, hosted on Vercel)
                 Reads the web address and shows the right "surface".
                                  |
                        /api/*  (forwarded, same site)
                                  |
                 ONE backend API (FastAPI, Python)
                 All security checks, plan limits and secrets live here.
                     /                 |                   \
             MongoDB Atlas        Cloudinary            Resend
          (all creator data)   (images + video)   (account emails)
```

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js** (React + TypeScript) | Builds pages on the server, so shared portfolio links show proper previews on WhatsApp/LinkedIn and rank on Google. One app serves all three surfaces. |
| Backend | **FastAPI** (Python) | Already familiar; fast; good for future AI features; keeps secrets server-side. |
| Database | **MongoDB Atlas** | Already familiar; portfolio content is naturally document-shaped; free tier to start. |
| Media | **Cloudinary** | Image/video processing, thumbnails and responsive delivery out of the box. |
| Email | **Resend** | Verification and password-reset emails; generous free tier. |
| Hosting | Vercel (frontend), Render or Railway (backend) | Simple deploys, low starting cost. |

**Deliberately not used yet:** microservices, Redis, job queues, Kubernetes, payment integration. Each is added only when a real need appears.

---

## 2. Authentication decision

### Options compared

| | **Built into FastAPI** (recommended) | **Clerk** | **Supabase Auth** |
|---|---|---|---|
| **Security** | Strong *if* done carefully. We must implement rate limiting, email verification, reset tokens, CSRF protection. We use proven libraries (Argon2 for passwords, Authlib for Google), never custom cryptography. | Strongest out of the box: bot protection, breached-password checks, MFA, attack detection. | Strong. Battle-tested, open source. |
| **Price at 10k users** | ≈ $0 (only email sending) | Free (50k monthly retained users free) | Free (50k MAU free) |
| **Price at 200k users** | ≈ $0–20/mo (email) | ≈ $3,000/mo ($25 + $0.02 per user over 50k) | ≈ $350/mo ($25 Pro incl. 100k, then ~$0.00325/user) |
| **Google login** | Yes (we configure Google OAuth) | Yes, one click | Yes, simple |
| **Email/password** | Yes | Yes | Yes |
| **Custom subdomains** | Full control; cookie lives on our own domain | Needs a `clerk.checkmeout.in` DNS record; creator custom domains need paid "satellite domains" | Custom auth domain is a paid add-on; otherwise auth runs on `*.supabase.co` |
| **Session management** | Sessions stored in our DB: instant logout everywhere, instant suspension | Excellent, managed for us | Good; JWT-based, revocation less immediate |
| **Long-term flexibility** | Users live in our database; no lock-in; any feature we want | Lock-in: users live in Clerk; migrating away is a project | Medium: brings a whole second platform (Postgres) we'd use only for login |
| **Fits our stack** | Native | Good with Next.js; FastAPI verifies its tokens | Awkward: our data is in MongoDB, not Supabase's Postgres |

### Recommendation: build authentication into FastAPI

Reasons, in order of importance:

1. **Cost matches the business model.** Most CheckMeOut users will be on the free plan. A per-user auth fee grows with *free* users, not paying ones. At 200k creators Clerk would cost more than all other infrastructure combined.
2. **No lock-in.** Our user accounts stay in our database, next to their portfolios.
3. **Simplest security story for subdomains.** The login cookie lives only on `app.checkmeout.in` (see §3), which is easier to reason about than a third-party session domain.
4. **Supabase doesn't fit**: we'd be running a second database just to log people in.

**The honest trade-off:** we take on responsibility a hosted service would handle for us. We reduce that risk by:

- Using only proven libraries; no home-made cryptography.
- A written checklist enforced in tests: rate limits on login/reset, Argon2 password hashing, single-use expiring reset tokens (stored hashed), email verification, session rotation on login, `HttpOnly` + `Secure` + `SameSite=Lax` cookies, CSRF protection, generic error messages ("email or password is incorrect").
- A security review on every auth pull request.
- **Keeping auth behind one boundary.** The rest of the app only ever asks "who is the current user?" (`get_current_user`). If we ever want to switch to Clerk or similar, only the auth module changes.

MFA (authenticator apps) can be added later inside the same module.

---

## 3. Domains, routing and sessions

### Surfaces

| Surface | Production | Local development |
|---|---|---|
| Marketing | `checkmeout.in` | `localhost:3000` |
| Dashboard | `app.checkmeout.in` | `app.localhost:3000` |
| Portfolio | `priya.checkmeout.in` | `priya.localhost:3000` |
| API | `app.checkmeout.in/api/*` → FastAPI | `app.localhost:3000/api/*` → `localhost:8000` |

All of these come from configuration (`ROOT_DOMAIN`, `APP_SUBDOMAIN`, `API_ORIGIN`), never hardcoded.

### How one app serves every address

The frontend has a small **middleware** file that runs before every page:

1. Read the address the visitor typed, e.g. `priya.checkmeout.in`.
2. Remove the configured root domain (`checkmeout.in`) → leftover is `priya`.
3. Decide:
   - nothing left → **marketing** pages
   - `app` → **dashboard** pages
   - a reserved word (`www`, `api`, `admin`, `mail`, `help`, …) → redirect or 404
   - anything else → **portfolio** pages for username `priya`
4. Internally rewrite to the right folder (the visitor still sees `priya.checkmeout.in`).

Locally the root domain is simply `localhost:3000` instead of `checkmeout.in`, so **the exact same code path** runs in development and production.

**Why `priya.localhost` works with no setup:** modern browsers (Chrome, Edge, Firefox) treat every `*.localhost` address as "this computer". Safari can be inconsistent; the fallback is `priya.lvh.me:3000` (a public name that always points to your own computer) or a one-line entry in your computer's hosts file. Both are documented in `docs/LOCAL_DEVELOPMENT.md`.

**Vercel preview deployments** (temporary URLs like `checkmeout-abc.vercel.app`) have no subdomains, so portfolios can also be opened via a path fallback (`/_preview/priya`) on non-production hosts only.

**Custom domains later** (`priya.com`): the middleware sees an unknown host, asks the API "which portfolio owns this domain?", and continues down the same portfolio path. No redesign needed.

### Where the login cookie lives

The dashboard calls the API through `app.checkmeout.in/api/...`, which Vercel forwards to FastAPI. Because of that, the session cookie belongs **only to `app.checkmeout.in`**:

- Public portfolio subdomains never receive a creator's session cookie.
- No cross-domain cookie or CORS complexity.
- Owners preview their portfolio inside the dashboard (`app.checkmeout.in/preview`), where they are logged in.

---

## 4. Folder structure

```
checkmeout/
├── docs/                         plain-English architecture, decisions, setup guides
├── frontend/                     Next.js app
│   └── src/
│       ├── app/                  pages, grouped by surface
│       │   ├── (marketing)/          checkmeout.in
│       │   ├── (dashboard)/          app.checkmeout.in
│       │   └── (portfolio)/          username.checkmeout.in
│       ├── middleware.ts         reads the address, routes to the right surface
│       ├── config/               domains, reserved usernames, app constants
│       ├── design-system/        tokens (colours, type, spacing…) + Button, Input, Card…
│       ├── overlays/             modal controller, modals, drawer, toasts
│       ├── modules/              one folder per feature (added only when built)
│       ├── themes/               theme registry + one folder per theme
│       ├── media/                upload client, media URL builder, players
│       └── lib/                  API client, small helpers
├── backend/                      FastAPI
│   ├── app/
│   │   ├── core/                 settings, database, security, errors
│   │   ├── shared/               access control, tenant guard, entitlements
│   │   └── modules/              one folder per feature (added only when built)
│   │       └── <feature>/        router.py · service.py · models.py · schemas.py
│   └── tests/
└── .github/workflows/            automatic build + tests on every pull request
```

**Rule:** a module folder is only created in the milestone that builds it. Every module follows the same internal pattern, so adding "Testimonials" later means copying the shape of "Brands".

---

## 5. Data model

### Ownership: workspaces from day one (invisible to users)

To keep agency and team support possible without rebuilding later, ownership goes through a **workspace** rather than directly through a user:

```
User ──< Membership >── Workspace ──< Portfolio ──< content (projects, brands, media…)
                 (role)        │
                               └── Subscription
```

- When someone signs up we automatically create **their personal workspace** and make them its `owner`. Users never see the word "workspace" until agency features exist.
- Today: one user → one workspace → one portfolio.
- Later: an agency workspace with several members (`owner`, `admin`, `editor`, `viewer`) and several portfolios. Only permission rules and UI change; no data migration.

This costs two small tables now and saves a very painful migration later. **No team features, invitations or role management UI are built until needed.**

### Entities

| Entity | Key fields | Belongs to |
|---|---|---|
| **User** | email, password hash *or* Google ID, email verified, platform role (`creator` / `platform_admin`), status | — |
| **Session** | hashed token, expiry, device info | User |
| **Workspace** | name, type (`personal` / `agency`) | — |
| **Membership** | user, workspace, role (`owner` only for now) | User + Workspace |
| **Portfolio** | username (unique), display name, bio, profession, avatar media, social links, contact, onboarding progress, `draft`/`published`, active theme | Workspace |
| **ThemeSettings** | theme id, settings version, settings, section order/visibility, per-item overrides | Portfolio + theme (one per theme used) |
| **Content** — Project, Brand, Experience, Milestone, Skill, Testimonial, Post, Reel | presentation-neutral fields (see §6) | Portfolio |
| **Media** | provider ids, type, bytes, dimensions, duration, poster, status | Workspace (library) |
| **Message** | visitor name/email, body, read | Portfolio (owner-only) |
| **Subscription** | plan, status, period end, empty payment-provider fields | Workspace |
| **Plan** | limits + features, defined in one config file | Platform |
| **PlatformSettings, AuditLog** | global switches; record of admin actions | Platform |

Only the entities a milestone needs are created in that milestone.

---

## 6. Multi-tenant security model

**Rule: the server decides whose data you can touch — never the browser.**

1. **Ownership comes from the session, not the request.** "Edit project 42" becomes "find project 42 *that belongs to a portfolio this user can edit*". Changing an id in the URL finds nothing.
2. **One access-check function** — `require_access(user, portfolio, action)`. Today it means "user is a member of the portfolio's workspace". Later it reads member roles. Every feature calls this; none invents its own rule.
3. **One tenant guard for database access.** Feature code cannot query portfolio content without a portfolio scope (`shared/tenancy.py`).
4. **Other people's data returns "Not found"**, not "Forbidden", so existence isn't revealed.
5. **Public API is separate and read-only.** Returns only published content through dedicated public schemas; private fields (emails, messages, drafts) can never leak by accident.
6. **Platform owner role is separate.** `platform_admin` has its own admin API (accounts, plans, themes, usage). It does not edit creators' content by default; any support action is explicit and recorded in the audit log.
7. **Automated isolation tests.** Every content module gets "User A tries to read/edit/delete User B's data → must fail" tests that run on every pull request.
8. **dontworrydev.in is fully separate**: no shared code, database, domain, keys or deployment.

---

## 7. Theme architecture

### Goal

A theme is a **complete website experience**, not a colour scheme. Social, Minimal, Cinematic and Agency can have entirely different pages, layouts, navigation, components and settings — while reading the same creator content.

### Content vs presentation

```
            Creator content (one copy, presentation-neutral)
   profile · projects · brands · media · experience · testimonials …
                              │
                     Portfolio Data API
                              │
        ┌───────────────┬─────┴─────────┬──────────────┐
     Social          Minimal        Cinematic        Agency
  own pages       own pages        own pages       own pages
  own layout      own layout       own layout      own layout
  own components  own components   own components  own components
  own settings    own settings     own settings    own settings
```

- **Content is neutral.** A project has a title, slug, summary, structured body, cover media, gallery, video, role, client (brand), tags, date, "featured" flag. No field exists because one theme wants it.
- **Theme-specific choices live in ThemeSettings**, never on the content. Example: "make this project span two columns" in Agency is stored as a per-item override in Agency's settings, keyed by project id.
- **Switching themes** changes only `portfolio.active_theme`. Content is untouched; each theme's settings are kept, so switching back restores them.

### The theme contract

Each theme is a self-contained folder:

```
themes/social/
  manifest.ts        identity: id, name, description, tier (free/pro), version, preview image
  content.ts         which content sections it supports and how (e.g. reels: required/optional/unsupported)
  settings.ts        its settings schema + defaults + presets + migrate(old → new version)
  routes.ts          its own pages: e.g. "/" , "/projects/[slug]", "/about"
  metadata.ts        how it builds page titles + link-preview cards
  pages/             page components
  components/        components private to this theme
```

| Contract part | What it allows |
|---|---|
| **Own routes/pages** | Social can be a single profile-grid page with project pop-ups; Cinematic can have a full-screen reel homepage and dedicated film pages; Agency can have Work / Team / About pages. |
| **Own components** | Themes don't share layout code. A theme's components live inside its folder. |
| **Content support declaration** | If a theme doesn't show "Reels", the content is kept and the dashboard says "Not shown in this theme". |
| **Settings schema** | Each theme defines its own options (Social: grid vs feed, story highlights; Cinematic: autoplay hero, letterbox). Validated on both frontend and backend. Shared basics (accent colour, font pair, section order/visibility) come from a common base the theme can extend. |
| **Versioned settings** | When a theme gains new options, `migrate()` upgrades old saved settings instead of breaking them. |
| **Tier** | Pro themes/options are gated by the entitlement system, checked on the server. |

### Theme Kit (shared, small)

Themes don't rebuild plumbing. A small shared kit provides: responsive image and video components (§9), contact form logic, link-preview helpers, and the typed portfolio data. Visual layout is never shared — only plumbing.

### Loading and rendering

- `themes/registry.ts` lists installed themes. Adding a theme = add a folder + one registry line.
- Each theme's code is loaded **only when needed**, so a Social portfolio doesn't download Cinematic's code.
- The portfolio surface uses one catch-all route; it loads the portfolio, picks the active theme, and hands the request to that theme's routes.
- The dashboard preview renders the same theme with **draft** data.

### Now vs later

Only **Social** is built. The contract above is what makes Minimal, Cinematic and Agency additive later — no changes to auth, onboarding, content management or the data model.

---

## 8. Design system and reusable components

### Design system

- **Tokens** (colours, typography, spacing, radius, shadows, motion durations) defined once as CSS variables, with a dark-mode set. A brand change is a one-file change.
- **Tailwind CSS** reads these tokens so pages can only use approved values.
- **Direction:** warm and friendly — off-white surfaces, a warm accent, soft shadows, generous rounding, clean sans-serif type, restrained motion. The Instagram-style look belongs only to the Social theme.
- **Icons:** one set (Lucide).

### Components built first (only what's needed now)

| Component | Purpose |
|---|---|
| Button, Input, Textarea, Select, Card, Spinner | Basic building blocks |
| **ModalController** (`useModal`) | One central place that opens/closes/stacks modals |
| **ModalShell** | The one visual frame: radius, shadow, overlay, animation, sizes, mobile full-screen, Escape key, focus trap, scroll lock, loading/error areas, primary/secondary actions |
| **ConfirmationModal** | "Are you sure?" with a danger variant for deletes; `await modal.confirm(...)` |
| **FormModal** | Supply fields + validation + save function; it handles loading, errors, success |
| **Drawer** | Side panel using the same shell behaviour |
| **Toast** | Success/error/info notifications |

Built on **Radix UI** primitives, which provide accessibility (keyboard, focus, screen readers) without imposing any visual style.

**Added later, only when a feature needs them:** MultiStepModal (onboarding/theme set-up), MediaPickerModal (media milestone), UpgradeModal (limits milestone), Dropdown, Tooltip.

Example of reuse:

```ts
modal.form({
  title: "Add testimonial",
  schema: testimonialSchema,
  fields: <TestimonialFields />,
  onSubmit: api.testimonials.create,
});
```

---

## 9. Media architecture

Our users are video editors, designers, photographers and filmmakers, so media is a core system, not an add-on.

### Upload flow (direct to Cloudinary, controlled by our API)

```
 Browser                         Our API                          Cloudinary
   │  1. "I want to upload        │                                   │
   │     clip.mp4, 380 MB"  ─────►│ check type, size, plan storage    │
   │                              │ create Media(status=pending)      │
   │◄──── signed upload ticket ───│ (folder, allowed formats, size)   │
   │                                                                  │
   │  2. upload in chunks, with progress bar  ───────────────────────►│
   │                                                                  │
   │  3. "done" ────────────────► │ verify real size/format with ────►│
   │                              │ Cloudinary; status=ready;         │
   │                              │ add to storage usage              │
   │                              │◄──── 4. webhook: video processed ─│
```

- **Large files never pass through our server.** The browser uploads straight to Cloudinary using a short-lived signed ticket. Our API secret never leaves the server.
- **Chunked, resumable uploads** for large video; progress bars from upload events; clear errors with retry.
- **Validation at four layers:** instant check in the browser (friendly message) → our API before issuing the ticket (type, size, storage remaining) → Cloudinary enforces the signed limits → our API verifies the real file after upload and records its true size.
- **Storage limits:** usage is the sum of each workspace's ready media. Pending uploads reserve space so two parallel uploads can't exceed the limit. Limits come from the entitlement system (§10).

### Media library and reuse

- Media belongs to the workspace's **library**, not to one project. Projects, brands and profile reference media by **id**, never by URL.
- The same video can appear in several projects without uploading twice.
- Deleting media warns where it is used. Deletion is soft first, then removed from Cloudinary.

### Video specifics

- **Automatic thumbnail** generated from the video.
- **Custom poster:** choose a frame (stored as a timestamp) or upload a separate image (stored as a media reference).
- **Adaptive streaming** for long videos, so playback adjusts to the viewer's connection.
- **External embeds** (YouTube / Vimeo links) as a media type: zero storage cost, valuable for filmmakers with existing channels.

### Optimised delivery

- One shared **URL builder** creates every media URL: automatic format (WebP/AVIF) and quality, responsive sizes (`srcset`) for phones through large screens, lazy loading, low-quality placeholders.
- Themes use the shared image/video components from the Theme Kit, so every theme gets optimised delivery automatically.

### Flexibility and cost

- Cloudinary sits behind a small **media provider interface**, so it could later be swapped or complemented (e.g. Cloudflare Stream or Mux for heavy video) without touching features.
- **Video bandwidth is the largest future cost driver.** Plan limits will include video storage/duration, and embeds give free-plan users an alternative.
- Note: Cloudinary's maximum file size depends on the Cloudinary plan; free-plan limits are lower than paid plans. We'll configure our own limits per CheckMeOut plan within those bounds.

---

## 10. Plans, limits and entitlements

All plan limits live in **one** place:

```py
PLANS = {
  "free": {"brands.max": 5,  "projects.published.max": 6,   "storage.mb": 500,
           "video.max_upload_mb": 100, "themes.pro": False, "custom_domain": False},
  "pro":  {"brands.max": 50, "projects.published.max": 100, "storage.mb": 10000,
           "video.max_upload_mb": 2000, "themes.pro": True,  "custom_domain": True},
}
```

(Numbers are placeholders.)

- **Backend:** every limited action calls `entitlements.require(workspace, "brands.max")`. Over the limit → a standard "limit reached" error.
- **Frontend:** asks the API for "my limits and usage" to show progress bars and upgrade prompts. It never contains a limit number.
- **Payments later:** Subscription already has empty provider fields. Razorpay is likely first for India; Stripe can be added alongside. Feature code doesn't change.

---

## 11. Infrastructure and costs

| Need | Choice | Starting cost |
|---|---|---|
| Frontend + wildcard subdomains | Vercel | Free while building; **Pro ($20/mo) required once charging customers** (free tier is non-commercial) |
| Backend | Render or Railway | Free tier (sleeps when idle) → ~$7/mo always-on |
| Database | MongoDB Atlas | Free (512 MB) to start |
| Media | Cloudinary | Free tier to start |
| Email | Resend | Free up to 3,000 emails/month |
| Domain | `checkmeout.in`, DNS on Vercel (needed for `*.checkmeout.in`) | ~₹800/year |

**Main libraries:** Next.js, TypeScript, Tailwind CSS, Radix UI, React Hook Form + Zod, TanStack Query, Lucide (frontend); FastAPI, Pydantic, PyMongo (async), argon2-cffi, Authlib, pytest, Ruff (backend). Each is introduced in the milestone that first needs it.

---

## 12. Development approach and milestones

**Principles**

- Each milestone is one focused pull request that delivers something you can **run and test**.
- Modules are built when a milestone needs them — not because they are listed here.
- Every PR: production build, tests, review of the diff for regressions and security, plain-language summary. Never merged, pushed to `main` or deployed without approval.

| # | Milestone | What you can test afterwards |
|---|---|---|
| **1** | **Project skeleton & routing** (detailed below) | Three addresses locally show three different surfaces; dashboard shows "API connected" |
| 2 | Design system + core components + modal controller/shell, confirmation, form modal, drawer, toasts; a hidden component showcase page | Click through every component and modal; keyboard and mobile behaviour |
| 3 | Backend foundation: database connection, User/Workspace/Membership/Portfolio models, access check, tenant guard, entitlements config; isolation tests | Automated tests proving data isolation and limits |
| 4 | Email/password auth: register, verify email, login, logout, password reset; protected dashboard shell | Create an account, log in/out, reset a password |
| 5 | Google sign-in + basic account settings | Sign in with Google; change name/password |
| 6 | Onboarding: username (live availability), profession, profile details, social links; skippable and resumable | Complete or skip onboarding and resume later |
| 7 | Theme registry + Social theme (profile-only content) + dashboard preview + publish | Publish a live portfolio at `yourname.localhost` |
| 8 | Media foundation: upload pipeline, progress/errors, media library, storage limits, profile image | Upload images/videos with progress; see limits enforced |
| 9 | Projects + Brands using media, entitlement-limited, rendered in Social | A real portfolio with projects and brands |
| 10 | Marketing landing page | The public product page |
| 11 | Platform admin basics: accounts, status, plans, usage | Manage creators as platform owner |
| Later | Testimonials, messages, posts/reels, experience/journey, payments, custom domains, more themes, teams | — |

### Milestone 1 — detailed scope

**Goal:** a clean, running skeleton that proves the riskiest plumbing (one app, three subdomains, frontend ↔ backend) before any features exist.

**Included**

1. **Repository layout:** `frontend/`, `backend/`, `docs/` as in §4 (only the folders this milestone uses).
2. **Frontend (Next.js + TypeScript)**
   - Central config: `ROOT_DOMAIN`, `APP_SUBDOMAIN`, reserved usernames, read from environment variables with safe local defaults.
   - Middleware with the host-routing rules from §3, as a small pure function so it can be unit-tested.
   - Three placeholder surfaces: marketing (`localhost:3000`), dashboard (`app.localhost:3000`), portfolio (`priya.localhost:3000` showing "Portfolio for: priya").
   - Reserved names and invalid usernames → friendly 404.
   - `/api/*` forwarded to the backend; the dashboard placeholder shows the API health status.
   - Unit tests for host routing (marketing, app, portfolio, reserved, invalid, uppercase, ports, preview fallback).
3. **Backend (FastAPI)**
   - App structure (`core/`, `shared/`, `modules/`) with settings loaded from environment variables.
   - `GET /api/health` returning service status and version.
   - Standard error format all future endpoints will use.
   - Tests for health and error format.
4. **Quality and automation**
   - Linting/formatting (ESLint + Prettier, Ruff).
   - GitHub Actions workflow: frontend type-check, lint, tests, production build; backend lint and tests — on every PR.
   - `.env.example` files listing every setting (no real secrets committed).
5. **Docs:** `docs/ARCHITECTURE.md` (this file), `docs/DECISIONS.md` (short log of key decisions), `docs/LOCAL_DEVELOPMENT.md` (how to run it, including the subdomain setup and Safari fallback).

**Not included:** design system, modals, database, authentication, onboarding, themes, media. Those are milestones 2–9.

**Done when:** both apps run locally with one command each; the three addresses show the right surfaces; dashboard shows "API: healthy"; all tests, lint and production build pass in GitHub Actions.
