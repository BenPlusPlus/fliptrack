# Railway, Postgres, PITR

Fliptrack runs as one always-on Node process on Railway (Hobby). Books live in a same-project Postgres, reached over the private `DATABASE_URL`. Losing the books is unacceptable, so Railway Postgres PITR is on from the first deploy. The template is unmanaged: cheapest beats paying a second vendor to own Postgres.

## Considered options

- **MySQL** — Remix 3 first-party has no `RETURNING` and no transactional DDL; Fly and Render have no managed MySQL.
- **SQLite on a volume** — a local file, not a remote cloud database. Already out as the system of record.
- **DigitalOcean App Platform + Managed Postgres** — fully managed, 7-day PITR included, about $20/mo. More than cheapest.
- **DigitalOcean App Platform + dev database** — about $12/mo, no backups. DigitalOcean says not for production; reopens losing-the-books.
- **Render Hobby + Render Postgres** — about $13/mo, 3-day PITR. Fully managed and cheaper than DigitalOcean, but the shortlist was Railway or DigitalOcean.
- **Fly Managed Postgres** — $38/mo for the database alone; PITR window unpublished on the pages cited.
- **Railway volume backups only** — pennies, but wiping the volume deletes the backups, and there is no rewind after a bad migration.
- **No backups, or Operator download as the backup** — a download is portability, only as good as the last click, and is not designed on this map. Skipping backups reopens [ADR-0002](0002-hosted-operators-isolated-books.md).
- **Split vendor (Neon, RDS, …)** — second bill and second restore drill.
- **HA / extra replicas** — not cheapest. Remix 3 needs shared session storage past one process.

## Consequences

- Not Serverless, not scale-to-zero. One process, one region, single-node Postgres (not Patroni HA).
- Restore is a new sibling Postgres; cut `DATABASE_URL` over. Volume snapshots are not the restore path.
- How an Operator signs in is [ADR-0008](0008-email-password-first-run-wizard.md).
- Operator-downloadable Books stays unspecified: portability, not this backup.

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [Where does Fliptrack run, and which cloud database?](https://github.com/BenPlusPlus/fliptrack/issues/13).
