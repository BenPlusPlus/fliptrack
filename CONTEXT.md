# Fliptrack

Personal flip-sales profit tracking: what you acquire, what you still have in stock, what you sold, and what you wrote off.

## Language

**Flip**:
A single physical thing you own. It never becomes a different physical thing; Profit attaches to it.
_Avoid_: Item, piece, SKU, asset, inventory unit, product, unit

**Acquisition**:
The event that brought one or more Flips into ownership — a thrift buy, an online order, opening stock, or a gift.
_Avoid_: Purchase, lot, buy, receipt, order

**Listing**:
An attempt to sell one or more Flips. It is live or ended.
_Avoid_: Post, ad, offer

**Sale**:
The event in which one or more Flips were sold. It stands, or it is Undone.
_Avoid_: Order, transaction, payout, purchase

**Write-off**:
The event in which one or more Flips left Inventory with no buyer — donated, trashed, or lost. It stands, or it is Undone; a Flip cannot have both a Sale and a Write-off that stand.
_Avoid_: disposal, removal, discard, scrap, donation

**Undone**:
A Sale or Write-off that no longer stands because the Flip came back.
_Avoid_: cancelled, void, reversed, failed, deleted

**Inventory**:
The Flips still in stock: not sold, not written off, and not Retired. Undone Sales and Write-offs do not count; keep-for-self is still Inventory.
_Avoid_: Stock as a separate object, catalog

**Re-split**:
Replacing one Flip with two or more new Flips on the same Acquisition. Allowed only when that Flip is not sold, not written off, and has no live Listing. The new Flips start with the parent's Tags.
_Avoid_: Merge, split-in-place, quantity adjustment

**Retired**:
A Flip that was re-split. It is not owned, not sold, not written off, and not a P&L unit; its children are.
_Avoid_: Deleted, cancelled, sold, archived

**Operator**:
A login that owns exactly one Books.
_Avoid_: account, user, tenant

**Books**:
One Operator's isolated Acquisitions, Flips, Listings, Sales, Write-offs, and Tags.
_Avoid_: tenant, account, database

**Instance admin**:
A capability on an Operator: toggle sign-up, and open a read-only inspector on any Books.
_Avoid_: superuser, global admin, impersonation

**Tag**:
A named label in one Books that only a Flip carries. A Flip may have many, including none. The Operator creates one by naming it; the set is flat, has no privileged Category, and does not freeze on Sale or Write-off.
_Avoid_: category, label, folder, collection, hashtag

**Item cost**:
That Flip's share of the price paid for the goods, before tax and inbound shipping.
_Avoid_: value, lot price, unit cost, sticker, merchandise, purchase price

**Tax paid**:
Tax paid at Acquisition for that Flip.
_Avoid_: sales tax, VAT, acquisition tax

**Inbound shipping**:
Money paid to get that Flip to the Operator at Acquisition. Not return postage.
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
Money the Operator paid to send Flips on a Sale or Write-off, including return postage on an Undone Sale.
_Avoid_: postage, label, shipping

**Supplies**:
Money for packing materials on a Sale or Write-off.
_Avoid_: packaging, materials, shipping supplies

**Sale price**:
What the buyer paid for the goods on a Sale, not shipping.
_Avoid_: ask, sticker, hammer, item price, sold for, proceeds

**Buyer-paid shipping**:
Shipping the buyer paid on a Sale. $0 means local pickup or that the channel handled shipping off the books.
_Avoid_: shipping charged, postage collected, shipping income, outbound shipping

**Proceeds**:
Sale price plus Buyer-paid shipping. Excludes remitted tax. Not typed.
_Avoid_: revenue, sales, gross, payout, amount received, income

**Profit**:
Proceeds minus Acquisition cost, Listing spend, Marketplace fee, Outbound shipping, and Supplies for that Flip. Exists once the Flip has a Sale or Write-off that is not Undone; a negative amount is a loss.
_Avoid_: net, earnings, income, gain, margin, realized profit, gross profit

**Sale date**:
The day the Sale occurred. Profit happens on this day.
_Avoid_: payout date, cleared date, listed date, closed date

**Write-off date**:
The day the Write-off occurred. Profit happens on this day.
_Avoid_: disposal date, loss date
