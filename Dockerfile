FROM node:24-bookworm-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.0.8 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY app ./app
COPY db ./db
COPY public ./public
COPY server.ts tsconfig.json remix.json ./

ENV NODE_ENV=production
EXPOSE 44100

CMD ["node", "--import", "remix/node-tsx", "server.ts"]
