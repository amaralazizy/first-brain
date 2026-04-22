# AGENTS.md - First Brain Project

This file provides guidelines for agents working on the First Brain project.

## Project Structure

```
first-brain/
├── web/                    # Next.js 16 web application (App Router)
│   ├── src/
│   │   ├── app/           # Next.js pages and API routes
│   │   ├── trpc/          # tRPC router definitions
│   │   └── ...
│   └── package.json
├── recommendation-engine/ # Python ML pipeline
│   ├── ml/                # Source modules (models, features, etc.)
│   ├── tests/             # Pytest test suite
│   └── requirements.txt
└── package.json           # Root workspace (pnpm)
```

## Package Manager

**Always use `pnpm` or `pnpm dlx` for all package management. Never use `npx` or `npm`.**

## Build / Lint / Test Commands

### Root (pnpm workspace)
```bash
pnpm dev              # Run web dev server
pnpm build            # Build web production
pnpm lint             # Lint web
pnpm typecheck        # TypeScript check web
```

### Web (Next.js)
```bash
cd web
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # ESLint check
pnpm dlx tsc --noEmit # TypeScript check (noEmit)
```

### Recommendation Engine (Python)
```bash
cd recommendation-engine

# Activate virtual environment
source .venv/bin/activate

# Run all tests
pytest

# Run a single test file
pytest tests/test_pipeline.py

# Run a single test function
pytest tests/test_pipeline.py::test_build_time_split -v

# Run tests matching a pattern
pytest -k "test_feature"
```

## Code Style Guidelines

### TypeScript / React / Next.js

- **File naming**: Use kebab-case for files (`trpc-provider.tsx`, `api-route.ts`)
- **Component naming**: Use PascalCase for components and React files (`TRPCProvider.tsx`)
- **Directory structure**: Use `src/app/` for App Router pages; `src/trpc/` for tRPC
- **Path aliases**: Use `@/*` alias (e.g., `@/src/trpc/routers/_app`)
- **Imports**: Order imports: external libs → internal modules → local components
- **React Server Components**: Mark client components with `'use client'` directive at top
- **tRPC**: Define routers in `@/src/trpc/routers/`, init in `@/src/trpc/init.ts`
- **TypeScript**: Enable strict mode; avoid `any`; use `interface` for objects, `type` for unions
- **Tailwind CSS**: Use utility classes; follow existing patterns in `globals.css`
- **Error handling**: Use try/catch with proper error boundaries; log errors appropriately
- **shadcn/ui**: Components are managed via shadcn; add with `pnpm dlx shadcn@latest add <component>`

### Python / ML Pipeline

- **File naming**: Use snake_case (`pipeline.py`, `data_simulation.py`)
- **Type hints**: Use Python 3.10+ syntax (`def foo(x: int) -> str:`)
- **Docstrings**: Use Google-style docstrings with Args, Returns, Raises sections
- **Imports**: Order: stdlib → third-party → local (`from ml.models import ...`)
- **Testing**: Use pytest; place tests in `tests/` directory mirroring source structure
- **Constants**: UPPER_SNAKE_CASE for true constants; camelCase for configuration objects
- **Error handling**: Raise specific exceptions; avoid bare `except:`

### General

- **Commits**: Use conventional commit format (`feat:`, `fix:`, `docs:`, etc.)
- **Pre-commit**: Do not bypass hooks; fix lint errors before committing
- **PRs**: Keep PRs focused and reasonably sized; include tests for new features
- **Environment variables**: Read `.env.example` to know variable names; NEVER read `.env` files

## Database

- **ORM**: Uses Drizzle ORM with PostgreSQL
- **Migrations**: Run via `pnpm dlx drizzle-kit` commands
- **Schema**: Define in `web/packages/db/schema.ts`

## Additional Notes

- This project uses Next.js 16 with React 19 and the App Router
- The web app is in `web/` directory at the project root
- tRPC is used for type-safe API calls between client and server
- The recommendation engine uses scikit-learn, XGBoost, and SHAP for ML
