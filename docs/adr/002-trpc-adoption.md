# ADR-002: API Contract and tRPC Adoption

## Status
Accepted

## Context
We need a type-safe API layer between our Next.js frontend and backend services.

## Decision
Use **tRPC v11** with the following structure:
```
web/src/trpc/
├── init.ts           # tRPC server initialization
├── client.tsx       # Client provider & hooks
├── server.tsx       # Server-side caller
├── query-client.ts  # Shared QueryClient factory
└── routers/
    ├── _app.ts      # Main app router
    ├── post.ts      # Sub-routers
    └── index.ts     # Re-exports
```

## Rationale

### Why tRPC?
- End-to-end type safety (no code generation needed)
- Automatic TypeScript inference
- Great DX with React Query integration

### Why v11?
- Latest version with improved APIs
- Better Next.js 16 / React 19 support

### Why this folder structure?
- Follows tRPC + Next.js App Router best practices
- Separates server/client/server-side concerns
- Sub-routers for modularity

### Why NOT a separate API package?
- Next.js App Router handles API routes natively
- tRPC integrates directly with Next.js
- Simpler deployment

## Usage

### Client Component
```tsx
import { trpc } from '@/trpc/client';

const { data } = trpc.greet.useQuery({ name: 'World' });
```

### Server Component
```tsx
import { createCaller } from '@/trpc/server';

const caller = await createCaller();
const result = await caller.greet({ name: 'World' });
```

## Consequences

### Positive
- Full type safety end-to-end
- No manual API type syncing
- Excellent developer experience

### Negative
- Tight coupling between client and server
- Less suitable for public APIs
- tRPC learning curve for team
