# Hosted Operators with isolated Books

Fliptrack is used by Operators, each with their own Books. It lives as a long-running process on the public internet with a cloud database, because Acquisition is captured on a phone away from the desk and losing the books is unacceptable. This map does not design a SaaS product: sign-up is a door the instance admin opens, and it starts closed.

## Considered options

- **Local-only on one PC** — aisle capture on a phone cannot reach it, and there is no backup.
- **Home server + VPN** — cell-in-a-store and a sign-up door both fight a private network.
- **Single shared ledger** — a second login would see the same Inventory.
- **SaaS product on this map** — billing, public launch, ToS, and abuse are a later effort. Isolated Books are the option.
- **Admin superuser or impersonation** — “own Books” would be a UI fiction; impersonation is how a view-only admin writes a Sale.

## Consequences

- Login is required. Sitting on one machine is not enough.
- Sign-up creates an Operator and starts closed.
- Instance admin may inspect any Books read-only, and cannot mutate them.
- Host and engine are [ADR-0007](0007-railway-postgres-pitr.md). How an Operator signs in is [ADR-0008](0008-email-password-first-run-wizard.md).
- Flip, Acquisition, Listing, Sale, Write-off, and Inventory stay inside one Books.

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [Who uses Fliptrack, and where does it live?](https://github.com/BenPlusPlus/fliptrack/issues/5).
