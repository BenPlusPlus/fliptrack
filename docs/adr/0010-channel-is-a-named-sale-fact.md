# Channel is a named Sale fact

A Sale happened somewhere — eBay, a garage sale, a friend. That somewhere is a Channel: a named label in one Books, exactly one per Sale, created by naming it. It is not a Tag (Tags live on the Flip; a kit Sale would smear "eBay" across mixed Flips). It is not on the Listing (that is where you tried; Profit cares where it sold). Names are unique in the Books and case-insensitive, like Tags.

## Considered options

- **Free text on the Sale** — "ebay" / "eBay" / "Ebay" fragment later per-Channel reports.
- **A closed list** — garage sale and "friend" are real Channels; a catalog cannot name them.
- **A Tag on the Flips** — already rejected in [ADR-0005](0005-tags-live-on-the-flip.md): channel would impersonate a Tag.
- **Channel on the Listing** — dual-listing is two Listings; failed attempts would carry a Channel Profit never uses. v1 types where it sold, not where it was tried.
- **Chosen: named Channel in the Books, one per Sale** — clean names for later reports; v1 types it and does not slice by it.

## Consequences

- v1 does not report by Channel. The field exists so a later map can.
- No Channel on Listing, Acquisition, or Write-off. Write-off destination is a Tag if you care.
- Rename and delete wait on screens and persistence. Create-by-naming is the v1 fact.

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [What belongs in the first useful version?](https://github.com/BenPlusPlus/fliptrack/issues/10).
