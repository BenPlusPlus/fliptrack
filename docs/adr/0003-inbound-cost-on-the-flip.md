# Inbound cost is three amounts on the Flip

A Flip stores Item cost, Tax paid, and Inbound shipping. Acquisition cost is their sum. Tax paid and Inbound shipping are typed once per intake (or inherited on re-split) and snapshotted onto each Flip, pro-rata by Item cost — even by count if every Item cost in that act is $0. Children's Item costs must sum to the parent's. Sale-side money hangs on the Sale or Listing, whole. Operating costs are not Fliptrack objects.

## Considered options

- **One landed amount on the Flip** — aisle-simple, cannot report tax vs inbound shipping vs merchandise.
- **One leftover pot (tax+shipping lumped)** — still cannot split tax from inbound shipping in reports.
- **Receipt totals only on the Acquisition, shares derived** — sibling shares move if someone edits an Item cost; a sold Flip's numbers are not frozen.
- **Even-by-count allocation** — dumps the same inbound shipping on a hanger as on a lamp.
- **Typed Item costs may undershoot; remainder becomes extras** — extras would mix discount with tax and shipping.
- **A general expense ledger / Books-level operating costs** — mileage, booth, storage. A second product; not Flip P&L inputs.
- **Sale fees stored split onto Flips** — a kit Sale's Marketplace fee belongs on the Sale; per-Flip slicing is the profit formula.

## Consequences

- No lot-price object; merchandise total is the sum of Item costs in that act.
- $0 is allowed on all three inbound amounts (gifts, local buys, tax-included stickers).
- Other acquisition outgo (duties, buyer-protection) folds into Item cost.
- Buyer-charged shipping and marketplace-remitted tax are not costs.
- Listing spend can exist with no Sale.
- Return postage is Outbound shipping on the Undone Sale, not Inbound shipping. See [ADR-0006](0006-write-off-undo-hitch.md).

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [How do costs attach to a flip?](https://github.com/BenPlusPlus/fliptrack/issues/7).
