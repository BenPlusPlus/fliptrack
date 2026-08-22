FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY app ./app
COPY db ./db
COPY public ./public
COPY server.ts tsconfig.json remix.json ./

ENV NODE_ENV=production
EXPOSE 44100

CMD ["node", "--import", "remix/node-tsx", "server.ts"]
