FROM node:22-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV HUSKY=0
RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ packages/
COPY web/ web/

RUN pnpm install
RUN pnpm --filter web build

EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app/web
CMD ["node", "server-node.mjs"]
