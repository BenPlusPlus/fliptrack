# Standing Sale Channel is replaced in place

A standing Sale's Channel is a typed fact the Operator may replace, same gate as money and Sale date: at least one Flip still stands. There is no move-to-another-Channel event. A wrong venue is an edit, not undo — undo is for Flips that came back.

## Considered options

- **Frozen once saved** — typo "eBay" for "Mercari" means undo and re-log, or live with it. Undo is not for a mis-named venue.
- **Free text after all** — rejected: Channel is a named Books object ([ADR-0010](0010-channel-is-a-named-sale-fact.md)).
- **A Channel-change event** — Adjustment-shaped; the ledger this map declined ([ADR-0012](0012-standing-sale-money-is-replaced.md)).

## Consequences

- Create-by-naming still creates; replace picks an existing Channel or names a new one.
- Write-off has no Channel ([ADR-0015](0015-standing-write-off-money-is-replaced.md)).

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [What is the screen and information architecture?](https://github.com/BenPlusPlus/fliptrack/issues/19).
