# Instance admin stays on the first Operator

The first-run wizard stamps instance admin on the first Operator. That capability does not grant, transfer, or revoke on this map. Transfer and share are a staff role; lockout recovery is already the setup secret. A later map that turns the sign-up door into a product can add grant.

## Considered options

- **Transfer** — exactly one instance admin; the current holder moves it onto another Operator and cannot drop it into nobody. A handover UI for a one-person instance.
- **Share** — grant to other Operators, then revoke (including of themselves) and a last-admin rule so the setup secret is not the only remaining lever. A staff role.
- **Chosen: locked** — the first Operator is the only instance admin. Always-at-least-one is automatic. Break-glass stays pointed at that one Operator ([ADR-0008](0008-email-password-first-run-wizard.md)).

## Consequences

- Sign-up still creates an Operator without the capability ([ADR-0002](0002-hosted-operators-isolated-books.md)).
- No grant or revoke surface in v1.
- Instance-admin surfaces that already ship (sign-up toggle, inspector, temp password) stay on that one Operator ([ADR-0011](0011-v1-is-the-decided-domain-typed.md)).

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision ticket: [Can instance admin be granted to another Operator?](https://github.com/BenPlusPlus/fliptrack/issues/18).
