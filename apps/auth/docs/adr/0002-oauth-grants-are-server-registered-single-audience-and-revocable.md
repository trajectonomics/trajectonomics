# ADR 0002: OAuth grants are server-registered, single-audience and revocable

## Status

Accepted, 2026-11-27. It closes the five gates in #600 that block the first deploy of the `auth`
Worker. ADR 0001 keeps the platform decision; this ADR records the security mechanics.

## Context

Better Auth 1.7.28 gives the OAuth provider a token model that is almost, but not quite, what the
platform needs:

- RFC 8707 allows several `resource` values in one request, and 1.7.28 puts all of them into one
  token's `aud`. The platform wants one audience per token.
- A refresh token rotates, but each rotation issues a new token whose `createdAt` is now. The
  library's `refreshTokenExpiresIn` is therefore a sliding window, not an absolute lifetime.
- A refresh with no `resource` on the original grant can add one later. The library only rejects a
  refresh whose requested resources are not a subset of a non-empty grant.
- Deleting an OAuth consent does not revoke the refresh tokens issued from it.
- Rate limiting is off unless `NODE_ENV` is `production`, which a Worker never sets. Its memory
  store is per isolate.
- Production closes `clientPrivileges`, so the first-party clients cannot be created over HTTP.

The spike ([`../spike-refresh-tokens.md`](../spike-refresh-tokens.md)) exercises every decision
below against `wrangler dev --local`.

## Decisions

### 1. One audience per token

`src/oauth-hooks.ts` installs a `hooks.before` on `/device/code`, `/oauth2/authorize` and
`/oauth2/token`. It reads every raw `resource` value, including repeated form fields and a JSON
array, and calls the pure rules in `src/core/resource-request.ts`:

- more than one value is rejected with `invalid_target`;
- a refresh whose requested resource is not in the stored grant is rejected with `invalid_target`,
  including a grant that had no resource and now asks for one.

The hook runs before the provider's own subset check, so a grant with no resource cannot gain one.
A normal refresh that asks for nothing keeps the grant's resources. The token endpoint also gets
the multi-value rule, so a client cannot use the token request as a side door.

### 2. Rate limiting in D1

`rateLimit` is enabled explicitly with `storage: "database"`, so the counter lives in D1 and every
isolate shares it. `advanced.ipAddress.ipAddressHeaders` is `["cf-connecting-ip"]`, which Cloudflare
sets at the edge. Custom rules are stricter than the default for `/oauth2/token` (60/min),
`/device/code` (10/min), `/device` (5/min), `/device/approve` (10/min), `/sign-in` and
`/sign-in/*` (5/min), `/sign-up/*` (5/min) and `/passkey/*` (10/min).

The `rateLimit` table is `migrations/0002_rate_limit.sql`, generated with
`bun run schema -- --out migrations/0002_rate_limit.sql --only rateLimit`. `0001_init.sql` is
history and is not rewritten.

### 3. Revocable grants with an absolute lifetime

A grant's approval record is its `oauthConsent` row. The authorization-code flow already creates
one. A device approval creates or updates one in an after-hook on `/device/approve`, and the device
token exchange repeats the idempotent creation in case the after-hook failed. The consent's
`createdAt` is the original approval and is never moved by rotation.

A refresh is rejected with `invalid_grant` when `consent.createdAt + 90 days <= now`, or when no
consent exists. Failing closed is deliberate: without an approval record the platform cannot prove
the grant is inside its lifetime. `refreshTokenExpiresIn` stays at thirty days, so a refresh token
still rotates every thirty days; the absolute check stops the chain at ninety.

`src/oauth-grants.ts` adds two session-scoped endpoints:

- `GET /oauth2/grants` lists the signed-in user's consents with the client id and name, the
  approval time, the scopes and the resources;
- `POST /oauth2/grants/revoke` takes `{ id }`, verifies the consent belongs to the session user,
  deletes the user's access and refresh tokens for that client, then deletes the consent.

The provider's `delete-consent` cannot be used alone because it leaves the refresh tokens alive.
Revoking a grant therefore deletes the whole user+client token family, which is the same family
1.7.28 uses for replay detection. A user with two devices on the same client has one grant, and
revoking it signs both out.

`refreshTokenReuseInterval` is **60 seconds**. A lost refresh response can be retried inside the
minute and receives the same token response; outside it, reusing a rotated token is treated as
replay and the family is revoked. This keeps the existing replay defence while removing the
"one lost response forces a new login" failure.

### 4. Scopes per resource

Each `oauthResource` row carries `allowedScopes`:

| Resource | Allowed scopes |
|---|---|
| `https://trajectonomics.com/data` | `openid`, `profile`, `email`, `offline_access`, `data:ingest` |
| `https://relay.trajectonomics.com` | `openid`, `profile`, `email`, `offline_access` |

`data:ingest` therefore cannot be issued for the relay. The data audience is the data site's real
home (`https://trajectonomics.com/data`, data ADR 0006); the relay stays
`https://relay.trajectonomics.com`.

### 5. Server-side client registration

`src/core/clients.ts` is the manifest:

| Client | Type | Grants | Scopes | Resource |
|---|---|---|---|---|
| `traj-data-collector` | public native | device code, `refresh_token` | `openid`, `offline_access`, `data:ingest` | data |
| `traj-data-web` | public web, PKCE | authorization code | `openid`, `profile`, `email` | data |

`bun run clients:sql` turns the manifest and `src/core/resources.ts` into
`migrations/0003_oauth_clients.sql`. The migration inserts both resource rows first, then the
clients, then one `oauthClientResource` link per client, so foreign keys hold. It is safe to write
as SQL because both clients are public (`clientSecret` is null) and the string-array columns use
the same JSON text the SQLite adapter writes. Better Auth reads the rows through `getClient`; there
is no HTTP admin endpoint. `clientPrivileges` is `() => false` and `enforcePerClientResources` is
`true`, in production and in the spike.

A new first-party client is a manifest change plus a regenerated migration, never a runtime call.

### Test clock

The absolute-lifetime check needs a clock past ninety days. The hook honors an `x-spike-now` header
only when the dev sign-in gate is open: `ENVIRONMENT=development`, `DEV_ONLY=true` and a loopback
`BETTER_AUTH_URL`. The committed `wrangler.jsonc` sets `ENVIRONMENT=production`, and
`auth.trajectonomics.com` is not loopback, so a production deployment can satisfy none of the
three. The spike sends the header on one refresh and asserts `invalid_grant`.

## Consequences

- Every token is issued for one audience; a resource server checks its own URI is in `aud` and
  checks the scope.
- A grant can be listed and revoked, and its refresh token fails immediately after revocation.
- A grant cannot be extended past ninety days by rotation. Re-approving the same client does not
  reset the consent's `createdAt`; revoking and authorizing again does.
- The first-party client set is fixed by a migration. Adding one is a code change and a migration,
  not an HTTP call.
- The spike (`bun run spike`) proves all of the above against `wrangler dev --local`; its report
  lists each check by name.

## References

- [ADR 0001](0001-better-auth-platform-with-two-server-modes.md)
- [`../spike-refresh-tokens.md`](../spike-refresh-tokens.md)
- Issue #600, comment "Gates for the service slice".
