# CheckMeOut — Architecture

> Status: **Draft for approval** (revision 3). Nothing in this document is built yet.
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

**The honest trade-off:** we take on responsibility a hosted service would handle for us. That is only acceptable if the controls below are treated as **requirements**, not nice-to-haves.

### Required security controls (implementation requirements)

Every control below is **mandatory** in the milestone listed. A milestone is not complete — and its PR is not ready for approval — until each control is implemented **and** covered by the automated tests listed. No home-made cryptography: only proven libraries (`argon2-cffi`, Python `secrets`/`hashlib`, Authlib).

| Control | Requirement | Milestone |
|---|---|---|
| **Password storage** | Argon2id hashing. Passwords 10–128 characters. Never logged or returned. | 4 |
| **Secure cookies** | Session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, **no `Domain` attribute** (host-only, so only `app.checkmeout.in` receives it). Production name uses the `__Host-` prefix, which makes browsers enforce these rules. Local development disables `Secure` only because it runs over plain `http`. | 4 |
| **Sessions** | Random 256-bit token; only its SHA-256 hash is stored. Idle expiry (7 days) and absolute expiry (30 days). A new session is issued on every login (prevents session fixation). | 4 |
| **Session revocation** | Logout deletes the session server-side. "Log out of all devices" in account settings. **All sessions revoked** automatically on password change, password reset, and account suspension. Every request checks the session in the database, so revocation is immediate. | 4 (settings UI in 5) |
| **CSRF protection** | Every state-changing request (`POST/PUT/PATCH/DELETE`) must (a) carry an `Origin` header matching the allowed app origin, and (b) include a CSRF token (double-submit: token in a readable cookie, echoed in an `X-CSRF-Token` header). `SameSite=Lax` is an extra layer, not the only one. | 4 |
| **Rate limiting** | Stored in MongoDB (auto-expiring records; no Redis needed). Limits by **both** IP and account/email: login, registration, password-reset request, verification-email resend, username checks. Exceeding returns HTTP 429 with a "try again later" message. Limits live in config. | 4 |
| **Email verification** | Single-use, hashed, 24-hour token sent on registration. Unverified users can sign in and set up their profile but **cannot publish** a portfolio. Resend is rate limited. Google accounts count as verified only if Google says the email is verified. | 4 |
| **Password reset** | Single-use, hashed, 30-minute token. The "forgot password" response is identical whether or not the email exists (no account enumeration). Successful reset revokes all sessions and sends a "your password was changed" email. | 4 |
| **Generic errors** | Login failures always say "email or password is incorrect"; no hint which part was wrong. | 4 |
| **Google sign-in** | OAuth with `state` and PKCE, validated `id_token` (issuer, audience, expiry, nonce). An existing email/password account is linked only when Google confirms the email is verified. | 5 |
| **Audit trail** | Login, logout-all, password change/reset and suspension events recorded (no secrets in logs). | 4 |

**Required automated security tests** (run on every PR in GitHub Actions):

- Cookie flags present and correct on every `Set-Cookie`; no `Domain` attribute.
- Wrong password, unknown email → identical response; rate limit triggers after the configured attempts → 429.
- State-changing request without CSRF token, or with a foreign `Origin` → rejected.
- Session cookie unusable after logout, after "log out everywhere", after password reset, and after suspension.
- Expired, reused, or tampered reset and verification tokens → rejected.
- Unverified user cannot publish.
- Session token stored only as a hash (database never contains the raw token).
- Google: invalid `state` / bad `id_token` / unverified email linking → rejected.

**Process requirements:** each auth PR includes a security review of the diff, and the PR description lists every control above with its test.

**Keeping auth behind one boundary.** The rest of the app only ever asks "who is the current user?" (`get_current_user`). If we ever switch to Clerk or similar, only the auth module changes.

**Later, not now:** authenticator-app MFA and breached-password checks — both fit inside the same module.

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

The frontend has a small **request proxy** file (`src/proxy.ts` — Next.js 16 renamed the older `middleware.ts` convention to `proxy.ts`) that runs before every page:

1. Read the address the visitor typed, e.g. `priya.checkmeout.in`.
2. Remove the configured root domain (`checkmeout.in`) → leftover is `priya`.
3. Decide:
   - nothing left → **marketing** pages
   - `app` → **dashboard** pages
   - a reserved word (`www`, `api`, `admin`, `mail`, `help`, …) → redirect or 404
   - anything else → **portfolio** pages for username `priya`
4. Internally rewrite to the right folder (the visitor still sees `priya.checkmeout.in`).

The decision logic is a small pure function with its own unit tests, so it can be checked without a browser. Locally the root domain is simply `localhost:3000` instead of `checkmeout.in`, so **the exact same code path** runs in development and production.

### Local development — verified

**Why `priya.localhost` works with no setup:** the `.localhost` name is reserved for "this computer" by internet standards (RFC 6761), and Chrome, Edge and Firefox resolve every `*.localhost` address to your own machine without any configuration.

*Verified on 2026-11-18* with Chromium against a local test server:

| Visited | Server saw `Host` | Login cookie sent? |
|---|---|---|
| `localhost:3999` | `localhost:3999` | — |
| `app.localhost:3999` (after a login set a cookie) | `app.localhost:3999` | **yes** |
| `priya.localhost:3999` | `priya.localhost:3999` | **no** — host-only cookie stays on `app` |

This confirms both the routing input (the full hostname reaches our code) and the cookie isolation we rely on in production.

**Safari** does not reliably resolve `*.localhost`. Fallbacks, documented in `docs/LOCAL_DEVELOPMENT.md`:
- `priya.lvh.me:3000` — a public DNS name that always points to `127.0.0.1` (needs internet for the DNS lookup; set `ROOT_DOMAIN=lvh.me:3000`).
- Or one line per test name in the computer's hosts file.

### Production setup on Vercel

What has to be configured when we deploy (not part of Milestone 1):

1. **Add domains to the Vercel project:** `checkmeout.in`, `app.checkmeout.in` and the wildcard `*.checkmeout.in` (plus `www.checkmeout.in` redirecting to the apex).
2. **DNS for the wildcard.** Vercel can only issue the wildcard HTTPS certificate if it controls the DNS challenge. The documented approach is to point the domain's nameservers at Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). Vercel also documents an alternative that keeps the registrar's nameservers; we'll choose at deployment time. Any email DNS records (e.g. for Resend) are then managed in Vercel DNS.
3. **Environment variables** on Vercel: `ROOT_DOMAIN=checkmeout.in`, `APP_SUBDOMAIN=app`, `API_ORIGIN=<backend URL>`, plus the backend-origin secret (below).
4. **API forwarding.** Requests to `app.checkmeout.in/api/*` are forwarded by the frontend to the FastAPI server on Render/Railway (an *external rewrite*). Known Vercel limits for external rewrites: the backend must start responding within **120 seconds**. Large request bodies are not an issue for us because **media uploads go directly to Cloudinary**, never through `/api`; API requests are small JSON.
5. **Backend origin lock.** The forwarding step adds a secret header; in production the backend rejects requests without it. This stops anyone bypassing Vercel (and our IP-based rate limits) by calling the raw backend URL directly. The backend trusts `X-Forwarded-For` only on requests carrying that secret.
6. **Preview deployments** (`checkmeout-abc.vercel.app`) have no subdomains, so on non-production hosts only, portfolios can be opened via a path fallback (`/_preview/priya`).

**Custom domains later** (`priya.com`): the proxy sees an unknown host, asks the API "which portfolio owns this domain?", and continues down the same portfolio path. Vercel provides an API for adding customer domains to the project; no redesign needed.

### Where the login cookie lives

The dashboard calls the API through `app.checkmeout.in/api/...` (same site, forwarded as above). Because of that, the session cookie belongs **only to `app.checkmeout.in`** (host-only, verified above):

- Public portfolio subdomains never receive a creator's session cookie.
- No cross-domain cookie or CORS configuration.
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
│       ├── proxy.ts              reads the address, routes to the right surface
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

1. **Ownership comes from the session, not the request.** "Edit project 42" becomes "find project 42 *that belongs to a portfolio this user can edit*". Changing an id in the URL finds nothing. Any `workspace_id` or `portfolio_id` sent in a request body is **ignored**; the server works it out itself.
2. **One access-check function** — `require_access(user, workspace, action)`. Today it means "user has a membership in this workspace". Later it reads member roles. Every feature calls this; none invents its own rule.
3. **One tenant guard for database access** (`shared/tenancy.py`). Feature code receives a *scoped* data-access object that automatically adds the workspace (and portfolio, where relevant) to every query, insert, update and delete. Unscoped queries on tenant collections are not available to feature code.
4. **Other people's data returns "Not found"**, not "Forbidden", so existence isn't revealed.
5. **Public API is separate and read-only.** Returns only published content through dedicated public schemas; private fields (emails, messages, drafts) can never leak by accident.
6. **Platform owner role is separate.** `platform_admin` has its own admin API (accounts, plans, themes, usage). It does not edit creators' content by default; any support action is explicit and recorded in the audit log.
7. **dontworrydev.in is fully separate**: no shared code, database, domain, keys or deployment.

### Workspace scoping — required for every portfolio and media operation

| Operation | Scoping rule |
|---|---|
| Portfolio read/update/publish/delete | Portfolio is loaded **by id AND workspace**; the workspace must be one the user is a member of. |
| Content (projects, brands, …) | Loaded by id **AND** portfolio **AND** workspace. |
| Media list/read/update/delete | Loaded by id **AND** workspace. |
| Upload ticket | Issued only for the user's workspace; the signed ticket fixes the Cloudinary folder to that workspace (`cmo/<workspace_id>/…`), so an upload can't land in, or overwrite, another workspace's files. |
| Upload confirmation | Accepted only if the Cloudinary asset is inside that workspace's folder and matches a pending upload created by that workspace. |
| Attaching media to content | Every media id referenced by a project/brand/profile must belong to the **same workspace**; otherwise the save is rejected. This stops someone "borrowing" another creator's media by guessing its id. |
| Usage/storage counters | Calculated and enforced per workspace. |

Published media is delivered via public CDN URLs by design (that's how public portfolios work). Unpublished media URLs are hard to guess but not secret; truly private media would use Cloudinary authenticated delivery, if a feature ever needs it.

### Required isolation tests

Run on every pull request; a module touching portfolio or media data is not complete without them. Tests use **two users in two separate workspaces** (and, once teams exist, a second member inside the same workspace):

- **Cross-user / cross-workspace reads:** user B requesting user A's portfolio, content and media by id → 404. Lists only ever contain the caller's own items.
- **Cross-workspace writes:** update, delete, publish, reorder of another workspace's items → 404 and nothing changed in the database.
- **Forged ids:** requests that include another workspace's `workspace_id` / `portfolio_id` in the body or query → ignored or rejected; data stays in the caller's own workspace.
- **Media borrowing:** attaching another workspace's media id to your project → rejected.
- **Upload confirmation:** confirming an upload created by another workspace, or an asset outside your folder → rejected.
- **Public API:** never returns drafts, unpublished items, emails or messages.
- **Suspended accounts:** sessions revoked; requests rejected.
- **Route coverage guard:** an automated test inspects every API route and **fails the build** if a non-public route is missing the authentication and access-check dependency. New features can't forget it.

The guard, scoped data access and the core tests arrive in Milestone 3; each later module adds its own cases.

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

### Platform layer vs theme: who owns what

The platform provides **data and utilities only**. It never dictates page structure, navigation or layout.

| The platform provides | The theme owns — completely |
|---|---|
| The creator's content, already loaded and typed (`PortfolioData`) | Which pages exist and their URLs |
| The theme's validated settings | Page structure and layout of every page |
| Theme Kit utilities (below) | Navigation: top bar, sidebar, tabs, full-screen menu, or none at all |
| A bare page wrapper (`<html>`/`<body>`, analytics hook, "Made with CheckMeOut" badge where the plan requires it) | Header, footer, hero, grid, transitions, scroll behaviour |
| | Its own components, fonts and styles |
| | Its own "page not found" inside the portfolio |

There is **no shared portfolio skeleton**: no common header, no fixed section order, no mandatory "About / Projects / Contact" structure. The illustrative examples below show how different themes can be:

| | Social | Minimal / Editorial | Cinematic | Agency |
|---|---|---|---|---|
| **Pages** | One profile page; project detail opens as an overlay | Home, Work index, long-form project pages, About | Full-screen showreel home, one page per film | Home, Work, Team, Services, Contact |
| **Navigation** | Profile tabs (grid / reels / tagged-style) | Quiet text links | Hidden menu over full-bleed video | Classic top navigation bar |
| **Layout** | Square grid, stories row | Typographic columns, lots of white space | Edge-to-edge video, letterboxed sections | Case-study grids, team cards |

(These are design directions, not commitments; only Social is built now.)

### Theme Kit (shared utilities, no visuals)

Themes don't rebuild plumbing. The kit provides: typed portfolio data and helpers (e.g. "projects sorted by featured, then date"), responsive image and video **elements** with optimised delivery (§9), contact-form submission logic, link-preview/SEO helpers, and accessibility helpers. Kit pieces are unstyled or minimally styled so each theme decides how they look. Layout components are never shared.

**Security benefit:** themes receive only the public portfolio data handed to them. They cannot call private APIs or read other portfolios.

### Loading and rendering

- `themes/registry.ts` lists installed themes. Adding a theme = add a folder + one registry line.
- Each theme's code is loaded **only when needed**, so a Social portfolio doesn't download Cinematic's code.
- The portfolio surface has **one catch-all route** that loads the portfolio, picks the active theme, and passes the requested path to **that theme's route table** — the theme decides which page (or its own 404) to show. This is what lets each theme have genuinely different page structures.
- **URLs across theme switches:** each project keeps a stable slug regardless of theme. If a visitor arrives at a path the new theme doesn't have (e.g. an old `/projects/brand-film` link), the platform asks the theme where that item now lives and redirects, or falls back to the portfolio home.
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
   │  2. upload with progress bar (chunked for large files) ─────────►│
   │                                                                  │
   │  3. "done" ────────────────► │ verify real size/format with ────►│
   │                              │ Cloudinary; status=ready;         │
   │                              │ add to storage usage              │
   │                              │◄──── 4. webhook: video processed ─│
```

- **Large files never pass through our server.** The browser uploads straight to Cloudinary using a short-lived signed ticket. Our API secret never leaves the server.
- **Progress bars** from browser upload events; clear error messages with a retry button. Chunked uploads for large files are phased in (see "What we'll build, and when" below).
- **Validation at four layers:** instant check in the browser (friendly message) → our API before issuing the ticket (type, size, storage remaining) → Cloudinary enforces the signed limits → our API verifies the real file after upload and records its true size.
- **Storage limits:** usage is the sum of each workspace's ready media. Pending uploads reserve space so two parallel uploads can't exceed the limit. Limits come from the entitlement system (§10).

### Media library and reuse

- Media belongs to the workspace's **library**, not to one project. Projects, brands and profile reference media by **id**, never by URL.
- The same video can appear in several projects without uploading twice.
- Deleting media warns where it is used. Deletion is soft first, then removed from Cloudinary.

### Video specifics

- **Automatic thumbnail** generated from the video.
- **Custom poster:** choose a frame (stored as a timestamp) or upload a separate image (stored as a media reference).
- **Adaptive streaming** for long videos, so playback adjusts to the viewer's connection — a later phase, see below.
- **External embeds** (YouTube / Vimeo links) as a media type: zero storage cost, valuable for filmmakers with existing channels.

### Cloudinary capabilities — what is verified and what isn't

Checked against Cloudinary's documentation and support articles on 2026-11-18. **Anything marked "verify" must be confirmed on our actual Cloudinary account before we build on it.**

| Capability | What Cloudinary documents | Status |
|---|---|---|
| Signed direct browser uploads | Supported; signature generated server-side | Confirmed |
| Upload progress | Comes from the browser's own upload events (not a Cloudinary feature) | Confirmed |
| Chunked uploads | Supported: every chunk carries the same `X-Unique-Upload-Id` and a `Content-Range` header; chunks must be at least 5 MB except the last; recommended for files over 100 MB | Confirmed (mechanism) |
| "Resumable" uploads | A failed **chunk** can be retried within the same upload session. Resuming after the browser tab is closed or the page reloads is **not** documented as guaranteed | **Do not promise** |
| Maximum file size | Depends on the Cloudinary plan and account settings. Long-standing free-plan figures are about **10 MB per image and 100 MB per video**; paid plans are higher. Chunking does **not** lift the plan's total-size cap | **Verify** in our account's "Usage limits" |
| Video thumbnails / frame posters | Generated by URL transformation (pick a timestamp) | Confirmed |
| Responsive images, auto format/quality | `f_auto`, `q_auto`, width transformations | Confirmed |
| Adaptive bitrate streaming (HLS/DASH) | Documented (`sp_auto` streaming profiles); Cloudinary states it is available on all plans including Free, but transcoding consumes plan credits (Free = 25 credits/month) and only some transformations combine with it | **Verify** credit cost on our account before enabling |
| Processing webhooks | Supported via notification URLs | Confirmed |

### What we'll build, and when (no overpromising)

| Phase | Scope | Pre-condition |
|---|---|---|
| **Media foundation (Milestone 8)** | Signed direct uploads of images and short videos, single-request upload, progress bar, errors + retry, four-layer validation, storage limits with reservation, media library and reuse, automatic video thumbnail, responsive image delivery, plain MP4 video with `f_auto`/`q_auto`, YouTube/Vimeo embeds | File-size limits read from our Cloudinary account and set in our plan config, never above Cloudinary's |
| **Large video** | Chunked uploads with per-chunk retry | Our Cloudinary plan's max video size confirmed; a short test spike on the real account |
| **Custom posters** | Choose a frame or upload a poster image | — |
| **Adaptive streaming** | HLS via `sp_auto` for longer videos | Credit cost measured on real sample videos; confirmed it fits the business model |
| **Heavy video at scale** | Possibly a dedicated video provider (Mux, Cloudflare Stream) alongside Cloudinary | Only if usage and costs justify it |

The **media provider interface** exposes capability flags (e.g. `supports_chunked_upload`, `supports_adaptive_streaming`, `max_upload_bytes`). The upload UI and video player read these flags, so a capability is switched on in one place when it's ready — or provided by a different provider — without changing features.

### Optimised delivery

- One shared **URL builder** creates every media URL: automatic format (WebP/AVIF) and quality, responsive sizes (`srcset`) for phones through large screens, lazy loading, low-quality placeholders.
- Themes use the shared image/video components from the Theme Kit, so every theme gets optimised delivery automatically.

### Flexibility and cost

- Cloudinary sits behind a small **media provider interface**, so it could later be swapped or complemented (e.g. Cloudflare Stream or Mux for heavy video) without touching features.
- **Video bandwidth is the largest future cost driver.** Plan limits will include video storage/duration, and embeds give free-plan users an alternative.
- CheckMeOut plan limits (e.g. maximum video upload size) are always set **at or below** the limits of our own Cloudinary plan; the provider's limits are the hard ceiling.

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
| 3 | Backend foundation: database connection, User/Workspace/Membership/Portfolio models, access check, scoped data access, route-coverage guard, entitlements config; cross-user/cross-workspace isolation tests (§6) | Automated tests proving data isolation and limits |
| 4 | Email/password auth with **every** required control in §2 (secure cookies, sessions + revocation, CSRF, rate limiting, email verification, password reset, audit events) and their security tests; protected dashboard shell | Create an account, verify email, log in/out, reset a password; security test suite passes |
| 5 | Google sign-in (state, PKCE, token validation, safe account linking) + account settings incl. "log out of all devices"; security tests | Sign in with Google; change name/password; log out everywhere |
| 6 | Onboarding: username (live availability), profession, profile details, social links; skippable and resumable | Complete or skip onboarding and resume later |
| 7 | Theme registry + Social theme (profile-only content) + dashboard preview + publish | Publish a live portfolio at `yourname.localhost` |
| 8 | Media foundation as scoped in §9 (signed direct uploads, progress/errors, validation, storage limits, library, thumbnails, responsive delivery, embeds) + media isolation tests. Chunked uploads and adaptive streaming are later phases | Upload images/short videos with progress; see limits enforced |
| 9 | Projects + Brands using media, entitlement-limited, rendered in Social | A real portfolio with projects and brands |
| 10 | Marketing landing page | The public product page |
| 11 | Platform admin basics: accounts, status, plans, usage | Manage creators as platform owner |
| Deploy | First production deployment, **only when you approve it**: Vercel domains + wildcard DNS, environment variables, backend origin lock (§3) | Live at checkmeout.in |
| Later | Large-video chunked uploads, adaptive streaming, testimonials, messages, posts/reels, experience/journey, payments, custom domains, more themes, teams | — |

### Milestone 1 — detailed scope

**Goal:** a clean, running skeleton that proves the riskiest plumbing (one app, three subdomains, frontend ↔ backend) before any features exist.

**Included**

1. **Repository layout:** `frontend/`, `backend/`, `docs/` as in §4 (only the folders this milestone uses).
2. **Frontend (Next.js + TypeScript)**
   - Central config: `ROOT_DOMAIN`, `APP_SUBDOMAIN`, reserved usernames, read from environment variables with safe local defaults.
   - Request proxy (`proxy.ts`) with the host-routing rules from §3, as a small pure function so it can be unit-tested.
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

---

## Appendix: references checked (2026-11-18)

Provider behaviour and pricing change; re-check these before relying on them.

- Cloudinary — [Upload API and chunked uploads](https://cloudinary.com/documentation/upload_images), [Chunked upload guidelines](https://support.cloudinary.com/hc/en-us/articles/360020778859-How-to-Chunk-Upload-with-Vanilla-Javascript-to-Cloudinary), [File size limits by plan](https://support.cloudinary.com/hc/en-us/articles/202520592-Do-you-have-a-file-size-limit), [Adaptive bitrate streaming](https://cloudinary.com/blog/plug_and_play_adaptive_bitrate_streaming_with_hls_and_mpeg_dash), [Plans and pricing](https://cloudinary.com/pricing)
- Vercel — [Multi-tenant domain configuration (wildcard + nameservers)](https://vercel.com/docs/platforms/multi-tenant-platforms/configuring-domains), [Wildcard domain without Vercel nameservers](https://vercel.com/kb/guide/wildcard-domain-without-vercel-nameservers), [Platform limits](https://vercel.com/docs/limits), [External rewrite timeout raised to 120 s](https://vercel.com/changelog/cdn-origin-timeout-increased-to-two-minutes)
- Next.js — [`proxy.ts` (formerly middleware)](https://nextjs.org/docs/app/api-reference/file-conventions/middleware)
- Auth pricing — [Clerk plans](https://clerk.com/changelog/2026-02-05-new-plans-more-value), [Supabase pricing overview](https://makerkit.dev/blog/saas/supabase-pricing)
- `*.localhost` behaviour — verified locally with Chromium (see §3); reserved by RFC 6761.
