# Standing Write-off money is replaced in place

A standing Write-off's typed amounts — Outbound shipping, Supplies — and its Write-off date are facts the Operator may replace. There is no Adjustment. Profit is the current amounts on the current Write-off date; $0 Proceeds is not a field. $0 is allowed on every money line; negatives are not. Optional notes live on the Write-off. Listing spend stays frozen: freeze is a realizing event standing, not amounts being final.

## Considered options

- **Dated Adjustment object** — original amounts freeze; P&L is original plus deltas. Refused for Sale ([ADR-0012](0012-standing-sale-money-is-replaced.md)); same ledger this map declined.
- **Money cannot change** — a wrong dump fee or a later hauler bill cannot be typed; undo is illegal while the Flips are still gone.
- **Per-Flip override on a kit** — money that lives on the Write-off would move onto the Flip.
- **Unfreeze Listing spend on edit** — freeze is not "amounts are final."
- **Book the delta on edit date** — refused with Adjustment: Profit is on Write-off date.
- **Typed whole stays the original after a partial undo** — a later remaining-kit hauler correction cannot be typed without raising sibling shares or knowing to punch a number the field does not show.
- **Cannot edit once any Flip is Undone** — one shirt found, then a dump-fee correction would be stuck.
- **Required reason or append-only log** — an audit ledger.

## Consequences

- $0 Proceeds stays $0. No Sale price, Buyer-paid shipping, Marketplace fee, or Channel on a Write-off.
- On a kit, an edit splits the new whole pro-rata by Acquisition cost across Flips that still stand. Undo still does not move sibling shares ([ADR-0006](0006-write-off-undo-hitch.md)): it shrinks each typed money line by that Flip's then-share; cost shares hitch as a snapshot. Later edits do not rewrite hitch. If every Flip on the Write-off is Undone, there is no standing money to edit.
- Sale replace is [ADR-0012](0012-standing-sale-money-is-replaced.md).

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [Does a standing Write-off follow the same replace-in-place rule as a Sale?](https://github.com/BenPlusPlus/fliptrack/issues/22).
