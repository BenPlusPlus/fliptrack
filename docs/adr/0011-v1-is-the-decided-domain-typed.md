# v1 is the decided domain, typed

The first useful version is the domain already decided, typed by the Operator, enough to kill the spreadsheet: Acquisition through Write-off, Undone, Re-split, Tags, and Listing. It is not a thinner logging stub, and it is not import. Reports are Tag slices, Books-wide Profit and Inventory, and a date range on Profit. Acquisition is mobile-first and also works on desktop; everything else is desk-first. This map specs v1 only.

## Considered options

- **Thin logging only (Acquisition + Sale; skip Write-off, undo, Listing, Re-split)** — those cases stay in the spreadsheet.
- **Import-first v1** — seller files never carry Acquisition cost; matching is its own product ([How do flips enter the system?](https://github.com/BenPlusPlus/fliptrack/issues/6)).
- **Tag slices only, no date range** — "what did I make this month?" is the first spreadsheet question.
- **Full stats in v1** — per-Channel, percents, averages, days-to-sell, cost mix. A reporting product on top of the loop.
- **Operator download in v1** — portability, not the backup ([ADR-0007](0007-railway-postgres-pitr.md)). Not needed to replace the spreadsheet.
- **Photos on the Flip** — the photography product in disguise; aisle-slow; hosting. Name and notes instead.
- **Multi-currency** — a different product. One currency, USD, no field.
- **This map specs later features so implementers do not paint into a corner** — import, download, and richer stats are later maps. Domain already decided is the corner guard.

## Consequences

- Remaining tickets on this map are screen IA, persistence, and the slice plan. They spec v1 only.
- Channel is typed on Sale ([ADR-0010](0010-channel-is-a-named-sale-fact.md)) and not reported in v1.
- Acquisition date exists and is not a v1 report axis. Acquisition source is a Tag, not a field.
- Instance-admin surfaces (sign-up toggle, inspector, temp password) ship; wizard and login must.
- No prototype unless screen IA gets stuck.
- First implementation slice: deploy + login + one Acquisition. The rest of the DAG is the slice-plan ticket.

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [What belongs in the first useful version?](https://github.com/BenPlusPlus/fliptrack/issues/10).
