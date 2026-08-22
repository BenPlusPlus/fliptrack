# Standing Sale money is replaced in place

A standing Sale's typed amounts — Sale price, Buyer-paid shipping, Marketplace fee, Outbound shipping, Supplies — and its Sale date are facts the Operator may replace. There is no Refund, Adjustment, or credit-memo. Profit is the current amounts on the current Sale date. $0 is allowed on every money line; negatives are not. Optional notes live on the Sale. Listing spend stays frozen: freeze is a realizing event standing, not amounts being final.

## Considered options

- **Dated Adjustment object** — original amounts freeze; P&L is original plus deltas. A second realizing moment; the ledger this map declined.
- **Money cannot change** — partial refund and never-paid cannot be typed; undo is illegal when the buyer kept the Flip.
- **Per-Flip override on a kit** — money that lives on the Sale would move onto the Flip.
- **Unfreeze Listing spend on edit** — freeze is not "amounts are final."
- **Book the delta on edit date** — refused with Adjustment: Profit is on Sale date.
- **Typed whole stays the original after a partial undo** — a later remaining-kit refund cannot be typed without raising sibling shares or knowing to punch a number the field does not show.
- **Cannot edit once any Flip is Undone** — kit return then a stain refund or late fee would be stuck.
- **Required reason or append-only log** — an audit ledger.

## Consequences

- Never-paid, Flip kept, is a $0 Sale, not a Write-off.
- On a kit, an edit splits the new whole pro-rata by Acquisition cost across Flips that still stand. Undo still does not move sibling shares ([ADR-0006](0006-write-off-undo-hitch.md)): it shrinks each typed money line by that Flip's then-share; cost shares hitch as a snapshot; Proceeds shares are subtracted and do not hitch. Later edits do not rewrite hitch. If every Flip on the Sale is Undone, there is no standing money to edit.
- Channel is replaced the same way ([ADR-0016](0016-standing-sale-channel-is-replaced.md)). Write-off analog is [ADR-0015](0015-standing-write-off-money-is-replaced.md).

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [How do you change a standing Sale's money without undoing it?](https://github.com/BenPlusPlus/fliptrack/issues/16).
