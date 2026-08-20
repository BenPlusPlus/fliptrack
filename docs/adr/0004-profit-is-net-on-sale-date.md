# Profit is net of every named cost, on Sale date

A sold Flip's Profit is Proceeds (Sale price plus Buyer-paid shipping) minus Acquisition cost, its Listing spend, and its share of Marketplace fee, Outbound shipping, and Supplies. Profit happens on Sale date. A written-off Flip uses the same formula with $0 Proceeds, on Write-off date. Unsold Inventory is Acquisition cost, not hoped-for Profit. Shared Sale, Write-off, and Listing amounts split pro-rata by Acquisition cost — even by count if those are all $0 — including Listing spend from every Listing that included this Flip or a Retired ancestor, and hitch from every Undone Sale or Write-off that included this Flip or a Retired ancestor. A Flip's share on a standing Sale or Write-off does not move. Undo, Write-off, freeze, and hitch are [ADR-0006](0006-write-off-undo-hitch.md).

## Considered options

- **Gross and net as two official totals** — "fees ate it" is already the cost lines.
- **Item price only as money-in** — hides shipping P&L and the fee base marketplaces actually use.
- **Payout / cleared date** — holds were already refused as cost objects.
- **Mark unsold Inventory to list price** — Profit would exist without a Sale.
- **Only the Listing that produced the Sale counts** — Profit would omit promo and bumps on dead or dual Listings.
- **First Flip sold eats all Listing spend** — a sibling takes a dump it didn't earn, or a sold Flip's number moves later.
- **Even-by-count or Item-cost weights for a kit Sale** — a heavily inbound-shipped sibling would look cheap to sell.

## Consequences

- No Gross profit, taxable income, IRS basis, or annualized ROI objects.
- Remitted tax is not Proceeds. $0 Buyer-paid shipping is local pickup or channel-handled shipping.
- Listing spend can exist with no Sale; it enters Profit when the Flip (or a child after Re-split) has a standing Sale or Write-off.
- Listing spend is frozen once any Flip on that Listing has a standing Sale or Write-off.

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [What does profit mean?](https://github.com/BenPlusPlus/fliptrack/issues/8).
