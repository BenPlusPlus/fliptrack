# What hosting Remix 3 on a public internet host actually looks like

Researched 18 August 2026 against first-party sources only (remix.run, remix-run GitHub, host docs, first-party database docs). No host or engine recommendation.

This file answers [What does hosting Remix 3 on a public internet host actually look like?](https://github.com/BenPlusPlus/fliptrack/issues/12). Posture is already decided in [Who uses Fliptrack, and where does it live?](https://github.com/BenPlusPlus/fliptrack/issues/5): a long-running process on the public internet, a cloud database, login required, data loss unacceptable. Remix 3 product facts are in [What does Remix 3 actually give us today?](https://github.com/BenPlusPlus/fliptrack/issues/2) / [`docs/research/remix-3.md`](https://github.com/BenPlusPlus/fliptrack/blob/research/remix-3/docs/research/remix-3.md) on `research/remix-3`. This file does not redo that ticket. It only adds deploy, remote database, and backup facts.

Glossary terms from [`CONTEXT.md`](../../CONTEXT.md): **Operator**, **Books**, **Flip**. Host and engine remain undecided ([ADR-0002](../adr/0002-hosted-operators-isolated-books.md)).

## 1. What Remix 3 actually deploys

The official starter is a **long-running Node HTTP process**, not a serverless function and not a Remix 2 host adapter.

- Generated start: `NODE_ENV=production node --import remix/node-tsx server.ts`. Engines: `node: ">=24.3.0"`. ([template/package.json](https://raw.githubusercontent.com/remix-run/remix/main/template/package.json))
- `server.ts` creates `node:http.createServer(createRequestListener(...))`, reads `PORT` (default **44100**), and shuts down on `SIGINT` / `SIGTERM`. It does not set a bind host; Node’s `listen(port)` accepts on the unspecified address (`::` when IPv6 is available). ([template/server.ts](https://raw.githubusercontent.com/remix-run/remix/main/template/server.ts), [guides: Request Handling](https://guides.remix.run/request-handling/))
- There is **no first-party Dockerfile** in the starter and **no Remix 3 host adapters** comparable to Remix 2’s `@remix-run/architect`, `@remix-run/cloudflare-pages`, `@remix-run/vercel`. Those names moved to `@react-router/*`. ([remix-3.md](https://github.com/BenPlusPlus/fliptrack/blob/research/remix-3/docs/research/remix-3.md) §4, [RR upgrade table](https://reactrouter.com/upgrading/remix))
- Production work is “still a Fetch handler behind a runtime adapter.” Documented deploy checklist: validate env/secrets at startup (ports, origins, **database URLs**, session secrets); `trustProxy` only behind a proxy that overwrites forwarded headers; connect stores and **run migrations before accepting traffic**; process-safe storage across replicas; graceful shutdown; health checks owned by the app, not the framework. ([guides: Production](https://guides.remix.run/production/))
- `node-fetch-server` documents `host` / `protocol` / `trustProxy` for reverse-proxied **VPS** and custom-domain setups. Enable `trustProxy` only when clients cannot reach the process except through that proxy. ([node-fetch-server README](https://github.com/remix-run/remix/blob/main/packages/node-fetch-server/README.md), [guides: Request Handling](https://guides.remix.run/request-handling/))
- Alternate Fetch entries exist for Bun, Deno, and a Cloudflare Worker `export default { fetch }`. Those are not the official starter. Static-file and compression middleware use Node filesystem / compression APIs; `asyncContext()` uses Node async context. ([guides: Request Handling](https://guides.remix.run/request-handling/))
- Process-local state does not survive replicas: “Memory sessions, process-local caches, and local upload directories do not automatically work across replicas.” Shared Redis, Memcache, database, S3-compatible, or deployment-persistent storage is required when state must survive restarts or move between processes. ([guides: Production](https://guides.remix.run/production/))

Remix 3 remainers still label the product a **beta / pre-release, not production ready**. 30 April 2026: “This is still a pre-release. It is not production ready yet… ready for experiments, demos, prototypes, and feedback.” The homepage still called it a beta on 15 August 2026 (see [remix-3.md](https://github.com/BenPlusPlus/fliptrack/blob/research/remix-3/docs/research/remix-3.md) §1). ([Remix 3 Beta Preview](https://remix.run/blog/remix-3-beta-preview))

Node 24 itself is **Active LTS** (“Krypton”) as of 3 August 2026 (`v24.19.0`). Production Node.js guidance is Active LTS or Maintenance LTS only. ([Node.js Releases](https://nodejs.org/en/about/previous-releases), [Node.js 24.19.0](https://nodejs.org/en/blog/release/v24.19.0))

## 2. Hosts

Which public hosts **document** running a long-running Node ≥ 24.3 server. Facts only. No pick.

### 2.1 Fly.io

**What it is.** Fly deploys a Docker image onto Fly Machines (lightweight VMs) and puts an Anycast HTTP proxy in front. `fly launch` / `fly deploy` build from a Dockerfile (default builder), buildpacks, or a prebuilt image. ([Deploy with a Dockerfile](https://fly.io/docs/languages-and-frameworks/dockerfile/), [Builders](https://fly.io/docs/reference/builders/))

**Node ≥ 24.3.** Fly does not pin a platform Node version. JavaScript deploys are **Dockerfile-first**; you choose the image tag (`node:24-…`) or let [`@flydotio/dockerfile`](https://github.com/fly-apps/dockerfile-node) generate one. `fly launch` for Node apps generates a `Dockerfile` and `fly.toml`. ([JavaScript on Fly.io](https://fly.io/docs/js/), [Dockerfiles](https://fly.io/docs/js/the-basics/dockerfiles/))

**Long-running vs scale-to-zero.** Machines **can** run continuously. `fly launch` **defaults** new apps to scale-to-zero:

```toml
auto_stop_machines = "stop"
auto_start_machines = true
min_machines_running = 0
```

To keep processes up: `auto_stop_machines = "off"` and `auto_start_machines = false`, or `min_machines_running >= 1` in the primary region. The proxy stop loop can stop Machines after idle minutes. Apps must bind a port on `0.0.0.0` (not `127.0.0.1`); Fly’s edge connects from outside the Machine. Default internal port when the Dockerfile has no `EXPOSE` is **8080**. Remix’s starter defaults to **44100** unless `PORT` is set — the `fly.toml` `internal_port` and the process must agree. ([Autostop/autostart](https://fly.io/docs/launch/autostop-autostart/), [Troubleshooting](https://fly.io/docs/getting-started/troubleshooting/), [Dockerfile deploy](https://fly.io/docs/languages-and-frameworks/dockerfile/))

**Remix-named docs.** Fly’s “Run a Remix App” guide is **Remix 2**: `npx create-remix@latest` → `create-remix@2.10.0`, Vite-era app, `fly launch` “Detected a Remix app.” It is not a Remix 3 (`npx remix@next new`) path. ([Run a Remix App](https://fly.io/docs/languages-and-frameworks/remix/))

**Custom Docker.** First-class. Bring your own Dockerfile or use the generator.

### 2.2 Railway

**What it is.** Services are containers. **Persistent services** are “always running” (web apps, APIs, workers). Cron jobs and optional Serverless (sleep) are separate. Default: long-running until the process errors. ([Services](https://docs.railway.com/services), [Build & Deploy](https://docs.railway.com/build-deploy), [Advanced](https://docs.railway.com/overview/advanced-concepts))

**Node ≥ 24.3.** Two build paths:

1. **Railpack** (no Dockerfile). Detects `package.json`. Node version, in order: `RAILPACK_NODE_VERSION` → `engines.node` → `.nvmrc` → `.node-version` → `mise.toml` / `.tool-versions` → default **`lts`**. “We officially support actively maintained Node.js LTS versions.” Node 24 is Active LTS (see §1), so `engines.node: ">=24.3.0"` or `RAILPACK_NODE_VERSION=24` is in the documented path. Start command: `package.json` `start` script (Remix’s is `node --import remix/node-tsx server.ts`). ([Railpack Node](https://railpack.com/languages/node), [Railway Railpack](https://docs.railway.com/builds/railpack))
2. **Dockerfile** if present — any Node image you name. ([Dockerfiles](https://docs.railway.com/builds/dockerfiles))

**Long-running caveats.** Serverless is **off** by default; enabling it sleeps a service after ~10 minutes with no outbound packets and can 502 the first wake request. Ephemeral disk: 1 GB free / 100 GB paid; gone on redeploy unless a [volume](https://docs.railway.com/volumes) is attached. ([Serverless](https://docs.railway.com/deployments/serverless), [Services](https://docs.railway.com/services))

**Remix-named docs.** None found in Railway first-party docs. Railpack lists “Remix: Caches `.cache`” — that is the Remix 2 / Vite cache path, not a Remix 3 starter. ([Railpack Node](https://railpack.com/languages/node))

### 2.3 Render

**What it is.** **Web services** are long-running HTTP processes with an `onrender.com` URL, managed TLS, and a private network. Native runtimes (including Node) or Docker. Bind `0.0.0.0`; default `PORT` is **10000**. ([Web Services](https://render.com/docs/web-services))

**Node ≥ 24.3.** Native Node default for services created **2026-04-21 and later** is **`24.14.1`**. Override via `NODE_VERSION`, `.node-version`, `.nvmrc`, or `package.json` `engines` (Render warns to put an **upper bound** on ranges). Docker: any image, including `node:24`. ([Setting Your Node.js Version](https://render.com/docs/node-version), [Language support](https://render.com/docs/language-support), [Docker](https://render.com/docs/docker))

**Long-running vs free spin-down.** Paid web services stay up. **Free** web services spin down after **15 minutes** idle (~1 minute cold start), lose local files on spin-down/redeploy, cannot attach disks, and are capped at 750 Free instance hours/month. Render: “Do not use them for production applications.” ([Deploy for Free](https://render.com/docs/free))

**Remix-named docs.** None found. Express / Next.js quickstarts exist; Remix 3 is “bring your own start command.”

### 2.4 A VPS (any VM you administer)

Remix 3 first-party docs treat this as a supported shape: install Node ≥ 24.3, run `server.ts`, optionally terminate TLS on a reverse proxy, set `host` / `trustProxy` on `createRequestListener`. ([guides: Production](https://guides.remix.run/production/), [node-fetch-server](https://github.com/remix-run/remix/blob/main/packages/node-fetch-server/README.md), [remix-3.md](https://github.com/BenPlusPlus/fliptrack/blob/research/remix-3/docs/research/remix-3.md) §4)

Hard constraints are yours: Node version, process supervisor, TLS, firewall, `PORT`, and whether the process is one replica (SQLite / filesystem sessions) or many (shared store). No PaaS Node runtime to fight. No first-party Remix Dockerfile; you write one or install Node on the box.

### 2.5 Others that appear in first-party Remix or host docs

| Host | Long-running Node ≥ 24.3? | Notes |
| --- | --- | --- |
| **Heroku** | Yes, documented | Node `24.x` is **Active LTS** and the **default** if `engines.node` is omitted. Classic dynos are long-running web processes. ([Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support), 11 Jun 2026) |
| **DigitalOcean App Platform** | Yes, with an explicit engine | Buildpack supports Node **24.0.0–24.15.0**. **Default is `22.x`** if `engines` is omitted. Dockerfiles are first-class. Web components are long-running containers; listen on `PORT`. ([Node.js Buildpack](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/), 28 Jul 2026) |
| **DigitalOcean Droplets** | Yes (you install Node) | A VPS. App Platform docs point at Droplets when you want more control. |
| **Cloudflare Workers** | **No** Node ≥ 24.3 long-running path | Remix 3 documents a Worker `fetch` entry. Official starter, `node:sqlite`, static-file / compression / `asyncContext` middleware, and `node --import remix/node-tsx` are Node. ([guides: Request Handling](https://guides.remix.run/request-handling/)) |
| **Vercel / Netlify / Architect** | **No Remix 3 adapter** | Remix 2 adapters moved to React Router. Remix 3 first-party docs do not document these as Node-server hosts. ([RR upgrade table](https://reactrouter.com/upgrading/remix)) |

## 3. Database

### 3.1 How Remix 3 first-party persistence behaves when the database is remote

Remix 3 ships three SQL dialects. Remote vs local is a **connection**, not a different API. ([data-table README](https://github.com/remix-run/remix/blob/main/packages/data-table/README.md), [guides: Data and Validation](https://guides.remix.run/data-and-validation/))

**PostgreSQL** — `createPostgresDatabase({ connectionString: process.env.DATABASE_URL })` (or an existing `pg` pool/client). Optional peer `pg`. Config-backed instances support `wipe` / `reset` / `close`. Migrations take a **PostgreSQL advisory lock** (`migrationLock: true`), wait up to **60 seconds**, then fail rather than block forever. Multi-statement `up.sql` / `down.sql` work on `pg` without extra flags. Transaction options pass through (`isolationLevel`, `readOnly`). Integration tests in the package README use a **remote** `postgres:16` container via `REMIX_DATA_TABLE_POSTGRES_TEST_URL`. ([data-table-postgres README](https://github.com/remix-run/remix/blob/main/packages/data-table-postgres/README.md))

**MySQL** — `createMysqlDatabase({ uri: process.env.DATABASE_URL, multipleStatements: true })`. Optional peer `mysql2`. **`multipleStatements: true` is required** for `remix db` migrations (each file is one multi-statement script). `migrationLock: true` (named lock, 60s). **`returning: false`** — `RETURNING` throws `DataTableQueryError`. **`transactionalDdl: false`**. Tests use a remote `mysql:8` container. ([data-table-mysql README](https://github.com/remix-run/remix/blob/main/packages/data-table-mysql/README.md))

**SQLite** — `createSqliteDatabase({ filename: 'app.db' })` via `node:sqlite` / `bun:sqlite`. This is a **local file** (or `:memory:`), not a network SQL server. Documented fit: “local development, embedded deployments, and **single-node services**.” `migrationLock: false` — run migrations from one process. `wipe` / `reset` assume one process owns the file. `filename` resolves against **cwd** (wherever `remix db` is invoked); prefer absolute paths. A busy timeout of 5s is applied on open. Putting the file on a host volume does not make it a multi-replica cloud database. ([data-table-sqlite README](https://github.com/remix-run/remix/blob/main/packages/data-table-sqlite/README.md))

**`remix db` against a remote URL.** `remix.json`:

```jsonc
{
  "db": {
    "adapter": {
      "type": "postgres", // or "mysql" / sqlite
      "connectionString": { "env": "DATABASE_URL" }
    },
    "migrations": { "directory": "./db/migrations" }
  }
}
```

Commands: `status` / `migrate` / `rollback` / `seed` / `reset --force` / `wipe --force`. Secrets come from the named env var at command time. Hosts typically run `remix db migrate` as a release / pre-deploy step, then start `server.ts`. Production guide: initialize the database and run migrations **before listening**. Request-scoped access is app-owned middleware (`databaseContext`). ([data-table README](https://github.com/remix-run/remix/blob/main/packages/data-table/README.md), [guides: Data and Validation](https://guides.remix.run/data-and-validation/), [guides: Production](https://guides.remix.run/production/))

**SSL / network.** Remix does not add its own TLS layer. `pg` / `mysql2` receive the URL or config you pass. Fly’s JS database guide: use SSL when the database is **outside** Fly’s private network; **do not** force SSL on Fly-internal Postgres. Render external Postgres URLs expect TLS 1.2+ and SNI (connecting by raw IP fails with “No SNI information found”). Railway databases are private by default; public access is a TCP proxy plus `DATABASE_PUBLIC_URL` / `MYSQL_PUBLIC_URL`. ([Fly JS Databases](https://fly.io/docs/js/the-basics/database/), [Render Postgres connect](https://render.com/docs/postgresql-creating-connecting), [Railway PostgreSQL](https://docs.railway.com/databases/postgresql))

**What this means for Books.** Isolated Books (one Operator → one Books) is an application schema concern. First-party `data-table` does not implement tenancy. A remote Postgres or MySQL URL is the documented way to keep Books off the app filesystem so a single Node process can restart or move without taking the ledger with it.

### 3.2 What each named host offers as managed SQL

| Host | Postgres | MySQL | How Remix 3 would see it |
| --- | --- | --- | --- |
| **Fly** | **Managed Postgres (MPG)** — fully managed PG 16, HA, connection pooling, private network. Separate **unmanaged Fly Postgres** (a Fly app + volume); Fly now banners that product: they will not support/guide unmanaged Postgres and point at MPG. No first-party managed MySQL. ([MPG](https://fly.io/docs/mpg/), [unmanaged backup page banner](https://fly.io/docs/postgres/managing/backup-and-restore/)) | Not offered as a managed product. | `DATABASE_URL` / `pg` `connectionString`. Attach via `fly mpg attach`. External DBs via `fly secrets`. |
| **Railway** | Official **PostgreSQL template** from Railway’s SSL-enabled image (official Docker Hub Postgres). Injects `DATABASE_URL`, `PGHOST`, … Private by default; optional public TCP proxy. Railway calls these templates **unmanaged** (you own config/maintenance) and also documents HA conversion and PITR. ([PostgreSQL](https://docs.railway.com/databases/postgresql)) | Official **MySQL template** from `mysql` on Docker Hub. `MYSQL_URL`, `MYSQLHOST`, … Same “unmanaged template” framing. ([MySQL](https://docs.railway.com/databases/mysql)) | `createPostgresDatabase({ connectionString })` or `createMysqlDatabase({ uri, multipleStatements: true })`. |
| **Render** | **Render Postgres** — fully managed. Internal URL (same region) + external URL. Paid plans: PITR + logical exports. Free: 1 GB, 30-day expiry, **no backups**. PG 13–18. ([Create & connect](https://render.com/docs/postgresql-creating-connecting), [Postgres hub](https://render.com/docs/postgresql)) | **Not a managed product.** Docs: deploy MySQL yourself as a Docker private service + disk. ([Deploy MySQL](https://render.com/docs/deploy-mysql)) | Postgres: `DATABASE_URL` from the dashboard. MySQL: you assemble the URI. |
| **VPS** | Whatever you install, or a separate managed provider. | Same. | You set `DATABASE_URL`. |
| **Heroku** | **Heroku Postgres** (default major 18). `DATABASE_URL`. ([Postgres version support](https://devcenter.heroku.com/articles/heroku-postgres-version-support)) | Not first-party. | `createPostgresDatabase({ connectionString: process.env.DATABASE_URL })`. |
| **DigitalOcean** | **Managed PostgreSQL** (and App Platform can attach one). | **Managed MySQL**. | Standard URLs. Daily backups + PITR (see §4). |

SQLite on these hosts is **not** their managed SQL product. It is a file on ephemeral disk unless you attach a volume (Fly volumes, Railway volumes, Render disks — paid only). Remix 3’s own SQLite docs stay on the single-node file model.

## 4. Backup

What those managed databases **actually provide**. Not a recommendation. “Losing the books is unacceptable” ([issue 5](https://github.com/BenPlusPlus/fliptrack/issues/5)) is why these numbers exist; this ticket does not choose among them.

### Fly Managed Postgres

- Marketing/overview: “Automatic backups and recovery”; every plan “include[s] high availability, backups, and connection pooling.” ([MPG](https://fly.io/docs/mpg/))
- CLI: `fly mpg backup create` / `list`; `fly mpg restore` into a **new** cluster from `--backup-id` **or** `--pitr-time` (RFC3339). PITR “Requires the cluster's PITR recovery window to cover this time.” Source cluster is left unchanged. ([fly mpg](https://fly.io/docs/flyctl/mpg/), [fly mpg restore](https://fly.io/docs/flyctl/mpg-restore/))
- **Gap:** first-party pages fetched for this note do **not** publish the PITR window length (days) or backup schedule/retention counts. The restore command assumes a window exists; the duration is not on the MPG overview or CLI pages cited above.

### Fly unmanaged Postgres (Machines + volumes)

- Daily **block-level volume snapshots**, default retain **5 days**, configurable **1–60 days**. Fly: snapshots “shouldn’t be your primary backup method” / “may not have your latest data.” Restore = new Postgres app from `--snapshot-id`. Fly states they will not support or guide this product and points at MPG. ([Volume snapshots](https://fly.io/docs/volumes/snapshots/), [Volumes overview](https://fly.io/docs/volumes/overview/), [Backup, Restores, & Snapshots](https://fly.io/docs/postgres/managing/backup-and-restore/))

### Railway

- **Volume backups** (any volume, including Postgres, MySQL, or a SQLite file): manual + scheduled. Daily = every 24h, kept **6 days**. Weekly = every 7 days, kept **1 month**. Monthly = every 30 days, kept **3 months**. Restore stages a **new** volume; older-than-restored backups remain; newer ones are removed. Wiping a volume deletes all backups. Restore only inside the same project + environment. Manual backups limited to 50% of volume size. Feature described as still under development. ([Backups](https://docs.railway.com/volumes/backups))
- **Postgres PITR** (opt-in, not default): pgBackRest WAL to a Railway bucket; weekly full + daily incremental; last **4 full backups** → restore window of **roughly 4 weeks**. Restore is a **new sibling** Postgres service; source is untouched. Window starts at the first post-enable base backup (not retroactive). Under sustained S3 outage, a 5 GiB WAL queue cap can drop WAL and **truncate the PITR window** so Postgres stays up. No separate PITR fee (bucket storage + egress). CLI: `railway postgres pitr …`. Works on single-node and HA. ([Point-in-Time Recovery](https://docs.railway.com/volumes/point-in-time-recovery))
- **MySQL:** Railway points at the same **volume backups**. No MySQL PITR page. Templates are labeled unmanaged. ([MySQL](https://docs.railway.com/databases/mysql))

### Render

- **Paid Render Postgres:** continuous PITR. Restore spins up a **new** instance (not in-place). You cannot restore to a time within **ten minutes** of now. Window: **Hobby = past 3 days**; **Pro or higher = past 7 days**. Upgrading Hobby does **not** backfill the extra days. Also: on-demand **logical exports** (`.dir.tar.gz`), retained **7 days** regardless of plan. Render prefers PITR over logical restore for data loss. ([Recovery and Backups](https://render.com/docs/postgresql-backups), [Create & connect](https://render.com/docs/postgresql-creating-connecting))
- **Free Render Postgres:** **no backups**. 30-day expiry, then 14-day grace, then delete. ([Free](https://render.com/docs/free))
- **Self-deployed MySQL:** daily **disk snapshots** exist, but Render says **do not** restore a disk snapshot for database recovery (corruption risk). Use `mysqldump` (or similar) yourself. ([Deploy MySQL](https://render.com/docs/deploy-mysql), [Disks](https://render.com/docs/disks))

### Heroku Postgres

- **Continuous physical protection** (snapshots/base backups + WAL to S3) on **all** plans, stored in the database’s region. ([Continuous Protection](https://devcenter.heroku.com/articles/heroku-postgres-data-safety-and-continuous-protection))
- **Rollbacks** (replay to a point in time) on **Standard-tier or higher only**. Essential-tier: no rollbacks, forks, or followers.
- **PGBackups**: manual + scheduled **logical** dumps. Retention by plan (e.g. Essential: 5 manual / 7 daily + 1 weekly scheduled). Intended for portability; Heroku says use continuous protection for production disaster recovery. Logical snapshots stored in the **U.S.** regardless of DB region. ([PGBackups](https://devcenter.heroku.com/articles/heroku-postgres-backups), 18 May 2026)

### DigitalOcean Managed Databases

- **PostgreSQL and MySQL:** automatic **once-per-day** backups, retained **7 days**, no downtime. Restore creates a **new** cluster: latest transaction **or** a chosen point in time. Destroying a cluster **destroys its backups**. Backup time is set by DigitalOcean and cannot be changed. ([Postgres restore](https://docs.digitalocean.com/products/databases/postgresql/how-to/restore-from-backups/), [MySQL restore](https://docs.digitalocean.com/products/databases/mysql/how-to/restore-from-backups/), 31 Jul 2026)

### VPS / SQLite-on-a-volume

- No host-managed SQL backup unless you add one. Volume snapshots (Fly, Railway, Render disks) are crash-consistent disks, not advertised as application-consistent SQL PITR. Remix SQLite has no first-party backup command.

## 5. Gaps

From maintainers and first-party docs, not community recaps.

1. **Remix 3 is explicitly not production-ready.** Beta preview (30 Apr 2026) and the 15 Aug 2026 research in [remix-3.md](https://github.com/BenPlusPlus/fliptrack/blob/research/remix-3/docs/research/remix-3.md). Deploying it to a public host does not change that label. ([beta preview](https://remix.run/blog/remix-3-beta-preview))
2. **No first-party Remix 3 deploy guide for any named PaaS.** Production guide is adapter/process-shaped (Node server, env, proxy, migrations, shutdown). Fly’s only Remix page is Remix 2. Railway’s “Remix” mention is a Vite `.cache` hint. Render has no Remix 3 page.
3. **No first-party Dockerfile or `PORT`/`0.0.0.0` host cookbook.** Starter listens on `PORT` or 44100 with no bind host. Fly expects 8080 unless you change `internal_port`; Render defaults `PORT=10000`; Heroku/DO/Railway inject `PORT`. Easy to deploy a process that never receives proxy traffic.
4. **No Remix 3 adapters for Vercel, Netlify, Architect, Cloudflare Pages.** Those names are React Router now. A Cloudflare Worker `fetch` entry is documented, but it is **not** “long-running Node ≥ 24.3” and drops Node-only middleware / `node:sqlite` / `remix/node-tsx`.
5. **SQLite is not a remote cloud database in first-party Remix 3.** Single-node file, no migration lock, wipe/reset assume one owner. Host volumes + daily snapshots are not the same as managed SQL PITR. Production guide’s replica warning applies.
6. **Hosts that look plausible but have a documented hole for this posture:**
   - **Render Free** web service: not long-running (15 min spin-down). **Render Free Postgres**: no backups, 30-day delete. ([Free](https://render.com/docs/free))
   - **Fly `fly launch` defaults**: `min_machines_running = 0` + auto-stop — not “always on” until you change `fly.toml`. ([Autostop](https://fly.io/docs/launch/autostop-autostart/))
   - **Railway Serverless** (optional): sleep + possible 502 on wake. Default persistent services do not do this. ([Serverless](https://docs.railway.com/deployments/serverless))
   - **DigitalOcean App Platform default Node 22.x** unless `engines` requests 24.x. Buildpack’s published 24 range tops out at **24.15.0** (not necessarily 24.19). ([Node.js Buildpack](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/))
   - **Fly MPG PITR window length** is not published on the overview/CLI pages cited in §4.
   - **Render MySQL** and **Fly MySQL**: no managed offering. Railway MySQL is a template + volume backups, not PITR.
   - **Unmanaged Fly Postgres**: Fly says they will not support it.
7. **`pg` / `mysql2` are optional peers.** A production image that prunes them (or a host that installs only `dependencies` and you left drivers in `devDependencies`) will boot a server that cannot open Books. ([data-table README](https://github.com/remix-run/remix/blob/main/packages/data-table/README.md))
8. **MySQL first-party limitations that survive any host:** no `RETURNING`, no transactional DDL, migrations need `multipleStatements: true`. ([data-table-mysql](https://github.com/remix-run/remix/blob/main/packages/data-table-mysql/README.md))
9. **Multi-process / replica.** Remix 3 production docs assume you pick shared session/upload storage before you scale past one process. Isolated Books does not remove that.
10. **Beta churn.** Import paths and data-table factory APIs still break between betas ([remix-3.md](https://github.com/BenPlusPlus/fliptrack/blob/research/remix-3/docs/research/remix-3.md) §6). A host pin of `remix@3.0.0-beta.6` is an operational fact, not stability.

## Sources

- [docs/research/remix-3.md](https://github.com/BenPlusPlus/fliptrack/blob/research/remix-3/docs/research/remix-3.md) on `research/remix-3` (15 Aug 2026) — Remix 3 product facts this file does not repeat
- [Remix 3 Beta Preview](https://remix.run/blog/remix-3-beta-preview) (30 Apr 2026)
- [guides.remix.run Production](https://guides.remix.run/production/), [Request Handling](https://guides.remix.run/request-handling/), [Data and Validation](https://guides.remix.run/data-and-validation/)
- [remix-run/remix](https://github.com/remix-run/remix) template `package.json` / `server.ts`; `data-table`, `data-table-postgres`, `data-table-mysql`, `data-table-sqlite`, `node-fetch-server` READMEs
- [Node.js Releases](https://nodejs.org/en/about/previous-releases); [Node.js 24.19.0](https://nodejs.org/en/blog/release/v24.19.0)
- Fly: [JS](https://fly.io/docs/js/), [Dockerfiles](https://fly.io/docs/js/the-basics/dockerfiles/), [JS Databases](https://fly.io/docs/js/the-basics/database/), [Dockerfile deploy](https://fly.io/docs/languages-and-frameworks/dockerfile/), [Remix (v2)](https://fly.io/docs/languages-and-frameworks/remix/), [Autostop](https://fly.io/docs/launch/autostop-autostart/), [MPG](https://fly.io/docs/mpg/), [fly mpg](https://fly.io/docs/flyctl/mpg/), [fly mpg restore](https://fly.io/docs/flyctl/mpg-restore/), [unmanaged PG backup](https://fly.io/docs/postgres/managing/backup-and-restore/), [volume snapshots](https://fly.io/docs/volumes/snapshots/)
- Railway: [Services](https://docs.railway.com/services), [Railpack](https://docs.railway.com/builds/railpack), [Railpack Node](https://railpack.com/languages/node), [PostgreSQL](https://docs.railway.com/databases/postgresql), [MySQL](https://docs.railway.com/databases/mysql), [Backups](https://docs.railway.com/volumes/backups), [PITR](https://docs.railway.com/volumes/point-in-time-recovery), [Serverless](https://docs.railway.com/deployments/serverless)
- Render: [Web Services](https://render.com/docs/web-services), [Node version](https://render.com/docs/node-version), [Language support](https://render.com/docs/language-support), [Postgres](https://render.com/docs/postgresql), [Create & connect](https://render.com/docs/postgresql-creating-connecting), [Recovery](https://render.com/docs/postgresql-backups), [Deploy MySQL](https://render.com/docs/deploy-mysql), [Free](https://render.com/docs/free)
- Heroku: [Node.js Support](https://devcenter.heroku.com/articles/nodejs-support), [PGBackups](https://devcenter.heroku.com/articles/heroku-postgres-backups), [Continuous Protection](https://devcenter.heroku.com/articles/heroku-postgres-data-safety-and-continuous-protection)
- DigitalOcean: [App Platform Node.js buildpack](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/), [Managed Postgres restore](https://docs.digitalocean.com/products/databases/postgresql/how-to/restore-from-backups/), [Managed MySQL restore](https://docs.digitalocean.com/products/databases/mysql/how-to/restore-from-backups/)
- [React Router: Upgrading from Remix v2](https://reactrouter.com/upgrading/remix)
