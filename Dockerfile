FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY app ./app
COPY db ./db
COPY public ./public
COPY server.ts load-dev-env.ts tsconfig.json remix.json ./

ENV NODE_ENV=production
EXPOSE 44100

CMD ["node", "--import", "remix/node-tsx", "server.ts"]
