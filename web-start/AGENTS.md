# TanStack Start App

Migrated from `../web` (Next.js). Same routes, same tRPC stack, same DB.

## Key differences from Next.js

- **Build**: Vite (`pnpm dev`) instead of Next.js dev server
- **Port**: 3001 (Next.js app stays on 3000)
- **Routing**: TanStack Router file-based (`src/app/`). `__root.tsx` = layout, `index.tsx` = `/`, `tasks.tsx` = `/tasks`
- **Links**: `<Link to="/tasks">` from `@tanstack/react-router`, NOT `next/link`
- **API routes**: Server routes (`server.handlers`) in `src/app/api/trpc.$.ts`
- **Fonts**: Google Fonts via `<link>` tags in `__root.tsx` head(), CSS variables in `globals.css`
- **No `'use client'`**: Not needed — TanStack Start is client-first

## Auto-generated file

`src/routeTree.gen.ts` is regenerated on every `pnpm dev`/`pnpm build`. The placeholder committed here will be replaced on first run.

## Package manager

Always use `pnpm`.
