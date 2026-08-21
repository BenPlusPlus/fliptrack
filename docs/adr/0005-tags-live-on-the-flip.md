# Tags live on the Flip, live and flat

A Tag is a named label in one Books. Only a Flip has Tags; a Flip may have many, including none. The Operator creates a Tag by naming it. The set is flat — no tree, no privileged Category. The Flip's Tags are live and may change after Sale or Write-off. Re-split copies the parent's Tags onto each child; the sets are then independent. First-useful-version slices are Profit by Tag, Inventory by Tag as Acquisition cost, counts split unsold vs sold vs written-off, and the same three for untagged Flips. Slices overlap. Rename keeps the Tag; delete removes it from the Books and from every Flip that had it. No merge.

## Considered options

- **Tag the Acquisition, Listing, Sale, or cost lines** — marks the event or the fee, not the thing Profit attaches to. A kit Sale tagged "housewares" would roll up mixed Flips; channel would impersonate a Tag.
- **Raw strings on the Flip** — "shirt" / "shirts" / "Shirts" become three stats.
- **Pre-built vocabulary only** — a personal Books invents names at the aisle, not from a catalog.
- **A Tag tree** — "all clothing" roll-up without a second Tag, and a product for move/rename/merge of branches.
- **One Category plus optional Tags** — forces a single bucket; a Goodwill vintage shirt cannot be equally source / era / type.
- **Snapshot Tags on Sale** — Profit-by-Tag becomes history; fixing a mis-tag needs a second write.
- **Copy nothing on Re-split** — a 20-piece bag retypes `goodwill` twenty times.
- **Merge as an operation** — useful when names collide; retag-by-hand is enough on this map.

## Consequences

- Marketplace / channel is a Sale fact, not a Tag. Channel as a named Books object is [ADR-0010](0010-channel-is-a-named-sale-fact.md).
- A Flip with two Tags appears in both slices; summing Tag Profit is not all Profit.
- Unused Tags stay in the Books until deleted.
- Names are unique in the Books; `Shirts` and `shirts` are the same name.
- The Retired parent's Tags do not report. Tag-management screens are not designed here.

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [How do tags categorize and report?](https://github.com/BenPlusPlus/fliptrack/issues/9).
