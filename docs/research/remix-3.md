# What Remix 3 actually gives us today

Researched 15 August 2026 against first-party sources only (remix.run, remix-run GitHub orgs/repos, official announcements, and RFCs/decisions in the Remix 3 repo). No stack recommendation.

## 1. Status

Remix 3 is a **beta / pre-release**, not a stable production release.

- The homepage states: “Remix 3 is currently available as a beta release.” ([remix.run](https://remix.run/))
- The 30 April 2026 announcement is titled “Remix 3 Beta Preview” and says: “This is still a pre-release. It is not production ready yet, and there is still a lot to do. But it is ready for you to kick the tires… ready for experiments, demos, prototypes, and feedback.” ([Remix 3 Beta Preview](https://remix.run/blog/remix-3-beta-preview))
- The source repo README opens with “This is the source repository for Remix 3. It is under active development.” ([remix-run/remix README](https://github.com/remix-run/remix/blob/main/README.md))

### Version identifiers (as of 15 August 2026)

| Identifier | What it is |
| --- | --- |
| `remix@next` → **`3.0.0-beta.6`** | Official install path for Remix 3. GitHub pre-release tag `remix@3.0.0-beta.6`, published 14 August 2026. ([repo README](https://github.com/remix-run/remix/blob/main/README.md), [release](https://github.com/remix-run/remix/releases/tag/remix%403.0.0-beta.6), [npm dist-tags](https://registry.npmjs.org/remix)) |
| `remix@latest` → **`2.17.5`** | Still the Remix 2 convenience package, not Remix 3. ([npm dist-tags](https://registry.npmjs.org/remix)) |
| `packages/remix` in source | `"version": "3.0.0-beta.6"`, `engines.node: ">=24.3.0"`. ([packages/remix/package.json](https://raw.githubusercontent.com/remix-run/remix/main/packages/remix/package.json)) |
| `@remix-run/*` 0.x packages | Individual modules that the umbrella `remix` package re-exports. Examples in the beta.6 release notes: `ui@0.5.0`, `data-table@0.4.0`, `data-table-sqlite@0.6.0`, `fetch-router@0.21.0`, `cli@0.4.0`. 0.x minors are treated as breaking. ([beta.6 notes](https://github.com/remix-run/remix/releases/tag/remix%403.0.0-beta.6), [decision 002](https://github.com/remix-run/remix/blob/main/decisions/002-branching-and-releasing.md)) |
| `preview/main` | Git install of latest `main` for “bleeding edge.” ([repo README](https://github.com/remix-run/remix/blob/main/README.md)) |

Create-app command documented by the homepage, beta post, and package README:

```sh
npx remix@next new my-remix-app
```

### Stable vs experimental vs undocumented

- **Stable Remix 3:** none. Maintainers label the whole product a pre-release / beta. ([beta preview](https://remix.run/blog/remix-3-beta-preview))
- **Published but pre-1.0:** the umbrella `remix` package (`3.0.0-beta.6`) and the `@remix-run/*` 0.x packages. Decision 002 says `main` “should always be publishable” and that 0.x package minors may break; the umbrella `remix` major is intended to move more slowly once stable. ([decision 002](https://github.com/remix-run/remix/blob/main/decisions/002-branching-and-releasing.md))
- **Documented first-party surfaces:** generated API at [api.remix.run](https://api.remix.run/) (also where [remix.run/docs](https://remix.run/docs) redirects); narrative guides at [guides.remix.run](https://guides.remix.run/) (source described as “in-progress Remix 3 guide docs”). ([docs/guides README](https://github.com/remix-run/remix/blob/main/docs/guides/README.md), [remix-guides-docs](https://github.com/remix-run/remix-guides-docs), [remix-api-docs](https://github.com/remix-run/remix-api-docs))
- **Agent / template guidance:** `.agents/skills/remix/SKILL.md` is copied into generated apps and is the first-party “how to structure an app” document. ([README](https://github.com/remix-run/remix/blob/main/README.md), [SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))
- **Still moving:** beta.6 itself lists multiple breaking import, cookie, route-pattern, session, test-CLI, frame-resolver, and data-table factory changes from beta.5. ([beta.6 notes](https://github.com/remix-run/remix/releases/tag/remix%403.0.0-beta.6))

Remix 2, for contrast: last published line is `@remix-run/react@2.17.5`. `create-remix` in 2.17.0 (25 July 2025) started redirecting new projects to `create-react-router` because “Remix v2 is in maintenance mode so we don't want new Remix apps to be created.” ([v2 changelog](https://v2.remix.run/docs/start/changelog/)) React Router v8 (17 June 2026) then marked **React Router v6 and Remix v2 as End of Life** — they no longer receive security updates. ([React Router v8](https://remix.run/blog/react-router-v8))

## 2. Relationship to Remix 2 and React Router

Remix 3 is a **break**, not a Remix 2 continuation and not a rebrand of React Router.

Timeline from first-party posts:

1. **15 May 2024 — merge.** “What we planned to release as **Remix v3** is now going to be released as **React Router v7**.” Remix v2 users were told to keep Remix and later change imports. ([Merging Remix and React Router](https://remix.run/blog/merging-remix-and-react-router))
2. **December 2024 — RR v7 ships.** Official recommendation: start new React projects on React Router v7; upgrade existing Remix v2 apps with the published upgrade guide. ([same post’s Dec 2024 update](https://remix.run/blog/merging-remix-and-react-router), [Incremental Path to React 19](https://remix.run/blog/incremental-path-to-react-19), [Upgrading from Remix v2](https://reactrouter.com/upgrading/remix))
3. **28 May 2025 — “Wake up, Remix!”** Remix 3 is described as “a reimagining,” “not just a new version, it's a new direction,” with **no critical dependency on React**. The post said they were starting from a Preact fork and building their own component model. ([Wake up, Remix!](https://remix.run/blog/wake-up-remix))
4. **10 October 2025 — Remix Jam.** First public walkthrough of the new UI model and Fetch-API server. Goal stated then: first version of the full-stack `remix` package in early 2026. ([Remix Jam 2025 Recap](https://remix.run/blog/remix-jam-2025-recap))
5. **30 April 2026 — beta preview.** Concrete `npx remix@next new` release. ([beta preview](https://remix.run/blog/remix-3-beta-preview))
6. **17 June 2026 — React Router v8.** Explicit split: “React Router is our React meta-framework, and we're taking Remix in a different direction.” Remix v2 / RR v6 marked EOL. ([React Router v8](https://remix.run/blog/react-router-v8))

What Remix 2 / React Router still is:

- Remix v2 was React + Vite + React Router (“center stack”: routing and rendering; everything else left to you). ([v2 technical explanation](https://v2.remix.run/docs/discussion/introduction), [beta preview](https://remix.run/blog/remix-3-beta-preview))
- The upgrade path from Remix v2 is **React Router v7/v8 Framework Mode**, not Remix 3. Package table: `@remix-run/react` → `react-router`, `@remix-run/node` → `@react-router/node`, `@remix-run/cloudflare` → `@react-router/cloudflare`, etc. ([upgrade guide](https://reactrouter.com/upgrading/remix))
- Current React Router line: **v8.3.0** on npm (`engines.node >= 22.22.0`, React `>= 19.2.7`). ([react-router@8.3.0](https://registry.npmjs.org/react-router/latest), [RR v8 post](https://remix.run/blog/react-router-v8))

What choosing Remix 3 would commit us to:

- A **new UI runtime** (`remix/ui`). Official skill: “This is not React.” Components take a `handle`, return a zero-argument render function, keep state in setup-scope variables, and call `handle.update()` explicitly. ([SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md), [guides: Start Here](https://guides.remix.run/start-here/))
- A **Fetch-API server** (`router.fetch(Request) → Response`), not Remix 2 `loader`/`action` route modules and not React Router Framework Mode. ([beta preview](https://remix.run/blog/remix-3-beta-preview), [guides: Request Handling](https://guides.remix.run/request-handling/))
- A **single `remix` dependency** with subpath imports (`remix/router`, `remix/ui`, …). There is no top-level `import { … } from 'remix'`. ([SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))
- **Pre-release churn.** beta.5 → beta.6 rewrote the public import map (`remix/fetch-router` → `remix/router`, `remix/data-table-postgres` → `remix/data-table/postgres`, etc.). ([beta.6 notes](https://github.com/remix-run/remix/releases/tag/remix%403.0.0-beta.6))
- **Node 24.3+** for the official template and umbrella package. ([template/package.json](https://raw.githubusercontent.com/remix-run/remix/main/template/package.json), [packages/remix/package.json](https://raw.githubusercontent.com/remix-run/remix/main/packages/remix/package.json))
- **Leaving the React ecosystem** (React components, React Router, Remix v2 loaders/actions, Vite plugin). The RR v8 post’s own framing: React Router is the battle-tested React path; Remix 3 is the “try new things” path. ([RR v8](https://remix.run/blog/react-router-v8))

There is no first-party migration path from a Remix 2 / React Router app *into* Remix 3. The documented migration is Remix 2 → React Router.

## 3. App shape

### Recommended project structure

Official starter (`npx remix@next new`) and skill agree:

```text
my-remix-app/
├── server.ts                  # runtime entry (Node http by default)
├── hmr.ts                     # optional Node HMR supervisor
├── package.json               # one runtime dep: remix
├── tsconfig.json
└── app/
    ├── routes.ts              # typed URL contract + href()
    ├── router.ts              # middleware + controller mapping
    ├── assets.ts              # browser module / asset server
    ├── middleware/            # request lifecycle
    ├── actions/               # controllers + route-local UI
    │   ├── controller.tsx     # top-level leaf actions
    │   ├── document.tsx
    │   └── public/entry.ts    # browser runtime entry
    ├── data/                  # added when needed (schema, DB)
    └── ui/                    # shared UI once more than one route needs it
```

Also specified when the app grows: `db/` for migrations and local DB files, root `public/` for static files, `test/`, `tmp/` for uploads/scratch. Anti-patterns called out: no `app/lib/`, no `app/components/` (use `app/ui/`), no `app/controllers/` (handlers live under `app/actions/`). ([template README](https://github.com/remix-run/remix/blob/main/template/README.md), [SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md), [guides: Start Here](https://guides.remix.run/start-here/))

### Routing model

- Routes are a **typed map** in `app/routes.ts`, built with `route`, `get`, `post`, `put`, `del`, `form`, `resources` from `remix/routes`. They are **not** Remix 2 file-based `app/routes/*` modules. ([SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))
- `form(path)` creates a GET `index` leaf and a POST `action` leaf at the same URL. ([guides: Forms](https://guides.remix.run/forms-and-mutations/))
- Controllers are created with `createController(routeMap, { actions })` and registered with `router.map(...)`. Nested route maps need their own controller and an explicit `router.map`. ([SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))
- Controllers return **Web `Response` objects** (HTML, redirect, 404, 400, JSON). Expected failures are returned, not thrown for control flow. ([SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))
- Type-safe `routes.name.href(...)` is the source of truth for links, forms, redirects, and tests. ([SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))

### Data loading and mutations

There are no Remix 2 `loader` / `action` exports on route modules.

- **Reads:** controller actions query persistence (or anything else) and `context.render(...)` HTML, or return other `Response`s. ([guides: Start Here](https://guides.remix.run/start-here/))
- **Writes:** HTML `<form method="POST">` to a typed href; `formData()` middleware; `remix/data-schema` / `remix/data-schema/form-data` validation; `redirect(..., 303)` after success. ([guides: Forms](https://guides.remix.run/forms-and-mutations/), [SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))
- **Frames:** server-rendered UI with a `src` that the client can load, navigate, or reload independently. Forms can progressively enhance into frame navigations. ([beta preview](https://remix.run/blog/remix-3-beta-preview), [Jam recap](https://remix.run/blog/remix-jam-2025-recap), [beta.6 notes](https://github.com/remix-run/remix/releases/tag/remix%403.0.0-beta.6))

### Server vs client

- Default is **server-rendered HTML**. “Hydrate only when necessary.” ([SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))
- Browser interactivity: wrap a component in `clientEntry(import.meta.url, Component)` and start the client with `run(...)`. Props must be serializable. ([guides: Start Here](https://guides.remix.run/start-here/), [SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))
- Browser source lives in colocated `public/` directories (`app/**/public/**`); the asset server compiles TS/JSX on demand (“unbundling”). No Vite plugin in the template. ([beta preview](https://remix.run/blog/remix-3-beta-preview), [template](https://github.com/remix-run/remix/tree/main/template))
- First-party UI primitives exist under `remix/ui/*` (button, input, select, menu, accordion, …). ([packages/remix exports](https://raw.githubusercontent.com/remix-run/remix/main/packages/remix/package.json), [api.remix.run](https://api.remix.run/))

### TypeScript

First-class. Template is TypeScript-only (`"type": "module"`, `jsxImportSource: "remix/ui"`, `module`/`moduleResolution`: `NodeNext`, `allowImportingTsExtensions`, `verbatimModuleSyntax`). Dev/start run `node --import remix/node-tsx server.ts` — no separate compile step in the starter scripts. ([template/tsconfig.json](https://raw.githubusercontent.com/remix-run/remix/main/template/tsconfig.json), [template/package.json](https://raw.githubusercontent.com/remix-run/remix/main/template/package.json), [guides: Start Here](https://guides.remix.run/start-here/))

## 4. Runtime and deploy

### What is first-class

| Runtime | What first-party sources actually ship |
| --- | --- |
| **Node.js ≥ 24.3.0** | Official template, `remix/node-fetch-server` (`createRequestListener` for `node:http` / `https` / `http2`), `remix/node-tsx`, `remix/node-hmr`. Default listen port 44100, `PORT` override. ([template/server.ts](https://raw.githubusercontent.com/remix-run/remix/main/template/server.ts), [node-fetch-server README](https://github.com/remix-run/remix/blob/main/packages/node-fetch-server/README.md), [guides: Production](https://guides.remix.run/production/)) |
| **Bun** | Documented as a Fetch handler (`Bun.serve({ fetch })`). SQLite driver uses `bun:sqlite` when on Bun. Maintainer (sergiodxa, 3 May 2026): “Yes it works fine on Bun, some parts may need adapters like the data-table package.” ([guides: Request Handling](https://guides.remix.run/request-handling/), [data-table-sqlite README](https://github.com/remix-run/remix/blob/main/packages/data-table-sqlite/README.md), [discussion #11321](https://github.com/remix-run/remix/discussions/11321)) |
| **Deno** | Documented as `Deno.serve((request) => router.fetch(request))`. No Deno-specific adapter package in the published `remix` exports. ([guides: Request Handling](https://guides.remix.run/request-handling/), [packages/remix/package.json](https://raw.githubusercontent.com/remix-run/remix/main/packages/remix/package.json)) |
| **Cloudflare Workers** | Documented as `export default { fetch(request) { return router.fetch(request) } }`. Maintainer: “You can use it with any JS runtime including CF Workers.” Repo goals also list Workers as a portability target. There is **no** `@remix-run/cloudflare` (or similar) adapter in the Remix 3 package list — that name now belongs to the React Router line. ([guides: Request Handling](https://guides.remix.run/request-handling/), [discussion #11321](https://github.com/remix-run/remix/discussions/11321), [README goals](https://github.com/remix-run/remix/blob/main/README.md)) |
| **Static / SSG** | The **app template is a long-running server**, not a static site. The **guides site** can be prerendered to static HTML for GitHub Pages (`pnpm --filter remix-guides run prerender`). That is a docs-site capability, not the default app shape. ([guides README](https://github.com/remix-run/remix/blob/main/docs/guides/README.md), [template](https://github.com/remix-run/remix/tree/main/template)) |
| **Local-only** | `npm run dev` / `start` / `hmr` are local Node processes. Nothing in the template requires a specific cloud host. |

Repo-level claim: packages “work seamlessly across Node.js, Bun, Deno, Cloudflare Workers, and other environments” by using Web APIs. ([README](https://github.com/remix-run/remix/blob/main/README.md))

### Constraints that matter for a personal deploy

Documented, not inferred product advice:

- **Need a JavaScript server** for a normal Remix 3 app. The starter is `node … server.ts`. ([template/server.ts](https://raw.githubusercontent.com/remix-run/remix/main/template/server.ts))
- **Official starter requires Node ≥ 24.3.0.** ([template/package.json](https://raw.githubusercontent.com/remix-run/remix/main/template/package.json))
- **Not every middleware is portable.** “The current static-file and compression middleware use Node filesystem and compression APIs. On a worker, serve static assets through the platform and use the platform's response compression instead.” `asyncContext()` “uses Node's async context support.” ([guides: Request Handling](https://guides.remix.run/request-handling/))
- **Filesystem session / upload / SQLite storage is single-process.** Production guide: “Memory sessions, process-local caches, and local upload directories do not automatically work across replicas.” SQLite docs: good fit for “local development, embedded deployments, and single-node services”; wipe/reset assume one process owns the file; no cross-process migration lock. ([guides: Production](https://guides.remix.run/production/), [data-table-sqlite](https://github.com/remix-run/remix/blob/main/packages/data-table-sqlite/README.md))
- **No first-party host adapters** in the Remix 3 umbrella comparable to Remix 2’s `@remix-run/architect`, `@remix-run/cloudflare-pages`, `@remix-run/vercel`, etc. Remix 2 adapters moved to `@react-router/*`. ([RR upgrade table](https://reactrouter.com/upgrading/remix), [remix package exports](https://raw.githubusercontent.com/remix-run/remix/main/packages/remix/package.json))
- **Nothing in first-party docs rules out a personal Node deploy** (VPS, local machine, any host that can run Node 24.3+ and bind a port). `node-fetch-server` documents `host` / `trustProxy` for reverse-proxied VPS setups. ([node-fetch-server README](https://github.com/remix-run/remix/blob/main/packages/node-fetch-server/README.md), [guides: Production](https://guides.remix.run/production/))

## 5. Persistence and forms

First-party CRUD path exists and is the blessed one.

### Data

- `remix/data-table`: typed tables, query objects, CRUD helpers (`find` / `findOne` / `findMany` / `create` / `update` / `delete` and `*Many` variants), relations, transactions, raw SQL escape hatch. ([data-table README](https://github.com/remix-run/remix/blob/main/packages/data-table/README.md))
- Dialects shipped in the umbrella package:
  - **SQLite** — `createSqliteDatabase` via `node:sqlite` or `bun:sqlite`. No extra npm driver required. ([data-table-sqlite](https://github.com/remix-run/remix/blob/main/packages/data-table-sqlite/README.md))
  - **PostgreSQL** — `createPostgresDatabase`; optional peer `pg`. ([data-table-postgres](https://github.com/remix-run/remix/blob/main/packages/data-table-postgres/README.md), [packages/remix/package.json](https://raw.githubusercontent.com/remix-run/remix/main/packages/remix/package.json))
  - **MySQL** — `createMysqlDatabase`; optional peer `mysql2`.
- Migrations: hand-written `up.sql` / `down.sql` directories; `remix db status|migrate|seed|reset|wipe`; config in `remix.json`. Bookstore demo uses SQLite at `db/bookstore.sqlite` with that config. ([data-table README](https://github.com/remix-run/remix/blob/main/packages/data-table/README.md), [bookstore remix.json](https://raw.githubusercontent.com/remix-run/remix/main/demos/bookstore/remix.json), [bookstore README](https://github.com/remix-run/remix/blob/main/demos/bookstore/README.md))
- Validation: `remix/data-schema` (and `form-data` / `coerce` / `checks` subpaths). ([SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))

### Forms and mutations

Blessed sequence, stated in guides and the skill:

1. Real `<form method="POST">` with named controls and `routes.*.href(...)`.
2. `formData()` middleware (and `methodOverride()` if the contract uses PUT/PATCH/DELETE via `_method`).
3. `s.parseSafe(formSchema, formData)`; re-render the form at 400 on failure.
4. Persist via `data-table`.
5. `redirect(..., 303)` (POST-redirect-GET). Session `flash` for one-request messages.
6. Only then optionally `clientEntry` for pending/optimistic UI. The server action must stay correct without JS.

([guides: Forms](https://guides.remix.run/forms-and-mutations/), [SKILL.md canonical “Validate, mutate, and respond”](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))

### Adjacent first-party pieces used by a CRUD app

- **Sessions:** `remix/session` + `remix/middleware/session`. Storage: cookie, filesystem, memory, Redis, Memcache. ([SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md), [README package list](https://github.com/remix-run/remix/blob/main/README.md))
- **Auth:** `remix/auth` (credentials, OAuth, OIDC) + `remix/middleware/auth` (`requireAuth`). ([SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))
- **Uploads:** `remix/form-data-parser`, `remix/file-storage` (fs, memory, S3). ([README](https://github.com/remix-run/remix/blob/main/README.md))
- **CSRF / COP / CORS** middleware exist and are recommended when cookie sessions mutate state. ([SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))

Worked example: `demos/bookstore` — admin CRUD, cart, checkout, auth, multipart uploads, SQLite, filesystem sessions. ([bookstore README](https://github.com/remix-run/remix/blob/main/demos/bookstore/README.md))

## 6. Gaps and gotchas

From maintainers and first-party docs, not community recaps:

1. **Explicit “not production ready.”** 30 April 2026: pre-release, “there is still a lot to do,” “tell us … where it breaks (and it will!).” Homepage still calls it a beta on 15 August 2026. ([beta preview](https://remix.run/blog/remix-3-beta-preview), [remix.run](https://remix.run/))
2. **Breaking changes are still landing between betas.** beta.6 (14 August 2026) breaks import paths, cookie codecs, route-pattern param rules, href helper signatures, session cookie `httpOnly` default, test CLI, frame resolver arguments, and data-table factory APIs. ([beta.6 notes](https://github.com/remix-run/remix/releases/tag/remix%403.0.0-beta.6))
3. **0.x packages may break on minor bumps.** Decision 002: break sub-packages as soon as ready; go slow on umbrella `remix` majors *once* they exist as stables. Remix 3 is still on `3.0.0-beta.*`. ([decision 002](https://github.com/remix-run/remix/blob/main/decisions/002-branching-and-releasing.md))
4. **Docs are split and partly in-progress.** Narrative guides are “in-progress” and live at [guides.remix.run](https://guides.remix.run/); [remix.run/docs](https://remix.run/docs) redirects to the generated API site. CONTRIBUTING still says “live Remix documentation” is `https://remix.run/docs`. ([guides README](https://github.com/remix-run/remix/blob/main/docs/guides/README.md), [CONTRIBUTING.md](https://github.com/remix-run/remix/blob/main/CONTRIBUTING.md))
5. **Not React.** No React hooks, no RSC, no Remix 2 route-module API. The May 2025 post mentioned a Preact fork; current shipped model is Remix’s own `remix/ui` reconciler. ([Wake up](https://remix.run/blog/wake-up-remix), [SKILL.md](https://github.com/remix-run/remix/blob/main/.agents/skills/remix/SKILL.md))
6. **Remix 2 is EOL.** No security updates after React Router v8 (17 June 2026). New Remix 2 apps are discouraged (`create-remix` → `create-react-router` since 2.17.0). ([RR v8](https://remix.run/blog/react-router-v8), [v2.17.0 changelog](https://v2.remix.run/docs/start/changelog/))
7. **No Remix 2 → Remix 3 upgrade.** Documented path is Remix 2 → React Router. ([upgrade guide](https://reactrouter.com/upgrading/remix))
8. **Host adapters from Remix 2 are not part of Remix 3.** Cloudflare/Deno/Architect/Express adapters in the old `@remix-run/*` names are the React Router line. Remix 3 documents raw Fetch entries instead. ([upgrade table](https://reactrouter.com/upgrading/remix), [guides: Request Handling](https://guides.remix.run/request-handling/))
9. **Worker / multi-process caveats.** Node-only middleware (static files, compression, `asyncContext`); SQLite and fs session/upload storage are single-node / single-process; SQLite migrations have `migrationLock: false`. ([guides: Request Handling](https://guides.remix.run/request-handling/), [guides: Production](https://guides.remix.run/production/), [data-table-sqlite](https://github.com/remix-run/remix/blob/main/packages/data-table-sqlite/README.md))
10. **Template vs “full stack” marketing.** The beta post says the preview already includes routing, sessions, auth, forms, uploads, static files, assets, data, SSR, UI. The **generated starter** is a home page only; data, auth, and CRUD appear when you add them (bookstore demo / guides). ([beta preview](https://remix.run/blog/remix-3-beta-preview), [template README](https://github.com/remix-run/remix/blob/main/template/README.md))
11. **Weekly release cadence during beta.** Beta post: “following up with new features and releases every week.” ([beta preview](https://remix.run/blog/remix-3-beta-preview))
12. **Remix homepage itself is a Remix 3 app** (announced as built on Remix 3 alpha, without React). That is a first-party existence proof, not a production-readiness claim. ([A Brand New Remix](https://remix.run/blog/brand-new), 6 May 2026)

## Sources

- [remix.run](https://remix.run/) (fetched 15 Aug 2026)
- [Remix 3 Beta Preview](https://remix.run/blog/remix-3-beta-preview) (30 Apr 2026)
- [Wake up, Remix!](https://remix.run/blog/wake-up-remix) (28 May 2025)
- [Merging Remix and React Router](https://remix.run/blog/merging-remix-and-react-router) (15 May 2024; Dec 2024 update)
- [Incremental Path to React 19](https://remix.run/blog/incremental-path-to-react-19) (21 May 2024)
- [Remix Jam 2025 Recap](https://remix.run/blog/remix-jam-2025-recap) (20 Oct 2025)
- [React Router v8](https://remix.run/blog/react-router-v8) (17 Jun 2026)
- [A Brand New Remix](https://remix.run/blog/brand-new) (6 May 2026)
- [remix-run/remix](https://github.com/remix-run/remix) README, template, packages, decisions, demos, docs/guides
- [remix@3.0.0-beta.6 release](https://github.com/remix-run/remix/releases/tag/remix%403.0.0-beta.6)
- [api.remix.run](https://api.remix.run/)
- [guides.remix.run](https://guides.remix.run/)
- [v2.remix.run docs](https://v2.remix.run/docs/) and [v2 changelog](https://v2.remix.run/docs/start/changelog/)
- [React Router: Upgrading from Remix v2](https://reactrouter.com/upgrading/remix)
- [Discussion #11321](https://github.com/remix-run/remix/discussions/11321) (maintainer replies on Workers / Bun)
- npm registry: `remix` dist-tags; `react-router@8.3.0`; `@remix-run/react@2.17.5`
