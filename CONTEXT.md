# Fliptrack

Personal flip-sales profit tracking: what you acquire, what you still own, and what you sold.

## Language

**Flip**:
A single physical thing you own. It never becomes a different physical thing; the unit profit attaches to it.
_Avoid_: Item, piece, SKU, asset, inventory unit, product, unit

**Acquisition**:
The event that brought one or more Flips into ownership — a thrift buy, an online order, opening stock, or a gift.
_Avoid_: Purchase, lot, buy, receipt, order

**Listing**:
An attempt to sell one or more Flips. It is live or ended.
_Avoid_: Post, ad, offer

**Sale**:
The event in which one or more Flips were sold.
_Avoid_: Order, transaction, payout, purchase

**Inventory**:
The Flips still owned: each Flip that is not sold and not retired.
_Avoid_: Stock as a separate object, catalog

**Re-split**:
Replacing one Flip with two or more new Flips on the same Acquisition. Allowed only when that Flip is unsold and has no live Listing.
_Avoid_: Merge, split-in-place, quantity adjustment

**Retired**:
A Flip that was re-split. It is not owned, not sold, and not a P&L unit; its children are.
_Avoid_: Deleted, cancelled, sold, archived
