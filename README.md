# Fliptrack

Personal flip-sales profit tracking: what you acquire, what you still have in Inventory, what you sold, and what you wrote off.

This slice is a hosted Remix 3 process with real Books: first-run wizard, login, New Acquisition, empty Home, and Inventory.

## Local

Copy `.env.example` to `.env` and point `DATABASE_URL` at Postgres. Then:

```sh
pnpm i
pnpm db:migrate
pnpm dev
```

Open `http://localhost:44100`. With no Operator yet, `/login` sends you to `/oobe`. Create the instance-admin Operator with `SETUP_SECRET`.

```sh
pnpm test
pnpm typecheck
```

## Railway (Hobby)

A human creates the Railway project. App code does not create it.

1. New Railway project, **not** serverless / scale-to-zero. One always-on Node service.
2. Add same-project Postgres. The app reads `DATABASE_URL` (private).
3. Turn **PITR on from the first deploy**. Volume snapshots are not the restore path.
4. Set service env:
   - `DATABASE_URL` — from the Postgres plugin
   - `SESSION_SECRET` — long random string
   - `SETUP_SECRET` — first-run / break-glass gate (not the Operator password)
   - `NODE_ENV=production`
5. Deploy this repo. The process runs `pnpm start`, migrates, and listens on `PORT`.
6. Visit `/oobe`, enter the setup secret, email, and password. That creates the instance-admin Operator and empty Books.
7. Delete `SETUP_SECRET` from env when you want the break-glass lever gone. `/oobe` then redirects to login.

Login is email + password. The cookie session lasts 30 days. No “remember me” box.
