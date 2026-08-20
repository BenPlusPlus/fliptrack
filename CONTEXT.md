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

**Operator**:
A login that owns exactly one Books.
_Avoid_: account, user, tenant

**Books**:
One Operator's isolated Acquisitions, Flips, Listings, and Sales.
_Avoid_: tenant, account, database

**Instance admin**:
A capability on an Operator: toggle sign-up, and open a read-only inspector on any Books.
_Avoid_: superuser, global admin, impersonation

**Item cost**:
That Flip's share of the price paid for the goods, before tax and inbound shipping.
_Avoid_: value, lot price, unit cost, sticker, merchandise, purchase price

**Tax paid**:
Tax paid at Acquisition for that Flip.
_Avoid_: sales tax, VAT, acquisition tax

**Inbound shipping**:
Money paid to get that Flip to the Operator.
_Avoid_: postage, freight, shipping

**Acquisition cost**:
Item cost plus Tax paid plus Inbound shipping for that Flip.
_Avoid_: landed cost, basis, purchase cost

**Listing spend**:
Money paid to run or promote a Listing.
_Avoid_: ad spend, promoted listings, insertion fee, bump

**Marketplace fee**:
Money the selling channel took on a Sale.
_Avoid_: final value fee, commission, processing fee, selling fee

**Outbound shipping**:
Money the Operator paid to ship a Sale.
_Avoid_: postage, label, shipping

**Supplies**:
Money for packing materials on a Sale.
_Avoid_: packaging, materials, shipping supplies
