FROM node:22-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV HUSKY=0
RUN corepack enable

WORKDIR /app

ARG CACHEBUST=2
# Copy workspace manifests first for layer caching
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ packages/
COPY web/ web/

RUN pnpm install
RUN rm -rf /app/web/dist /app/web/.output && pnpm --filter web build && \
    find /app/web/node_modules/.nitro/vite/services/ssr/assets -name "globals-*.css" -exec cp {} /app/web/.output/public/assets/ \; 2>/dev/null || true

EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app/web
CMD ["node", ".output/server/index.mjs"]
