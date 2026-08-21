# A Listing's Flip set is fixed

A Listing is an attempt to sell the Flips named at create. That set does not change: no add, no remove, while live, and a Sale of some of those Flips does not take the rest off it. To sell a different set, end the Listing and create a new one. Ending — Operator or last Inventory Flip sold — does not move Listing spend. Ended stays ended; an Undone Sale does not resurrect it.

## Considered options

- **Editable until freeze** — add/remove while no Flip on it has a standing Sale or Write-off. Invents currently-on vs ever-on, and lets a last-minute unbundle dodge a freeze.
- **Always editable** — late adds would steal from frozen shares or take $0 of spend that already froze.
- **Ending drops unsold Flips from spend, or parks spend for a later Listing** — would break “every Listing that included this Flip counts” ([ADR-0004](0004-profit-is-net-on-sale-date.md)).
- **A Sale removes sold Flips from the Listing** — membership would shrink by Sale even if the Operator cannot edit it.
- **Sold-out Listing stays live until the Operator ends it** — an attempt with nobody left to sell.
- **Derived liveness / resumable** — undo of the last Sale, or an Operator re-open, would make a live Listing whose set still names Flips the buyer kept.
- **Chosen: fixed set, end + new Listing to change it, ended sticks** — dual-listing is how a Flip is also on something else; relist is always a new Listing.

## Consequences

- Listing spend still splits across every Flip named at create, including those later sold or written off, and freezes once any of them has a standing Sale or Write-off ([ADR-0004](0004-profit-is-net-on-sale-date.md), [ADR-0006](0006-write-off-undo-hitch.md)).
- A live Listing still blocks Write-off and Re-split; end it first. Re-split children are not on the parent's Listing; they inherit that Listing's spend as a Retired ancestor.
- Undo unfreezes Listing spend only when no standing Sale or Write-off remains on that Listing ([ADR-0006](0006-write-off-undo-hitch.md)). That is spend, not liveness.

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [Can the Flip set of a live Listing change?](https://github.com/BenPlusPlus/fliptrack/issues/15).
