# What do marketplaces already charge and export?

Research for [What do marketplaces already charge and export?](https://github.com/BenPlusPlus/fliptrack/issues/3). Facts from official seller help, fee schedules, and file-exchange / order-report docs. US consumer-goods resale, personal flipper. No product design.

**Scope.** eBay first (primary), then Mercari, Facebook Marketplace, Poshmark, Craigslist, and OfferUp — only where the marketplace itself publishes the claim.

**Method.** Claims are cited to the page that owns them. Rates and column names are what those pages said when fetched (August 2026). Fee schedules change; treat numbers as a snapshot, not a lock.

**Naming.** Fee and report lines use the marketplace’s own names, in quotes on first use.

---

## Cross-cutting answer

A shipped, checked-out sale on a managed-payments marketplace typically produces some mix of: a sale-price commission (eBay **final value fee**, Mercari **selling fee**, Poshmark seller fee, Facebook Marketplace **selling fee**), optional ads or listing upgrades, a shipping-label charge or a buyer-paid shipping pass-through, and sales tax that the marketplace collects from the buyer and remits. Payment processing is usually folded into that commission, not a second seller line — except where the marketplace still names a separate withdrawal fee (Mercari **Instant Pay**, eBay **express payouts**) or warns that a payment provider may charge on top (Facebook Marketplace).

None of the marketplaces know purchase-side cost. Mercari states this outright. eBay’s **Earnings** report has a seller-typed **Your cost** field that is optional and never shared with buyers. Item cost, inbound shipping, tax paid at acquisition, supplies, and storage are seller-owned.

eBay is the only marketplace in this set with both a dense official export surface (Seller Hub order / transaction / earnings CSVs plus a public Sell API) and a personal-developer path (free Developers Program + OAuth user token). Mercari and Poshmark publish seller CSVs. Facebook Marketplace shows an in-app sales history and does not document a seller CSV or public seller API. Craigslist and OfferUp local sales have no sale ledger to export.

---

## 1. eBay (ebay.com, US)

Primary sources: [Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822), [Seller fees | Seller Center](https://www.ebay.com/sellercenter/selling/start-selling-on-ebay/seller-fees), [How fees and selling costs are charged](https://www.ebay.com/help/selling/fees-credits-invoices/fees-selling-costs-charged?id=5297), [Taxes and import charges](https://www.ebay.com/help/selling/fees-credits-invoices/taxes-import-charges?id=4121), [Getting paid](https://www.ebay.com/help/selling/getting-paid/getting-paid-items-youve-sold?id=4814), [Transaction holds](https://www.ebay.com/help/selling/getting-paid/getting-paid-items-youve-sold/payments-hold?id=4816), [Reconciling sales transactions](https://www.ebay.com/help/selling/fees-credits-invoices/reconciling-ebay-sales-transactions?id=4847), [Earnings report](https://www.ebay.com/help/selling/fees-credits-invoices/reconciling-ebay-sales-transactions/earnings-report?id=5481), [Seller Hub](https://www.ebay.com/help/selling/selling-tools/seller-hub?id=4095), [Seller Hub Reports](https://www.ebay.com/help/selling/selling-tools/seller-hub-reports?id=4096), [Printing and canceling shipping labels](https://www.ebay.com/help/selling/shipping-items/labels-packaging-tips/buying-printing-shipping-labels?id=4157), [General campaign strategy (Promoted Listings)](https://www.ebay.com/help/selling/listings/listing-tips/promoted-listings?id=4164).

### 1.1 Fee and cost lines a sale typically produces

eBay names two main selling fees: an **insertion fee** when the listing is created, and a **final value fee** when the item sells ([Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822)).

**Insertion fee.** Every month a seller gets up to 250 **zero insertion fee listings** (more with an eBay Store). After the allowance: $0.35 per listing in most categories. Charged per listing and per extra category; charged again on each relist and on each Good 'Til Cancelled monthly renewal. Non-refundable if the item does not sell. Some categories differ (e.g. athletic sneakers with a $150+ start price are free to insert; some heavy-equipment categories are $20; guitars & basses are free). Classified Ads are $9.95 for 30 days and have no final value fee ([Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822); [Seller Center](https://www.ebay.com/sellercenter/selling/start-selling-on-ebay/seller-fees)).

**Final value fee.** One fee when the item sells. “You don’t have to worry about third-party payment processing fees.” Calculated as a percentage of the **total amount of the sale**, plus a **per order fee**: $0.30 if the order is $10.00 or less, $0.40 if over $10.00. An **order** is any number of items purchased by the same buyer at checkout with the same shipping method ([Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822)).

The **total amount of the sale** includes the item price, handling charges, shipping costs collected from the buyer (with listed exceptions), **sales tax**, and any other applicable fees. Shipping exceptions: if the listing offers 1-day or international *and* a cheaper domestic option, FVF on shipping uses the cheapest domestic option; eBay International Shipping uses the seller’s cost to the US hub (and no FVF on shipping if domestic shipping was free); Authenticity Guarantee sneakers with a free label: eBay collects a flat shipping charge from the buyer and charges no FVF on shipping ([Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822)).

**Basic (non-Store / Starter Store) rates, most consumer-goods categories** ([Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822); [Seller Center](https://www.ebay.com/sellercenter/selling/start-selling-on-ebay/seller-fees)):

| Category (eBay’s grouping) | Final value fee % + per order fee |
| --- | --- |
| Most categories, including Motors Parts & Accessories | 13.6% of total sale up to $7,500 per item, then 2.35% above $7,500 |
| Books & Magazines; Movies & TV (except Movie NFTs); Music (except vinyl and Music NFTs) | 15.3% up to $7,500, then 2.35% |
| Coins & Paper Money (except bullion); select collectibles / trading cards | 13.25% up to $7,500, then 2.35% |
| Women’s Bags & Handbags | 15% if sale ≤ $2,000; 9% if over $2,000 |
| Jewelry & Watches (except watches/parts) | 15% if sale ≤ $5,000; 9% if over $5,000 |
| Watches, Parts & Accessories | 15% to $1,000; 6.5% $1,000–$7,500; 3% over $7,500 |
| Athletic sneakers, start price $150+ | 8% if total sale ≥ $150 (no per-order fee); else 13.6% |
| Guitars & Basses | 6.7% up to $7,500, then 2.35% |
| NFTs (listed NFT categories) | 5% |

Store subscribers (Basic / Premium / Anchor / Enterprise, not Starter) pay lower percentages on many categories — e.g. most categories 12.7% up to $2,500 then 2.35%; cameras / cell phones / most consumer electronics 9.35% up to $2,500; computers and video-game consoles 7.35% up to $2,500 — plus a monthly Store subscription. Seller Center’s worked example prices a Basic Store at $21.95/month ([Seller Center](https://www.ebay.com/sellercenter/selling/start-selling-on-ebay/seller-fees)). Full Store tables live on [Store selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/store-selling-fees-managed-payments-sellers?id=4809).

**Payment processing.** Not a separate seller line on domestic managed-payments sales. It is inside the final value fee ([Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822)).

**Promoted Listings — general campaign strategy (ad fee).** Optional. Seller sets an **ad rate** between 2% and 100% of the item’s **total sale amount** (item price, shipping, taxes, other applicable fees), or uses a **dynamic ad rate**. Charged only if the promoted item sells within 30 days of a click on the ad. Shown in the Payments tab. Separate **priority** (CPC) and **Promoted Offsite** / **Promoted Stores** products exist ([General campaign strategy](https://www.ebay.com/help/selling/listings/listing-tips/promoted-listings?id=4164)).

**Optional listing upgrades.** Charged at listing time whether or not the item sells. Named upgrades include **Bold**, **Gallery Plus**, **Subtitle**, **List in two categories**, **Scheduled listing** (Classified Ad: $0.10), **International site visibility**, and **Reserve price**. Reserve: $5 or 7.5% of the reserve, whichever is greater, max $250. Dollar amounts for most upgrades are in price-band tables on the fee page (the fetched page did not render the dollar cells) ([Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822); [Seller Center](https://www.ebay.com/sellercenter/selling/start-selling-on-ebay/seller-fees)).

**International fee.** 1.65% of the total amount of the sale if the seller’s registered address is in the US, the sale is not on eBay International Shipping, and either the delivery address or the buyer’s registered address is outside the US. Deducted from sales. Waived when eBay International Shipping is used on an eligible listing ([Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822)).

**Additional final value fees (performance).** Below Standard (US evaluation on the 20th): extra 6% of FVF the following calendar month; 7% after four consecutive months. Service-metrics **Very High** “Item not as described” in a category: extra 5% of FVF on sales in that category the next month; 6% after four consecutive months. Only the Below Standard add-on applies if both trigger. Calculated on the total amount of the sale ([Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822)).

**Dispute fee.** $20.00, excluding sales tax, if the seller is found responsible for a disputed amount (e.g. chargeback) ([Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822)).

**Seller currency conversion charge.** If eBay converts funds (listing or selling on another site), US-registered sellers pay a 3% conversion charge on the base exchange rate ([Selling fees](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822)).

**eBay Labels (shipping label).** Seller-purchased USPS / FedEx / UPS / eBay standard envelope labels from Orders. Cost paid from **available funds** or the **on-file payment method**. Tracking uploads automatically. Unused labels can be canceled within 28 days; refunds can take up to 21 days. Optional extras: signature, additional liability coverage. eBay standard envelope labels cannot be canceled once printed ([Printing and canceling shipping labels](https://www.ebay.com/help/selling/shipping-items/labels-packaging-tips/buying-printing-shipping-labels?id=4157)). Buyer-charged **Shipping and handling** is a separate collected amount and is inside the FVF base when collected from the buyer.

**Sales tax collection vs remittance.** eBay calculates, collects, and remits sales tax for shipments into listed US marketplace-responsibility states and territories (the help page lists the jurisdictions and effective dates; Seller Center summarizes 46 jurisdictions as of 1 July 2021). Sellers cannot opt out. No extra fee for that collection. Tax is inside the **total amount of the sale** used for FVF. eBay may also collect tax *on selling fees* for sellers registered in Hawaii, South Dakota, Texas, and Washington (effective dates and which fees vary by state) ([Taxes and import charges](https://www.ebay.com/help/selling/fees-credits-invoices/taxes-import-charges?id=4121); [Tax Information | Seller Center](https://www.ebay.com/sellercenter/resources/tax-information)).

**Deposits / holds.** After payment confirmation, proceeds show as **Processing funds**, then typically **Available for payout** in 1–2 days unless held. Daily payouts initiate about 2 days after payment confirmation; weekly/biweekly/monthly schedules exist. **Express payouts** to a verified debit card or eligible bank: extra **$2.00** flat fee; typically within 30 minutes ([Getting paid](https://www.ebay.com/help/selling/getting-paid/getting-paid-items-youve-sold?id=4814)).

Hold types eBay names ([Transaction holds](https://www.ebay.com/help/selling/getting-paid/getting-paid-items-youve-sold/payments-hold?id=4816); [Getting paid](https://www.ebay.com/help/selling/getting-paid/getting-paid-items-youve-sold?id=4814)):

- **Transaction hold** — funds On hold until the transaction completes. Typical release: new private sellers, 2 days after delivery confirmation (eBay label), 7 days (third-party label), or 31 days after payment (no tracking), until they qualify (at least 10 completed issue-free sales totaling $150+ in 5 years, and no more than 2 open requests/cases/defects in 12 months). New business sellers: 24 hours after delivery confirmation on an eBay label, or 15 days after payment otherwise. Occasional sellers, post-restriction, unusual activity, volume spikes, high-priced items, and Authenticity Guarantee each have their own stated clocks.
- **Payout hold** — Available funds **Blocked** (registration, compliance, performance, invalid payment method, or tax-information / W-9).
- **Payment dispute hold** — until a buyer-bank dispute or case is resolved.

On-hold funds can still buy eBay shipping labels ([Transaction holds](https://www.ebay.com/help/selling/getting-paid/getting-paid-items-youve-sold/payments-hold?id=4816)).

**How fees are taken.** Insertion and upgrade fees at list time. Transaction fees (FVF, international fee) at sale, deducted from the buyer’s payment. If earnings cannot cover fees, eBay charges the on-file payment method within 14 days ([Seller Center FAQ](https://www.ebay.com/sellercenter/selling/start-selling-on-ebay/seller-fees); [How fees and selling costs are charged](https://www.ebay.com/help/selling/fees-credits-invoices/fees-selling-costs-charged?id=5297)).

### 1.2 Purchase-side costs eBay does not know

eBay never sees what the seller paid to acquire the item. The **Earnings** report’s **Your cost** field is “the per-unit cost of acquiring the item. It should not include any general business costs.” Adding it is optional; “eBay will never share this information with buyers” ([Earnings report](https://www.ebay.com/help/selling/fees-credits-invoices/reconciling-ebay-sales-transactions/earnings-report?id=5481)).

Still seller-owned: item cost / lot split, inbound shipping and travel to acquire, sales tax paid at purchase, supplies (boxes, tape, labels bought off-eBay), storage, and any shipping not bought with eBay funds. The Earnings report states that “Charges and credits for shipping labels purchased with methods other than eBay funds, such as PayPal, aren’t included in this report or taken into account as part of order earnings calculation.”

### 1.3 Exports and APIs a seller can pull

**Seller Hub — Manage orders CSV.** From Manage orders → **Download report** (or **More → Download selected**). Contains the Manage-orders table plus tax-collected fields. Documented columns that matter for P&L include: **Order Number**, **Item Number**, **Item Title**, **Custom Label**, **Sold Via Promoted Listings**, **Quantity**, **Sold For**, **Shipping And Handling**, **Seller Collected Tax**, **eBay Collected Tax**, recycling/disposal fee columns, **eBay Collected Charges**, **Total Price**, **eBay Collected Tax Included in Total**, **Sale Date** / **Paid On Date** / **Shipped On Date**, **Shipping Service**, **Tracking Number**, **Transaction ID**, **eBay Collect And Remit Tax Rate/Type**. File Exchange / Selling Manager column names were rearranged when this report replaced them ([Seller Hub](https://www.ebay.com/help/selling/selling-tools/seller-hub?id=4095)).

**Seller Hub Reports** (File Exchange successor). Source = Orders, Listings, or Marketing/Advertising. Types include All orders, Awaiting shipment, Promoted Listings listing reports. Date range 1–90 days. CSV/XLSX. Schedulable hourly/daily/weekly/monthly. Private sellers need at least one sale; business sellers are opted in. Legacy File Exchange templates/schedules do not carry over ([Seller Hub Reports](https://www.ebay.com/help/selling/selling-tools/seller-hub-reports?id=4096)).

**Merchant Integration Platform (MIP).** Optional bulk CSV/XML path for SKU / custom-label inventory; advertised for 50,000+ SKUs ([Seller Hub Reports](https://www.ebay.com/help/selling/selling-tools/seller-hub-reports?id=4096)).

**Payments → Transaction report (CSV).** Seller Hub Payments → Reports → Transaction report. Customizable columns under Transaction / Payout / Shipping / Item / Buyer details. Documented fields include **Order ID**, **Item ID**, **Payout ID**, **Reference ID**, **Transaction ID**, **Gross transaction amount**, **Net amount**, **Payout method/status**, **Reason for hold**, **Seller collected tax**, **Final value fee**, **Other fees** (subscriptions, listing upgrades, ad fees), **Shipping label**, **Claim**, **Payment dispute**, **Hold**, **Charge**, **Adjustment**, **Transaction currency**, **Exchange rate**. Multi-item orders: first row is order details, following rows are items. Timezone on the report may not match other records ([Reconciling sales transactions](https://www.ebay.com/help/selling/fees-credits-invoices/reconciling-ebay-sales-transactions?id=4847)).

**Earnings report (CSV).** Payments → Earnings → Generate CSV. Fields: **Order creation date**, **Order ID**, **Item subtotal**, **Shipping and handling**, **Seller collected tax**, **Discount**, **Gross amount** (does *not* include taxes or fees eBay collects from the buyer), **Expenses** (fees, fee credits, shipping labels paid with eBay funds, donations), **Refunds**, **Order earnings**, **Your cost** (seller-entered), **Net order earnings** ([Earnings report](https://www.ebay.com/help/selling/fees-credits-invoices/reconciling-ebay-sales-transactions/earnings-report?id=5481)).

**Other official downloads.** Monthly **financial statement** (PDF, 10 years). **Tax invoice** (PDF summary + CSV detail). **Credit note** CSV when fees/taxes reverse. **Form 1099-K** and **1099-K detailed report** ([Reconciling sales transactions](https://www.ebay.com/help/selling/fees-credits-invoices/reconciling-ebay-sales-transactions?id=4847)). Advertising **sales report** (clicks, sale amount, ad fees, attribution) ([General campaign strategy](https://www.ebay.com/help/selling/listings/listing-tips/promoted-listings?id=4164)).

**APIs (high level).** Membership in the [eBay Developers Program](https://developer.ebay.com/) is free. After approval, the seller creates an **application keyset** (App ID / Cert ID) for Sandbox and Production and uses **OAuth**. Calls that read a seller’s own financial or order data need a **User access token** (not an application token). Relevant Sell APIs, from eBay’s published API index: **Finances API** (`getTransactions`, `getPayouts` / `getPayout` / `getPayoutSummary`, `getOrderEarnings` / `getOrderEarningsById` / `getOrderEarningsSummary`, seller funds summary); **Fulfillment API** (orders); **Inventory API**; **Feed API**. `getTransactions` covers SALE, REFUND, CREDIT, DISPUTE, NON_SALE_CHARGE, SHIPPING_LABEL, TRANSFER. Higher call volume requires an Application Growth Check. This is a personal developer keyset plus user OAuth against the seller’s own account — not a paid partner-only program for read-only finances — though eBay can reject developer registrations and can require Growth Check for scale ([Developers Program](https://developer.ebay.com/); [Get started with eBay APIs](https://developer.ebay.com/develop/guides-v2/get-started-with-ebay-apis); [API call limits](https://developer.ebay.com/develop/get-started/api-call-limits); [OAuth credentials](https://developer.ebay.com/api-docs/static/oauth-credentials.html)). Direct fetches of some `developer.ebay.com` doc pages failed from this environment; method names above are from those official pages’ public listings.

### 1.4 What is *not* in those exports

- Purchase cost, inbound freight, acquisition tax, supplies, storage — unless the seller types **Your cost** into Earnings (and even then, only that one number).
- Shipping labels bought outside eBay funds (Earnings report).
- A single pre-split “payment processing” line (it is inside FVF).
- Listing-time insertion/upgrade fees as a per-order P&L line on the orders report (they appear as **Other fees** / **NON_SALE_CHARGE** on the transaction/finances side, often on a different date than the sale).
- SKU unless the seller populated **Custom Label**.
- Buyer-paid eBay-collected tax inside Earnings **Gross amount** (explicitly excluded).
- Date-range coverage beyond 90 days on Seller Hub Reports downloads (tax help still tells sellers to accumulate files themselves).
- Off-platform cash or goods-for-goods; cancelled/unpaid items that never became managed-payments transactions.

---

## 2. Mercari (US)

Primary sources: [Fees on Mercari](https://www.mercari.com/us/help_center/article/169/) (updated 7 May 2026), [How to access my Gross Sales Report](https://www.mercari.com/us/help_center/article/541/), [Sales Tax for Sellers](https://www.mercari.com/us/help_center/article/467/), [Getting paid: Direct Deposit, Instant Pay, and payout issues](https://www.mercari.com/us/help_center/article/6004/).

### 2.1 Fee and cost lines

**Listing** is free. Fees apply when an item sells or a named service is used ([Fees on Mercari](https://www.mercari.com/us/help_center/article/169/)).

**Selling fee** (seller-paid, effective 6 January 2025 on new and updated listings): **10% of the item price + buyer-paid shipping**. Listings created before that date were not charged the selling fee until automatically updated (within a week) or manually updated.

**Buyer Protection** (buyer-paid, same date): **3.6% of item price + buyer-paid shipping**. Not a seller line, but it is on the checkout total.

**Payment processing fee.** After 6 January 2025 on new/updated listings: **no separate payment processing fee**. Pre-change listings still showed a buyer-side **Payment Processing Fee** of $0.50 + 2.9% of transaction price (item + shipping + service fee + sales tax) until updated.

**Balance withdrawals.** **Direct Deposit**: $0 per successful cash-out (once per day; typically within 5 business days); **$2 non-refundable fee** for a failed/rejected deposit. **Instant Pay**: **$3** per cash-out; up to $600/month; once per day; typically minutes, up to 30 minutes; ID verification; Visa/Mastercard debit only.

**Shipping.** Mercari prepaid labels (USPS / FedEx / UPS, published 2026 rate tables on the fees page). Buyer-paid or seller-paid depending on the listing. Seller-paid shipping is deducted from proceeds as **Seller Shipping Fee**. Underweight / overweight / wrong-packaging overages: **Shipping Adjustment Fee** or a deduction of carrier fines (seller pays 100% of FedEx/USPS fines for wrong packaging or ineligible Media Mail). Packages over 100 lb / size limits: seller ships independently; over 150 lb a $2,500 flat freight rate is stated.

**Cancelation fee.** If the seller cancels frequently: **5% of the item price, $25 maximum**, after warnings; taken from balance or card on file within 30 days.

**Other named seller services.** **Mercari Authenticate**: $5 to list above a set amount. **Mercari Authenticate Certificate**: $10. Legal-request processing is billed to agencies, not sellers ($25/hour).

**Sales tax.** Mercari calculates, collects, reports, and remits applicable sales tax under its own registrations. Added to the buyer as a separate charge. No extra seller fee. Sellers cannot opt out. Separately stated Mercari-label shipping may be taxable depending on the state ([Sales Tax for Sellers](https://www.mercari.com/us/help_center/article/467/)).

**Holds.** After delivery the buyer has **72 hours** to review and rate. Funds hit **Balance** when the buyer rates, or when Mercari auto-rates. Payouts can also be held for bad bank info, transactional irregularities, account review, or prohibited items ([Getting paid](https://www.mercari.com/us/help_center/article/6004/)).

### 2.2 Purchase-side costs Mercari does not know

Quoted: “As a marketplace, we do not have the original cost of your sold items or other costs incurred to sell your item on Mercari.” Shipping costs, Mercari fees, and sales taxes for completed orders *are* in the Gross Sales Report ([Gross Sales Report](https://www.mercari.com/us/help_center/article/541/)).

### 2.3 Exports and APIs

**Gross Sales Report** on Mercari.com: customizable date range; sold, in-progress, and canceled orders. Official columns:

| Column | Official meaning |
| --- | --- |
| Item ID | Unique id; begins with `m` or `b` |
| Sold Date / Canceled Date / Completed Date | Purchase, cancel, or rating/auto-rate (when net proceeds hit balance) |
| Item Title | Headline |
| Order Status | Completed, Canceled, or In Progress |
| Shipped to State / Shipped from State | Delivery / origin |
| Item Price | Final selling price paid to the seller |
| Buyer Shipping Fee | Buyer-paid shipping, if any |
| Seller Shipping Fee | Seller-paid shipping, deducted on completion |
| Mercari Selling Fee | Commission deducted from item price on completion |
| Payment Processing Fee | Collection cost deducted from item price on completion (legacy / as applicable) |
| Shipping Adjustment Fee | Underweight-label extra, deducted on completion |
| Net Seller Proceeds | Net after seller shipping + selling + processing fees |
| Sales Tax Charged to Buyer | Buyer-paid tax remitted by Mercari |
| Merchant Fees Charged to Buyer | e.g. Zip / financing |
| Service Fee Charged to Buyer | Buyer service fee 27 Mar 2024 – 5 Jan 2025 |
| Buyer Protection Charged to Buyer | From 6 Jan 2025 |
| Payment Processing Fee Charged to Buyer | 27 Mar 2024 – 5 Jan 2025 |

Mercari does not publish a public seller API in its help center. No official developer program for personal sellers was found.

### 2.4 What is *not* in those exports

Original item cost and “other costs incurred to sell.” In-progress rows are estimates. SKU is not a listed column (only **Item ID** / title). Instant Pay / failed-ACH withdrawal fees are balance events, not Gross Sales Report sale columns. No machine API.

---

## 3. Facebook Marketplace (individual sellers, shipping + checkout)

Primary sources: [When you'll get paid…](https://www.facebook.com/help/620680138523186), [Get paid for selling with shipping](https://www.facebook.com/help/449101635835192), [Check your balance, payouts, or sales history](https://www.facebook.com/help/324864968758466), [About shipping costs](https://www.facebook.com/help/3487040438008467). Local-only sales are a different product: Meta’s shipping articles say they are about “items sold by individual sellers with shipping and checkout.”

### 3.1 Fee and cost lines

**Local pickup / off-platform payment.** These help pages do not charge a Marketplace selling fee. Taxes are not handled for local pickup ([Get paid](https://www.facebook.com/help/449101635835192)).

**Selling fee** (shipped checkout): **10% (or $0.80 minimum per order)**, deducted from the payout. Calculated on **total transaction value** = item sale price + shipping fees + applicable taxes. “The selling fee does not include any fees your payment provider may charge separately.” Promotional rates, if any, show in the payout breakdown ([When you'll get paid](https://www.facebook.com/help/620680138523186)).

**Shipping.** Seller chooses who pays when creating the listing. Shown cost is based on commercial rates; “Meta may negotiate lower rates with shipping partners and retain the savings.” If the seller pays shipping, that cost is deducted from the payout. Prepaid-label orders do not require a manual mark-as-shipped; own-label orders do, with a tracking number, within **7 calendar days** or the system cancels ([About shipping costs](https://www.facebook.com/help/3487040438008467); [Get paid](https://www.facebook.com/help/449101635835192)).

**Sales tax.** For shipping + checkout, “Facebook collects taxes at checkout” in **marketplace facilitator states** only. Not for local pickup. If sales reach a limit and the seller has not provided a tax identification number, **transfers to the bank are on hold** until it is entered ([Get paid](https://www.facebook.com/help/449101635835192)).

**Holds / payout timing.** Payout initiates **15 days after mark-as-shipped**, or **5 days after delivery confirmation**. After initiation, up to **5 more days** to the account. Worst case stated: up to **20 days** from mark-as-shipped to funds appearing ([When you'll get paid](https://www.facebook.com/help/620680138523186)).

### 3.2 Purchase-side costs Marketplace does not know

Same as every other marketplace: item cost, inbound shipping, acquisition tax, supplies, storage. Not mentioned in Meta’s seller-payout articles.

### 3.3 Exports and APIs

**Your payouts** in Marketplace: balance from shipping payments, next payout date, sales history, destination bank. Payments appear only after the order is marked shipped with tracking. Refunds deduct from balance. Official help describes on-screen history only — no CSV download and no public individual-seller API ([Check your balance…](https://www.facebook.com/help/324864968758466)). Meta Commerce / partner catalog APIs exist for shops; they are not documented on these individual-seller help pages as a flipper export path.

### 3.4 What is *not* in those exports

No official file. Even on screen, Meta does not document purchase cost, SKU, a fee split beyond the selling fee, or payment-provider fees. Local cash sales never enter **Your payouts**.

---

## 4. Poshmark (US)

Primary sources: [Fee Policy](https://poshmark.com/terms#fee-policy) (current text effective 25 November 2024, in [Terms](https://poshmark.com/terms)), [Seller Policy / Seller Fee Policy](https://poshmark.com/terms#seller-policy), [Shipping Policy](https://poshmark.com/terms#shipping-policy). Support articles [How to download a record of my sales](https://support.poshmark.com/s/article/110742876?language=en_US) and [What is on My Sales Report?](https://support.poshmark.com/s/article/ka0Un000000DOVxIAO) exist; the support host blocked full-page fetch here, so column detail is limited to those pages’ public snippets.

### 4.1 Fee and cost lines

**Listing** is always free ([Fee Policy](https://poshmark.com/terms#fee-policy)).

**Seller fee** (deducted from **final order price** after the item sells):

- Sales **under $15**: flat **$2.95**
- Sales **$15 and above**: **20%** (“you keep 80%”)

That is the current US structure after the 24 October 2024 revert (the short-lived split fee + Buyer Protection Fee was removed) ([Fee Policy](https://poshmark.com/terms#fee-policy); notice on [Terms](https://poshmark.com/terms)).

No separate payment-processing line is named in the current Fee Policy. Estimated earnings shown at list time can differ from actual earnings because of final order price, seller discounts, fees, and taxes ([Fee Policy](https://poshmark.com/terms#fee-policy)).

**Shipping.** Buyer pays shipping. Poshmark provides one prepaid **Label** / QR code per order for shipments **up to 5 lbs** (box + packing). **PoshPost** is described as a buyer-paid flat-rate program. Overweight: seller must buy an upgraded/additional label for **over 5 lbs up to 15 lbs**; 15 lbs is the maximum per order unless support makes an exception. Seller is responsible for carrier overage (size, actual weight, dimensional weight). Ship within **7 days** of purchase (active carrier scan) or the buyer can cancel ([Shipping Policy](https://poshmark.com/terms#shipping-policy); [Seller Policy](https://poshmark.com/terms#seller-policy)).

**Sales tax.** Poshmark collects from buyers “where legally obligated” and remits on behalf of sellers. List prices exclude tax; tax is shown before the buyer confirms. Seller remains responsible if Poshmark does not collect ([Terms §10.i](https://poshmark.com/terms)).

**Payouts / holds.** Earnings redeemable via **Direct Deposit, ACH, Instant Transfer, Paypal, and Venmo** (Seller Policy benefit list). Terms allow Poshmark to hold funds pending investigation, illegal-activity review, or legal compliance ([Terms §16.c](https://poshmark.com/terms)). Support documents Instant Transfer ([redeem via Instant Transfer](https://support.poshmark.com/s/article/redeem-your-earnings-via-Instant-Transfer?language=en_US)); this research did not successfully load that page’s fee table, so any Instant Transfer dollar fee is not stated here.

### 4.2 Purchase-side costs Poshmark does not know

Not in the Fee Policy or Sales Report description. Item cost, inbound shipping, acquisition tax, supplies, storage remain seller-owned.

### 4.3 Exports and APIs

**My Sales Report** (CSV emailed): Me → Seller Tools → Insights → Sales Report → date range → **Email Report**. Official snippet: “The **Net Earnings** column will show how much you received as redeemable earnings from the sale of the listing” ([What is on My Sales Report?](https://support.poshmark.com/s/article/ka0Un000000DOVxIAO); [How to download a record of my sales](https://support.poshmark.com/s/article/110742876?language=en_US)). Full official column list was not retrieved (support.poshmark.com blocked the fetch).

**Inventory Report** (CSV emailed) also exists ([How to download your Inventory Report](https://support.poshmark.com/s/article/How-to-download-My-Inventory-Report?language=en_US)). **Form 1099-K** via Account Settings → Tax Documents.

No public Poshmark seller API is published in the Terms or the support articles found.

### 4.4 What is *not* in those exports

Purchase cost and other acquisition/operating costs. Instant-transfer / PayPal / Venmo cash-out fees (if any) are redemption events, not documented Sales Report columns. No API. Full fee-line split (commission vs shipping upgrade vs tax) is not confirmed from an official column dictionary in this pass.

---

## 5. Craigslist (for-sale personal goods)

Primary source: [posting fees](https://www.craigslist.org/about/help/posting_fees).

### 5.1 Fee and cost lines

“**All craigslist postings are free, except for**” a short list. For a typical personal goods flip:

- Ordinary for-sale-by-owner posts: **$0**
- **Cars/trucks, RVs, and motorcycles by-owner in the US: $5**
- **All for sale by-dealer categories in the US: $5**
- Unrelated to flipping: jobs $10–75, some apartments $5, commercial real estate $5, gigs $3–10, services $5

There is **no sale commission**, no checkout, no payment processing, no marketplace shipping label, and no sales-tax collection. Payment and shipping are off-platform between the parties. [Paid posting accounts](https://www.craigslist.org/about/help/paid_posting_accounts) are a high-volume posting-payment convenience, not a sale ledger.

### 5.2–5.4 Purchase-side, exports, gaps

Craigslist never sees item cost, inbound shipping, tax, supplies, or storage — and also never sees sale price, fees, or payout. There is no official order CSV, tax report, or seller API. Every P&L field is manual (or comes from the seller’s own bank/cash records).

---

## 6. OfferUp (local-first)

Primary sources: [Terms of Service](https://offerup.com/terms) (last updated 21 July 2026), [What is OfferUp?](https://help.offerup.com/hc/en-us/articles/360031989092-What-is-OfferUp).

### 6.1 Fee and cost lines

**In-person transactions.** “OfferUp doesn’t charge fees or take a commission from your in-person transactions.” Cash/check/other agreed methods happen outside OfferUp; OfferUp is not a party and cannot assist with refunds ([What is OfferUp?](https://help.offerup.com/hc/en-us/articles/360031989092-What-is-OfferUp); [Terms §4.A](https://offerup.com/terms)).

**Posting fees.** “You can post most items through the Services without charge. OfferUp charges a fee to post some items, for example, if you exceed your available free posts for certain types of items in certain categories” ([Terms §4.A](https://offerup.com/terms)).

**Paid Services** OfferUp names: extra/certain **item posts**; **promote** a posted item more prominently; **enhanced account features**; **Job** or **services** posts; **OfferUp Premium** (ad-free + member benefits); monthly/yearly **Subscriptions** billed through Apple/Google. Prices are shown in-app before charge ([Terms §4.E](https://offerup.com/terms); [What is OfferUp?](https://help.offerup.com/hc/en-us/articles/360031989092-What-is-OfferUp)).

**Sales tax.** “You are responsible for any sales, use, duty, or other governmental taxes or fees due with respect to your purchase or sale through the Services. OfferUp will collect applicable sales tax if we determine that we have a duty to collect sales tax in a given state” ([Terms §4.D](https://offerup.com/terms)).

**Shipped checkout.** These official pages do **not** publish a current seller commission, payment-processing rate, or hold schedule for shipped OfferUp orders. Third-party blogs quote a 12.9% / $1.99-minimum service fee; that figure is **not** used here because it is not on help.offerup.com or offerup.com/terms as fetched.

### 6.2–6.4 Purchase-side, exports, gaps

Same purchase-side hole as Craigslist for local deals. Official help does not document a seller CSV, sales-history export, or public seller API. Local cash never produces a marketplace fee file.

---

## 7. Purchase-side costs no marketplace in this set knows

Stated or implied by every official tax/earnings page: the marketplace is the sale venue, not the acquisition ledger.

A flipper still has to track, themselves:

| Cost | Why the marketplace cannot supply it |
| --- | --- |
| Item / lot cost | Paid to a thrift store, auction, Facebook local buyer, another marketplace, etc. Mercari: “we do not have the original cost.” eBay **Your cost** is optional seller input. |
| Inbound shipping / travel to acquire | Happened before the listing existed. |
| Sales or use tax paid at acquisition | On the buy-side receipt, not the sell-side tax-collected column. |
| Supplies | Boxes, tape, poly mailers, printers, not purchased as an eBay/Mercari/Poshmark order line. |
| Storage | Rent, bins, climate control — never a marketplace order field. |
| Off-platform shipping | Own-account USPS/UPS/FedEx, or cash meetup gas. eBay Earnings excludes labels not bought with eBay funds. |
| Time | Not a monetary export field anywhere. |

Sale-side tax columns (**eBay Collected Tax**, Mercari **Sales Tax Charged to Buyer**, Poshmark-collected tax, Facebook checkout tax) are *buyer* tax the marketplace remitted. They are not the tax the flipper paid when buying the item, and they are not income-tax withholding.

---

## 8. Export comparison (P&L-relevant)

| | eBay | Mercari | Poshmark | Facebook Marketplace (shipped) | Craigslist / OfferUp local |
| --- | --- | --- | --- | --- | --- |
| Official sale CSV | Yes — orders, transactions, earnings, tax invoice | Yes — Gross Sales Report | Yes — Sales Report (email CSV); Inventory Report | Not documented | No |
| Sale price | **Sold For** / **Gross transaction amount** / **Item subtotal** | **Item Price** | Present (Net Earnings documented; full schema not fetched) | On-screen history only | — |
| Seller commission | **Final value fee**; **Other fees** | **Mercari Selling Fee** | Deducted into **Net Earnings** | **Selling fee** in payout breakdown | None |
| Shipping charged to buyer | **Shipping And Handling** | **Buyer Shipping Fee** | Buyer-paid PoshPost (not confirmed as its own CSV column) | In total transaction value | Off-platform |
| Seller shipping cost | **Shipping label** (if eBay funds) | **Seller Shipping Fee**, **Shipping Adjustment Fee** | Overweight label (seller-paid; not confirmed in CSV) | Deducted if seller-pay | Off-platform |
| Tax collected from buyer | **eBay Collected Tax** / **Seller Collected Tax** | **Sales Tax Charged to Buyer** | Collected at checkout (CSV column not confirmed) | Collected in facilitator states | None |
| Dates | Sale / paid / ship / payout / hold | Sold / canceled / completed | Date range on report | After mark-shipped | — |
| Item id / SKU | **Item Number**, **Custom Label** | **Item ID** (no SKU column) | Listing implied; schema not fetched | Not documented | — |
| API | Yes — free Developers Program + user OAuth (Finances, Fulfillment, …) | None found | None found | None for individual sellers | None |
| Auth | Personal keyset + user token; Growth Check for higher limits | Logged-in web | Logged-in app/web + email link | Facebook login | — |

---

## 9. Gaps that force manual entry even if imports come later

1. **Every purchase.** Cost, inbound shipping, tax on the buy, source, condition-as-bought.
2. **Supplies and storage.** Never a marketplace sale column.
3. **Local / Craigslist / OfferUp in-person sales.** No checkout file. Entire sale (price, cash vs app pay, meetup shipping) is manual.
4. **Facebook shipped sales.** Help documents UI history, not a file or API.
5. **SKU / lot identity.** Only where the seller already stored a custom label (eBay). Mercari’s id is theirs (`m`/`b`…), not the flipper’s SKU.
6. **Cash-out fees vs sale fees.** Mercari Instant Pay $3 / failed ACH $2, eBay express payout $2 — these attach to withdrawals, not always to the order row.
7. **Ads and insertion/upgrades timed differently from the sale.** eBay **Other fees** / **NON_SALE_CHARGE** and Promoted Listings 30-day attribution will not always sit on the same row/date as **Sold For**.
8. **Labels bought off-platform.** Missing from eBay Earnings; never present on Craigslist/OfferUp local.
9. **Returns, claims, disputes, cancelation fees.** Present on eBay transaction types and Mercari status/fee columns; still need seller judgment to attach to the original flip.
10. **What the marketplace remitted vs what the seller still owes.** Marketplace-facilitator sales tax is collected from the *buyer*. Income tax, and any sales tax on the seller’s own acquiring purchases, are outside every export above.

---

## Sources

- eBay Selling fees: https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822
- eBay Seller Center fees: https://www.ebay.com/sellercenter/selling/start-selling-on-ebay/seller-fees
- eBay Store selling fees: https://www.ebay.com/help/selling/fees-credits-invoices/store-selling-fees-managed-payments-sellers?id=4809
- eBay taxes and import charges: https://www.ebay.com/help/selling/fees-credits-invoices/taxes-import-charges?id=4121
- eBay Tax Information (Seller Center): https://www.ebay.com/sellercenter/resources/tax-information
- eBay getting paid: https://www.ebay.com/help/selling/getting-paid/getting-paid-items-youve-sold?id=4814
- eBay transaction holds: https://www.ebay.com/help/selling/getting-paid/getting-paid-items-youve-sold/payments-hold?id=4816
- eBay reconciling transactions: https://www.ebay.com/help/selling/fees-credits-invoices/reconciling-ebay-sales-transactions?id=4847
- eBay Earnings report: https://www.ebay.com/help/selling/fees-credits-invoices/reconciling-ebay-sales-transactions/earnings-report?id=5481
- eBay Seller Hub (orders report columns): https://www.ebay.com/help/selling/selling-tools/seller-hub?id=4095
- eBay Seller Hub Reports: https://www.ebay.com/help/selling/selling-tools/seller-hub-reports?id=4096
- eBay labels: https://www.ebay.com/help/selling/shipping-items/labels-packaging-tips/buying-printing-shipping-labels?id=4157
- eBay Promoted Listings general: https://www.ebay.com/help/selling/listings/listing-tips/promoted-listings?id=4164
- eBay Developers Program: https://developer.ebay.com/
- eBay get started with APIs: https://developer.ebay.com/develop/guides-v2/get-started-with-ebay-apis
- Mercari fees: https://www.mercari.com/us/help_center/article/169/
- Mercari Gross Sales Report: https://www.mercari.com/us/help_center/article/541/
- Mercari sales tax: https://www.mercari.com/us/help_center/article/467/
- Mercari getting paid: https://www.mercari.com/us/help_center/article/6004/
- Facebook payout timing and selling fee: https://www.facebook.com/help/620680138523186
- Facebook get paid / tax: https://www.facebook.com/help/449101635835192
- Facebook sales history: https://www.facebook.com/help/324864968758466
- Facebook shipping costs: https://www.facebook.com/help/3487040438008467
- Poshmark Terms / Fee Policy / Shipping Policy: https://poshmark.com/terms
- Poshmark Sales Report: https://support.poshmark.com/s/article/110742876?language=en_US and https://support.poshmark.com/s/article/ka0Un000000DOVxIAO
- Craigslist posting fees: https://www.craigslist.org/about/help/posting_fees
- OfferUp Terms: https://offerup.com/terms
- OfferUp “What is OfferUp?”: https://help.offerup.com/hc/en-us/articles/360031989092-What-is-OfferUp

Fetched August 2026. eBay `developer.ebay.com` article bodies and Poshmark Support article bodies were only partially available (error pages / blocked fetches); API method names and Poshmark Sales Report columns are limited to what those hosts still published in indexes and snippets.
