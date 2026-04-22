# ADR-001: Monorepo Structure and Rationale

## Status
Accepted

## Context
We need to organize a project with multiple distinct parts:
- **Web**: Next.js frontend with TypeScript
- **recommendation-engine**: Python ML pipeline
- **docs**: Documentation

## Decision
Use a pnpm workspace monorepo with this structure:
```
first-brain/
├── web/                    # Next.js app
│   ├── src/
│   │   ├── app/            # App Router pages
│   │   ├── trpc/          # tRPC routers
│   │   └── ...
│   ├── packages/          # Shared packages (db, validation, config)
│   └── components/        # UI components (shadcn)
├── recommendation-engine/ # Python ML
├── docs/                 # Documentation
└── package.json          # Root workspace config
```

## Rationale

### Why pnpm workspace?
- Native monorepo support with `pnpm-workspace.yaml`
- Better disk space efficiency via symlinks
- Strict dependency management

### Why separate web/ and recommendation-engine/?
- Different tech stacks (TypeScript vs Python)
- Different deployment targets
- Clear separation of concerns

### Why packages/ inside web/?
- Shared packages are only needed by the web app
- Simpler import paths (`@/packages/...`)
- Can be easily extracted later if needed

## Consequences

### Positive
- Clear project organization
- Easy to add new packages
- Shared tooling (lint, typecheck)

### Negative
- Python code can't easily consume TypeScript packages
- May need sync scripts for shared types
