FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.0.8 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY app ./app
COPY db ./db
COPY public ./public
COPY server.ts load-dev-env.ts tsconfig.json remix.json ./

ENV NODE_ENV=production
EXPOSE 44100

CMD ["node", "--import", "remix/node-tsx", "server.ts"]
