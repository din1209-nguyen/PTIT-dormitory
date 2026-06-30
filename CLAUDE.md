# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This is a **design-only repository**. There is no application code yet — only `docs/`. The project (HVCS dormitory student management — "Quản lý sinh viên ở ký túc xá HVCS") is to be implemented from the specifications under `docs/`. There is no `package.json`, no build/lint/test tooling, and the directory is not a git repository.

The specs are written in Vietnamese and are explicitly intended as context for an AI coding agent. Read them before scaffolding anything:

- [docs/00-business-context.md](docs/00-business-context.md) — business context: roles, functional requirements, data entities, business flows. The source of truth for *what* to build.
- [docs/01-architecture.md](docs/01-architecture.md) — the finalized architecture: tech stack, folder layout, Mongoose schemas, indexes, REST endpoints, RBAC, transaction boundaries. The source of truth for *how* to build.
- [docs/02-ui-design-system.md](docs/02-ui-design-system.md) — the design system (tokens, layout shell, component specs) to apply to the **entire** frontend.
- [docs/data-model.dbml](docs/data-model.dbml) — complete 28-table ERD (DBML, relational/dbdiagram.io style). Each table maps to a MongoDB collection per the architecture doc.
- [docs/03-open-decisions.md](docs/03-open-decisions.md) — **confirmed project decisions** that override the general specs: branding, Excel import template, dormitory seed structure, faculty list, room-assignment clarifications, and default config values. Read this when the other docs are ambiguous.
- `docs/ui_example.jpg` — reference screenshot the design system is derived from.
- `docs/_archive/` — superseded drafts kept for reference only; do not treat as authoritative.

**Branding**: the product uses **PTIT** (Học viện Công nghệ Bưu chính Viễn thông) identity, not "HVCS" (a placeholder in the older specs). App name `PTIT Dormitory`; logo at `frontend/public/logo-ptit.*`.

When generating code, follow the architecture doc's folder structures, schema definitions, indexes, error codes, and API paths rather than improvising new ones.

## Intended stack (per docs)

- **Frontend**: Next.js (App Router) + TypeScript, deployed to `frontend/`. Default dev port 3000.
- **Backend**: Node.js + Express + TypeScript, in `backend/`. Default port 5000, all routes under `/api`.
- **Database**: MongoDB + Mongoose (Atlas in prod; transactions require a replica set).
- **Auth**: JWT access token (15m, in memory) + rotating refresh token (HttpOnly cookie, hash stored in `refresh_tokens`).
- **Payments**: VNPay sandbox. **Email**: Nodemailer/SMTP. **Excel**: ExcelJS/XLSX. **Validation**: Zod/Joi.

Once scaffolded, the conventional commands will be the standard ones for each subproject (`npm install`, `npm run dev`, `npm run build`, `npm test` / `npm test -- <pattern>` for a single test). Update this section with the actual scripts after `package.json` files exist — do not assume they work before then.

## Architecture rules that span multiple files

These are the cross-cutting invariants that are easy to get wrong; they are the main reason to read the docs rather than infer from code.

- **Backend is the source of truth.** All sensitive business logic (room assignment, bill calculation, VNPay verification, semester/residence state transitions, RBAC) lives in the backend `service` layer. The frontend only displays, validates lightly, and calls the API.

- **Backend module layout**: each domain module is `module.routes.ts → module.controller.ts → module.service.ts → module.validation.ts → module.repository.ts`. Controllers stay thin; services own business logic, transactions, and orchestration of email/notification/audit-log. Never put business logic in routes or controllers.

- **Semester (`SEMESTER`) is the system's pivot.** Residence records, room assignments, violations, bills, and reports all hang off a semester. States: `PREPARING → ACTIVE → FINISHED`. At most one `ACTIVE` semester at a time; `FINISHED` semesters are immutable history.

- **Students never hold a `bed_id` directly.** The chain is `STUDENT → RESIDENCE_RECORD → ROOM_ASSIGNMENT → ROOM/BED`, keyed per semester, so prior-semester history is preserved for re-assignment and lookup.

- **Multi-step writes must use MongoDB transactions** (`mongoose.startSession` / `startTransaction` / `commit`/`abort`): Excel import, bulk residence-record creation, auto room assignment, semester transition, bulk bill generation, payment confirmation. If room capacity is insufficient or any row is invalid, **roll back the entire import** — never persist partial students or partial assignments.

- **Never send email inside a transaction.** Commit first, write an `email_logs` row with status `PENDING`, then let a background job send and update to `SENT`/`FAILED`.

- **VNPay**: the IPN endpoint (not the return URL) is the authoritative source for payment status. Always verify the secure hash, check the amount, and make processing **idempotent** (`vnp_TxnRef` is unique; a `SUCCESS` payment must not be reprocessed). The return URL only displays a result to the user.

- **Utility bills are per-room.** A `UTILITY_BILL` plus per-member `UTILITY_BILL_MEMBER` rows. Electricity is tiered (`electric_price_tiers`) + VAT; water is `max(usage - free_quota, 0) * unit_price`. All prices/quotas/VAT come from `system_configs` / `electric_price_tiers` — **never hard-code them**. Snapshot the price config onto the bill at creation time.

- **History is immutable.** Don't hard-delete historical data. Paid bills and finished semesters must not be edited directly. Use snapshots (e.g. `studentSnapshot`, `roomSnapshot` on `room_assignments`, `utility_bills`, `payments`, `activity_logs`) to preserve point-in-time data.

- **RBAC**: three roles — `ADMIN`, `MANAGER`, `STUDENT` — plus granular permission codes (see the architecture doc §11.6). Auth on every protected endpoint; role/permission middleware on management endpoints. Centralize roles/permissions in constants; don't scatter string literals.

- **Standard API envelope**: success `{ success, message, data }`; error `{ success, message, errorCode, errors[] }`; pagination via `data.items` + `data.pagination`. Query convention: `?page&limit&keyword&sortBy&sortOrder`. Use the shared `errorCode` enum from the docs.

## Frontend conventions

- All authenticated requests go through a single central `apiClient` (`src/lib/api/`). No scattered `fetch`/`axios` calls in components.
- Refresh-token handling is centralized in `apiClient` + `refreshTokenManager` + `AuthProvider`, using a shared `refreshPromise` so concurrent 401s trigger only one `/auth/refresh`.
- Never store the refresh token in `localStorage`/`sessionStorage`/React state — it lives only in the HttpOnly cookie. Access token lives in memory/auth store.
- Routes are guarded by role (`/admin/*`, `/manager/*`, `/student/*`); unauthorized users go to a forbidden page or their own dashboard.
- **UI**: implement `src/styles/tokens.css` first, then build `common/` components from those tokens, then compose `sections/` and pages. Every page reuses the shared `PageShell` (Sidebar + Topbar). Use only the palette/spacing/radius tokens from [docs/02-ui-design-system.md](docs/02-ui-design-system.md) — no ad-hoc colors or hard-coded sizes. (Note: the reference screenshot `docs/ui_example.jpg` is a healthcare dashboard, but the design *system* applies to this dormitory app's whole UI; combine it with PTIT branding.)
