FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.4.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY app ./app
COPY db ./db
COPY public ./public
COPY server.ts load-dev-env.ts tsconfig.json remix.json ./

ENV NODE_ENV=production
EXPOSE 44100

CMD ["node", "--import", "remix/node-tsx", "server.ts"]
