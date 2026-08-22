# Flip inbound freezes when realized; unused Flip may be removed

Name, notes, and Tags on a Flip stay live. Item cost, Tax paid, and Inbound shipping may be replaced only while the Flip is Inventory. Once a standing Sale or Write-off exists, inbound is frozen; Sale- or Write-off-side money is what you replace. A Flip that was never on a Listing and never had a Sale or Write-off — including Undone — may be removed. Removing the last Flip removes the Acquisition. Ghosts are not a $0 Write-off.

Late add to an Acquisition is a new sitting: Tax paid and Inbound shipping on that sitting default $0 and snapshot onto the new Flips only. Existing snapshots do not move.

## Considered options

- **Inbound always replaceable** — a sold Flip's Acquisition cost revises; kit weights drift under a standing Sale.
- **No remove; $0 Write-off for aisle mistakes** — a glare on the receipt becomes a Profit event.
- **Re-split the original tax/inbound across old and new Flips on late add** — rewrites snapshots, including a Flip already sold.

## Consequences

- Re-split remains the sum-to-parent path, not delete ([ADR-0003](0003-inbound-cost-on-the-flip.md)).
- Listing membership, even ended, blocks remove: the Flip is in that Listing's historical set ([ADR-0009](0009-listing-flip-set-is-fixed.md)).

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [What is the screen and information architecture?](https://github.com/BenPlusPlus/fliptrack/issues/19).
