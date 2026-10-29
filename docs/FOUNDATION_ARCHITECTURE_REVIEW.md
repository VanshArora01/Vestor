# Vestor — Foundation Milestone: Architecture Review

Companion to `VESTOR_MASTER.md`. This document covers only the foundation phase (auth + skeleton). The executable Cursor prompt is in `CURSOR_FOUNDATION_PROMPT.md`.

---

## 1. FOUNDATION SCOPE

Establish, and only establish: repo structure, frontend shell, backend skeleton (API → Service → Repository → DB), database connection + User table, JWT auth, API conventions, and a working local dev environment. No business modules, no AI, no Celery jobs beyond what's genuinely needed here (none are).

---

## 2. PROPOSED API ENDPOINTS

| Method | Path | Auth | Foundation? | Reason |
|---|---|---|---|---|
| GET | `/api/v1/health` | none | Yes | Verifies the app + DB connection are up. Needed for local dev sanity check and later deployment health checks. |
| POST | `/api/v1/auth/register` | none | Yes | Core auth flow — required to create the User row the rest of the app depends on. |
| POST | `/api/v1/auth/login` | none | Yes | Core auth flow. |
| GET | `/api/v1/auth/me` | required | Yes | Every future module needs "who is the current user" — this is the pattern every protected route will follow. |
| POST | `/api/v1/auth/logout` | — | **No** | See analysis below. |
| GET | `/api/v1/config` | — | **No** | No feature flags or dynamic config exist yet (nothing to configure). Adding this now is a speculative endpoint with no consumer — classic YAGNI violation. Add it only when Phase 4 subscription gating creates an actual need. |

**On logout**: with a stateless JWT and no refresh-token/blacklist mechanism (neither of which the foundation needs yet), the server has no session to invalidate — the token stays valid until it expires regardless of what the server does. A `POST /auth/logout` endpoint in this architecture would do nothing except waste a network call. **Recommendation: no backend logout endpoint in the foundation.** The frontend simply discards the stored token and redirects to login. If a token-revocation requirement shows up later (e.g. "log out of all devices"), that's the point to introduce a token blacklist or refresh-token rotation — not before.

**Versioning**: using `/api/v1` prefix from day one, even though there's no v2 anywhere on the horizon — retrofitting a version prefix after routes exist and a frontend depends on unprefixed paths is real, avoidable pain. This is infrastructure, not a "future feature," so it belongs in the foundation.

No Finance/Goals/Dashboard/Academy/Portfolio/Market/Advisor endpoints — confirmed, per scope.

---

## 3. FRONTEND FOLDER STRUCTURE

```
frontend/
  src/
    app/
      App.tsx              # root component, providers, router mount
      routes.tsx            # route definitions, incl. placeholder module routes
    pages/
      auth/
        LoginPage.tsx
        RegisterPage.tsx
      dashboard/DashboardPage.tsx     # placeholder only
      finance/FinancePage.tsx         # placeholder only
      goals/GoalsPage.tsx             # placeholder only
      academy/AcademyPage.tsx         # placeholder only
      portfolio/PortfolioPage.tsx     # placeholder only
      market/MarketPage.tsx           # placeholder only
      advisor/AdvisorPage.tsx         # placeholder only
      NotFoundPage.tsx
    components/
      ui/                   # generic reusable: Button, Input, Card, Spinner
      layout/               # AppShell, Navbar, ProtectedRoute
    features/
      auth/
        components/         # LoginForm, RegisterForm
        hooks/               # useLogin, useRegister, useAuth
    api/
      client.ts              # single fetch/axios instance, base URL, auth header injection, 401 interceptor
      auth.ts                 # register/login/me calls, typed
    context/
      AuthContext.tsx          # holds user + token state, exposes login/logout functions
    types/
      user.ts
      api.ts                    # shared response/error envelope types
    utils/
      tokenStorage.ts            # get/set/clear token — one place, not scattered localStorage calls
    config/
      env.ts                      # reads import.meta.env, validates required vars exist
    styles/
      globals.css
  .env.example
  tailwind.config.ts
  tsconfig.json
  vite.config.ts
  package.json
```

**Why this shape**: `api/` is the only layer allowed to know about HTTP — components and pages never call `fetch` directly, they call typed functions from `api/`. `features/auth/` groups auth-specific UI/logic together rather than scattering it across `components/` and `pages/`; every future module (Finance, Goals, ...) gets its own folder under `features/` following the same pattern, so this choice is what makes the structure scale without a redesign later. Placeholder pages are literally just a heading and "Coming soon" — no logic, no API calls, no state.

---

## 4. BACKEND FOLDER STRUCTURE

```
backend/
  app/
    main.py                    # FastAPI app instance, mounts routers, CORS, startup
    core/
      config.py                 # Settings (pydantic-settings), reads env vars
      security.py                # password hashing, JWT encode/decode
      exceptions.py                # custom exception classes + global handler
      logging.py                    # logging config
    api/
      v1/
        router.py                   # aggregates all v1 routers under /api/v1
        endpoints/
          health.py
          auth.py
    schemas/                     # Pydantic request/response models (API-facing shape)
      user.py
      auth.py
      common.py                    # shared error envelope schema
    models/                       # SQLAlchemy ORM models (DB-facing shape)
      base.py                       # declarative Base + timestamp mixin
      user.py
    repositories/                  # DB queries only, no business logic
      user_repository.py
    services/                       # business logic (hash password, check duplicate email, issue token)
      auth_service.py
    db/
      session.py                     # engine, SessionLocal, get_db dependency
      base.py                         # imports all models, used by Alembic
    dependencies/
      auth.py                         # get_current_user dependency, used by every future protected route
  alembic/
    versions/
    env.py
  alembic.ini
  requirements.txt
  .env.example
```

**Why this shape**: mirrors `VESTOR_MASTER.md`'s API → Service → Repository → DB rule exactly. `schemas/` (API shape) and `models/` (DB shape) are kept separate on purpose — a User's API response should never be "whatever columns happen to be in the table," it should be an explicit, reviewable contract. Every future module (Finance, Goals, ...) adds one file to each of `schemas/`, `models/`, `repositories/`, `services/`, and `api/v1/endpoints/` — no restructuring needed when Phase 1's real modules start.

---

## 5. DATABASE FOUNDATION

Only the `users` table is created in this milestone:

| column | type | notes |
|---|---|---|
| id | UUID, PK | |
| email | text, unique, indexed | |
| password_hash | text | never store plaintext, never return in any response |
| name | text | |
| created_at | timestamp | |
| updated_at | timestamp | added beyond the original DATA_MODEL.md spec — standard audit column, no downside to including now |

**Why not create all Vestor tables now, even though `DATA_MODEL.md`/`VESTOR_MASTER.md` already define them**: those schemas were designed on paper, not against real queries. Locking in every table before Finance/Goals/Academy are actually implemented risks discovering a real constraint (an index that's needed, a relationship that's awkward) after migrations already exist and have to be reworked. Alembic migrations should land module-by-module, matching the phase that module is actually built in — this is the same "don't build ahead of the phase" principle the roadmap already applies everywhere else, just applied to schema instead of features.

---

## 6. AUTHENTICATION ARCHITECTURE

**Registration flow**: `POST /auth/register` → validate email format + password length (min 8 chars) via Pydantic schema → check email uniqueness (service layer, via repository) → hash password → create user row → issue an access token immediately and return it with the user object. **Auto-login on register is a deliberate choice** — see Section 9, flagged for approval, since it wasn't explicit in `VESTOR_MASTER.md`.

**Password hashing**: Argon2 (via `argon2-cffi`), not bcrypt — Argon2 is OWASP's current recommendation and has no legacy-compatibility reason to avoid it here since this is a new project.

**Login flow**: `POST /auth/login` → look up user by email → verify password against stored hash → issue access token → return token + user.

**Token creation**: JWT signed with HS256, secret from env (`SECRET_KEY`, never hardcoded, never committed). Payload: `sub` (user id), `exp`. Expiry: 7 days for the foundation — no refresh-token flow exists yet, so a short-lived token would just log users out constantly with nothing to renew it. This is a simplification appropriate for a student project's current stage, not a production-final security posture — flagged in Section 9.

**Token validation**: `dependencies/auth.py` — extracts the Bearer token from the `Authorization` header, verifies signature and expiry, loads the user via the repository, raises 401 on any failure. Every future protected endpoint (Finance, Goals, everything) depends on this one dependency — get it right once here.

**Current-user retrieval**: `GET /auth/me` simply calls the same `get_current_user` dependency and returns the user object — no separate logic.

**Frontend token handling**: stored via `utils/tokenStorage.ts`, wrapping `localStorage`. **This is flagged for approval in Section 9** — localStorage is simpler than httpOnly cookies for a SPA with no separate backend session, but carries an XSS-exposure tradeoff worth you knowing about explicitly rather than inheriting silently.

**Logout strategy**: no backend call — `AuthContext.logout()` clears the stored token and redirects to `/login`. Confirmed in Section 2.

**Invalid/expired token handling**: any 401 response is caught by the `api/client.ts` interceptor, which clears the token and redirects to login — one place handles this, not scattered try/catches.

**Security considerations for this phase**: secrets only from env, `.env` never committed, CORS restricted to the frontend's dev origin, no rate limiting yet (acceptable for a local-dev foundation, worth adding before any real deployment), no OAuth/social login/third-party auth provider — matches the explicit instruction.

---

## 7. API CONVENTIONS

- **Prefix**: `/api/v1` on every route.
- **Success responses**: return the resource/schema directly, not wrapped in a generic `{"data": ...}` envelope — FastAPI's typed `response_model` already gives a clear contract; an extra wrapper layer is indirection without benefit.
- **Error responses** (defined once, used everywhere from here forward):
  ```json
  { "detail": { "code": "AUTH_INVALID_CREDENTIALS", "message": "Invalid email or password" } }
  ```
  Overrides FastAPI's default bare-string `detail` via a global exception handler in `core/exceptions.py`, so the frontend can always branch on `error.detail.code` instead of parsing message text.
- **Status codes**: 200 (read success), 201 (resource created — register), 401 (missing/invalid/expired token, bad login credentials), 409 (duplicate email on register), 422 (Pydantic validation failure — FastAPI's default behavior, kept as-is), 500 (unhandled server error, logged, generic message returned).
- **Naming**: snake_case for all JSON fields, matching Python/Pydantic defaults end to end — no camelCase transform layer. Revisit only if this becomes a real friction point later, not preemptively.
- **Validation**: every request body is a Pydantic schema in `schemas/`; `EmailStr` for email fields; explicit `min_length` constraints for passwords.

---

## 8. DEPENDENCIES

**Backend**: `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `psycopg2-binary`, `pydantic`, `pydantic-settings`, `pyjwt`, `argon2-cffi`, `python-dotenv`.

**Frontend**: `react`, `react-dom`, `typescript`, `react-router-dom`, `axios`, `tailwindcss`, `postcss`, `autoprefixer`, `vite` (Vite over Create React App — CRA is unmaintained; Vite is the current standard).

**Explicitly not added yet**: Celery, Redis, Qdrant client, Gemini SDK, any market-data library — none are used by anything in this milestone, so they don't belong in `requirements.txt`/`package.json` yet. Adding unused dependencies now is dead weight and a false signal to anyone (including an agent) reading the dependency list about what's actually implemented.

---

## 9. ARCHITECTURE REVIEW

Self-review against the checklist:

- **Unnecessary abstractions**: none found. Repository/Service/API separation is the minimum needed to keep business logic out of route handlers and DB queries out of business logic — not over-engineered for a 3-endpoint foundation, and it's the pattern every later module reuses without rework.
- **Duplicated responsibilities**: none — only one entity (User) exists at this stage.
- **Endpoints that don't need to exist yet**: `logout` and `config` — both excluded, reasoning in Section 2.
- **Frontend/backend coupling**: isolated correctly — `api/client.ts` is the only file that knows an HTTP backend exists; everything else consumes typed functions.
- **Friction for future Academy/RAG work**: none identified — the AI Orchestration Layer and RAG pipeline are backend-internal additions in Phase 2 and don't touch anything built in this foundation.
- **Friction for future Finance/Goals consistency**: one note — predefined categories (from `DATA_MODEL.md`) will need a seed-data migration mechanism when Phase 1's business modules start. Not needed now, just flagging it so it's not a surprise.
- **Sequencing note on Celery/Redis**: `VESTOR_MASTER.md` recommends getting Celery + Redis working early in Phase 1 to avoid a deployment problem surfacing later in Phase 3. This foundation milestone correctly excludes it (nothing here needs a background job), but that recommendation still stands — **treat Celery/Redis setup as the milestone immediately after this one**, before starting Finance/Goals business logic, not deferred all the way to Phase 3.

### ARCHITECTURE DECISION REQUIRING APPROVAL — #1
**Existing decision**: `VESTOR_MASTER.md`/your instructions listed `register` and `login` as separate, implicitly sequential flows (register, then separately log in).
**Proposed change**: registration issues an access token immediately (auto-login), so the user isn't asked to log in again right after signing up.
**Reason**: standard UX pattern, removes one avoidable friction step, doesn't weaken security (the user just proved their credentials by setting them).
**Impact**: frontend register flow redirects straight into the authenticated app shell instead of to the login page. Low risk, easy to reverse if you'd rather keep them separate.

### ARCHITECTURE DECISION REQUIRING APPROVAL — #2
**Existing decision**: none explicit — token storage mechanism was unspecified in `VESTOR_MASTER.md`.
**Proposed change**: store the JWT in `localStorage` via a single wrapped utility, not an httpOnly cookie.
**Reason**: simpler for a SPA with no server-rendered session, no CSRF-token plumbing needed, standard for this stack shape.
**Impact**: token is readable by any JS running on the page — an XSS vulnerability elsewhere in the app becomes a token-theft vector. Acceptable for a project at this stage; worth revisiting (httpOnly cookie + CSRF protection) before any real deployment with real user data.

No other conflicts with `VESTOR_MASTER.md` identified.
