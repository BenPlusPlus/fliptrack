# Email and password, first-run wizard, setup-secret break-glass

An Operator signs in with email and password. Sign-up starts closed, so the first Operator is created by a first-run wizard gated by a setup secret in Railway env — not by seeding the password, and not by an ungated first-signup race on a public URL. That Operator is the instance admin. Remix 3 first-party credentials auth covers this; OAuth, magic link, and passkeys were rejected because they add a vendor or fail in a thrift aisle.

## Considered options

- **OAuth (Google / GitHub)** — Remix 3 ships providers. Needs a developer app and a redirect in the aisle.
- **Magic link** — needs a mail vendor and a working inbox in the store.
- **Passkey** — recovery is painful for a one-person instance; Remix 3 has no first-party path.
- **Username instead of email** — no handle for later reset-by-mail; two identifiers for one Operator.
- **Seed email and password at deploy** — puts the standing password in Railway env; no wizard for other first-run fields later.
- **First sign-up is admin, then the door closes** — a public form during the window between deploy and you.
- **Loopback-only wizard** — fights Railway; the production process is not on localhost.
- **Chosen: email + password, wizard gated by setup secret** — the secret is not the password. First run creates the first Operator. While the secret remains set, the same wizard is break-glass: it sets a new standing password on the existing instance-admin Operator, and does not create a second Operator.

## Consequences

- Cookie session until logout, on the order of 30 days. No “remember me” box. One Railway process, so a cookie session is enough ([ADR-0007](0007-railway-postgres-pitr.md)).
- Instance admin may set a temporary password on any Operator’s login and must not impersonate or mutate that Operator’s Books ([ADR-0002](0002-hosted-operators-isolated-books.md)). The temp password is handed over out of band (no mail). That Operator must choose a new standing password before anything else.
- Passwords chosen in the first-run or break-glass wizard are standing. Forced change applies only after an instance-admin reset of someone else.
- Delete the setup secret from env to remove the break-glass lever.
- No mail vendor on this map. The login handle does not change after create; a later map that has mail can add a verified change. Granting instance admin to another Operator is not decided here.

Glossary: [`CONTEXT.md`](../../CONTEXT.md).
Decision tickets: [How does an Operator sign in?](https://github.com/BenPlusPlus/fliptrack/issues/14), [Can an Operator change their email?](https://github.com/BenPlusPlus/fliptrack/issues/17).
