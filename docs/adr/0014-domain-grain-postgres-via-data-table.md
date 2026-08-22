# Domain-grain Postgres via Remix data-table

v1 stores the decided domain in one Railway Postgres through Remix 3 `remix/data-table`. Money is integer cents, one currency, no currency column. Rows are UUIDs. Operator and Books are two tables, 1:1; every Books-owned table carries `books_id` and is scoped in the app. Inventory, Acquisition cost, Proceeds, Profit, freeze, and standing shares are queried, not stored. Hitch is a snapshot on the Sale–Flip / Write-off–Flip membership at undo.

## Considered options

- **Prisma, Drizzle, or raw `pg` only** — a second data stack next to Remix 3's blessed CRUD (`createPostgresDatabase`, hand-written `up.sql`/`down.sql`, `sql` hatch).
- **Row-level security, or a schema per Operator** — isolation is already the query scope. RLS is a second enforcement product. Schema-per-Operator fights the instance-admin inspector and `data-table`.
- **One table for Operator and Books** — they are 1:1, but the glossary has both; the inspector opens Books, not a login. Login facts stay on Operator.
- **`numeric` dollars** — share math and JS numbers; integer cents are exact.
- **A hitch table, or hitch columns on Flip** — hitch is not listed. Membership snapshots let Profit walk Retired ancestors without copying at Re-split.
- **A sessions table** — one Railway process; a signed cookie is enough ([ADR-0008](0008-email-password-first-run-wizard.md)). `credentials_changed_at` on Operator invalidates other devices on password change without a device list.
- **Soft-delete / audit `created_at` on every row** — the domain already has Undone, Retired, and ended. An audit ledger was refused with Adjustment ([ADR-0012](0012-standing-sale-money-is-replaced.md)).

## Consequences

- Junctions: Listing–Flip (frozen at create), Sale–Flip, Write-off–Flip, Flip–Tag. Dual-listing is two Listing–Flip rows. A Sale has no Listing foreign key.
- Event days are Postgres `date`. Names and notes, Acquisition date, and Flip inbound cents replace in place (kit shares recompute; hitch does not). Listing spend still freezes when a realizing event stands ([ADR-0004](0004-profit-is-net-on-sale-date.md)).
- More Flips may be added to an existing Acquisition. Re-split still retires the parent ([ADR-0001](0001-flip-is-the-unit.md)).
- Hard-delete is narrow: Tag (cascade Flip–Tag); unused Channel; a Flip that has never been on a Listing, Sale, or Write-off (and then an emptied Acquisition). Nothing else.
- Postgres enforces unique email, 1:1 Operator↔Books, unique Tag/Channel names per Books (case-insensitive), membership pairs, at most one standing Sale membership per Flip, at most one standing Write-off membership per Flip, one instance admin, one `instance_settings` row, and `CHECK (>= 0)` on stored cents. Never-both standing Sale and Write-off is the app transaction that writes the membership — not a derived column on Flip.
- Cookie session carries Operator id and `credentials_changed_at`; each device has its own cookie. Setup secret stays env. Sign-up door is `instance_settings.signup_open`.
- Write-off money and Write-off date mutability is not this decision.

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [How is v1 persisted?](https://github.com/BenPlusPlus/fliptrack/issues/20).
