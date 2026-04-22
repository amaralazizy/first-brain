# Monorepo Boilerplate Plan (Agent Checklist)

This file is a step-by-step checklist for setting up a modern TypeScript monorepo with Next.js + integrated tRPC, shared packages, and docs-as-code. Mark each step as `- [x]` when done.

**Project Structure:**
- `web/` - TypeScript/Next.js application
- `recommendation-engine/` - Python ML (temporary)
- `docs/` - Documentation
- Root - shared config only

## 1. Workspace & Tooling
- [x] Create `pnpm-workspace.yaml` in `web/` folder
- [x] Create monorepo folders in `web/packages/`: `db`, `validation`, `ui`, `config`
- [x] Initialize docs-as-code structure: `docs/README.md`, `docs/architecture/`, `docs/adr/`, `docs/runbooks/`

## 2. Frontend (Next.js)
- [x] Next.js app in `web/app` (TypeScript, App Router, Tailwind, ESLint)
- [x] Initialize shadcn/ui with preset

## 3. tRPC Integration (Integrated in Next.js)
- [x] Set up tRPC server in `web/src/trpc/`
- [x] Create tRPC router and procedures
- [x] Add tRPC client provider in `web/src/trpc/client.tsx`
- [x] Create API route handler at `web/src/app/api/trpc/[trpc]/route.ts`
- [x] Add Zod for input validation
- [x] Add server.tsx for Server Components
- [x] Add sub-routers structure

## 4. Shared Packages (in `web/packages/`)
- [x] Add `packages/db` (Drizzle ORM, Neon config)
- [x] Add `packages/validation` (Zod schemas shared between API and web)
- [x] Add `packages/ui` (shadcn already provides this via @/components/ui)
- [x] Add `packages/config` (env, constants, feature flags)

## 5. Documentation
- [x] Add docs/README.md and subfolders
- [x] Add ADR-001: Monorepo structure and rationale
- [x] Add ADR-002: API contract and tRPC adoption
- [x] Add stack.md: registry of all major dependencies and rationale

## 6. Quality Gates
- [x] Add lint/typecheck/test scripts in `web/`
- [x] Add Husky + lint-staged for pre-commit
- [ ] Add Vitest (unit/integration tests)
- [ ] Add Playwright (E2E tests)

---

> Update this file as you complete each step. Use it as a source of truth for agent and human contributors.
