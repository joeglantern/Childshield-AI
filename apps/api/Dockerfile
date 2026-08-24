FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --filter @childshield/api... --filter @childshield/db
RUN pnpm --filter @childshield/db generate

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@childshield/api", "start"]
