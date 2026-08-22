# P&L is home; three calendar Profit windows are the date range

After login, home is P&L: Profit for This Week, This Month, and This Year, plus current Inventory as Acquisition cost. Those three presets are v1's date range on Profit — no custom from–to. Tag slices follow the selected window (default This Month). One home on phone and desk; New Acquisition is the persistent primary action (full-screen on the phone). There is no Sale, Write-off, or Acquisition index. The first-run / break-glass wizard lives at `/oobe`; login redirects there only when no Operator exists.

## Considered options

- **Inventory as home** — the pick-a-Flip job, but not the "what did I make this month?" landing the Operator asked for.
- **A thin launchpad distinct from P&L** — a fourth surface that is mostly shortcuts.
- **A widget zoo** — recent Flips, live Listings, charts. Richer stats; out of scope.
- **A custom from–to on top of the three presets** — a reporting product. The presets are the range.
- **Phone lands on Acquisition** — two homes; faster in the aisle, splits the IA.

## Consequences

- "Today" is the browser's local date; the week starts on that locale's first day. No Books timezone field.
- Instance-admin functions are their own Admin view, not a corner of Account.
- Find-a-Flip is Inventory (name filter, optional Tags-has-all filter), not Home.

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [What is the screen and information architecture?](https://github.com/BenPlusPlus/fliptrack/issues/19).
