FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker

RUN pnpm install --filter @childshield/worker... --filter @childshield/db
RUN pnpm --filter @childshield/db generate

ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@childshield/worker", "start"]
