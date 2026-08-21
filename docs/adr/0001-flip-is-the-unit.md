# The unit of account is a Flip

Fliptrack accounts for profit per Flip: one physical thing, one record, from Acquisition until Sale, Write-off, or until it is retired by re-split. Listing, Sale, and Write-off surround that unit; they are not it. Purchase-as-unit, listing-as-unit, and quantity-on-a-line were rejected because lots, kits, dual-listing, and remainders only line up when the owned thing is the grain.

## Considered options

- **Purchase/lot as the unit** — one buy, one P&L. Remainders and per-piece profit become pro-rata fiction.
- **Listing as the unit** — copies the marketplace. Breaks when one Flip has two listings, or none yet.
- **Sale as the unit** — works for kits, loses unsold Inventory and per-Flip P&L.
- **Quantity on a line** — one record, leftover qty. Conflicts with per-Flip profit and different sale dates or channels.
- **Chosen: Flip + Acquisition + Listing + Sale + Write-off** — split at or after intake; a Sale or Write-off may consume Flips from any Acquisition(s); a Listing is a live or ended attempt whose Flip set is fixed ([ADR-0009](0009-listing-flip-set-is-fixed.md)). Write-off, undo, and hitch are [ADR-0006](0006-write-off-undo-hitch.md).

## Consequences

- Inventory is derived (no standing Sale, no standing Write-off, not Retired), not a fifth object.
- Re-split retires the original Flip and creates children on the same Acquisition; allowed only when not sold, not written off, and with no live Listing. No merge.
- Every Flip has exactly one Acquisition (buys, gifts, opening stock). A Sale does not require a Listing.
- A Flip has at most one standing Sale or one standing Write-off, never both; many may be Undone. See [ADR-0006](0006-write-off-undo-hitch.md).
- Cost attachment and the profit formula hang off this shape; they are not decided here.

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [What is the unit of a flip?](https://github.com/BenPlusPlus/fliptrack/issues/4).
