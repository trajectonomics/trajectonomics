# ADR 0004: Auth is a separate service; the ingest bootstrap key is temporary

## Status

Accepted as the design, 2026-11-25. The service ships in a later slice. The ingest path moved to
`/data/ingest` ([ADR 0006](0006-the-data-site-is-served-under-the-sites-host.md)); the old host
keeps `/ingest`.

**2026-11-27:** the owner decisions on #600 define every self-hosted server's two auth modes,
`platform` and `none`, plus audience-bound tokens and Google, GitHub and passkey sign-in. The auth
package records them in
[ADR 0001](../../../auth/docs/adr/0001-better-auth-platform-with-two-server-modes.md); this ADR's
`/jwks` and separate-service decisions stand, and the `data:ingest` key fallback is not needed
because the spike issued refresh tokens through the device flow.

**2026-11-28:** [ADR 0015](0015-ingest-trusts-auth-tokens-and-deletion-leaves-a-tombstone.md)
replaced the bootstrap key with auth access tokens and retired it: the key is history, not a
current option.

## Context

People will sign in to contribute their own usage, and the collector and future clients need
tokens. Putting account tables and token issuance in `data` would mix people with numbers and make
every client trust a different issuer. The architecture update of 2026-11-25 names a separate
service for this.

## Decision

- `auth.trajectonomics.com` is the only token issuer. It is a Worker named `auth` with D1
  `traj-auth`, built on one pinned stable version of Better Auth: Google sign-in, device
  authorization for CLIs, JWT/JWKS, and an OAuth 2.1 provider. Public keys are at `/jwks`.
- `traj-auth` holds people: `user`, `account`, `session`, OAuth clients and tokens, `device_code`,
  `jwks`, and the marketing consent record. `traj-data` holds numbers and the auth user id only:
  never an email or a name.
- In slice 2a, `POST /ingest` accepts one temporary bootstrap key, a Worker secret named
  `INGEST_BOOTSTRAP_KEY`. A match maps to contributor `trajectonomics`; the contributor is taken
  from the key, never from the body.
- Step 6 of the build order replaces the bootstrap key with auth tokens checked against `/jwks` (or
  a scoped `data:ingest` key over a service binding if the device flow cannot issue refresh tokens
  on Workers), and deletes the secret.
- Account deletion in `auth` calls `data` over a service binding to delete that contributor's raw
  rows and recompute the affected rollups.

## Consequences

- The pilot has no account UI and no sign-in; one key, held by the owner, writes the org's rows.
- No account data enters `traj-data`, so the pilot database stays a numbers store and a leak there
  cannot expose an email.
- The ingest auth check is one adapter boundary: when tokens arrive, `authorizeIngest` changes and
  the validation and write layers do not.
- A monthly rotation of the bootstrap key is unnecessary for the pilot because only one host uses
  it and step 6 removes it; if the pilot outlives step 6, rotate it by hand.
