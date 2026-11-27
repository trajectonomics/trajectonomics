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

`src/oauth/hooks.ts` installs a `hooks.before` on `/device/code`, `/oauth2/authorize` and
`/oauth2/token`. It reads every `resource` value from every source that can hold one: the query
string, the raw body and `ctx.body`. The raw body's media type is compared exactly up to its first
`;`, so a JSON body sent as
`application/json; x=application/x-www-form-urlencoded` is still parsed as JSON and its array
cannot hide from the form parser. `mergeResourceSources` counts a value seen through several
parsers of the same request once, and keeps a value repeated inside one source or two sources that
disagree. The pure rules in `src/core/resource-request.ts` then decide:

- more than one value, repeated or as a JSON array, is rejected with `invalid_target`;
- a refresh whose requested resource is not in the stored grant is rejected with `invalid_target`,
  including a grant that had no resource and now asks for one.

The hook runs before the provider's own subset check, so a grant with no resource cannot gain one.
A normal refresh that asks for nothing keeps the grant's resources. The token endpoint also gets
the multi-value rule, so a client cannot use the token request as a side door.

The same hook normalizes `grant_type` with the library's `trim` before every comparison, and
rejects a value that differs from its trim with `invalid_request`. 1.7.28 trims the field while
validating it, so `refresh_token%20` used to reach the provider as `refresh_token` while the raw
hook comparison missed it and skipped the lifetime and widening rules. The pure decision is in
`src/core/grant-type.ts`.

### 2. Rate limiting in D1

`rateLimit` is enabled explicitly with `storage: "database"`, so the counter lives in D1 and every
isolate shares it. `advanced.ipAddress.ipAddressHeaders` is `["cf-connecting-ip"]`, which Cloudflare
sets at the edge. Custom rules are stricter than or equal to the default for `/oauth2/token`
(20/min, the provider's own default; device polling at the advertised five-second interval is
12/min, so it fits), `/device/code` (10/min), `/device` (5/min), `/device/approve` (10/min),
`/device/deny` (5/min), `/sign-in` and `/sign-in/*` (5/min), `/sign-up/*` (5/min) and `/passkey/*`
(10/min). A looser token rule would replace the provider's 20/min rather than add to it.

The `rateLimit` table is `migrations/0002_rate_limit.sql`, generated with
`bun run schema -- --out migrations/0002_rate_limit.sql --only rateLimit`. `0001_init.sql` is
history and is not rewritten.

### 3. Revocable grants with an absolute lifetime

A grant's approval record is its `oauthConsent` row. A device approval creates or updates one in an
after-hook on `/device/approve`. The after-hook finds the code with the library's own lookup order:
the typed value first, then the stripped, upper-cased form, so approving `abcd-efgh` records the
consent for `ABCDEFGH`. The token exchange never creates a consent: if the after-hook failed, the
next refresh fails closed instead of reviving a code that was approved before a revocation. The
authorization-code flow creates its consent on `/oauth2/consent`. The consent's `createdAt` is the
original approval and is never moved by rotation.

A refresh is rejected with `invalid_grant` when `consent.createdAt + 90 days <= now`, or when no
consent exists. Failing closed is deliberate: without an approval record the platform cannot prove
the grant is inside its lifetime. `refreshTokenExpiresIn` stays at thirty days, so a refresh token
still rotates every thirty days; the absolute check stops the chain at ninety.

Re-approving a client after the ninety days is a new grant, not an extension: when the existing
consent is expired, the approval deletes the old consent, then its token family, then creates a
fresh consent with a new `createdAt`. `createdAt` is never moved without deleting the tokens. The
authorize before-hook does the same for the authorization-code flow before the provider can update
the expired row, and the consent before-hook removes a leftover token family before the provider
creates a new consent. The refresh error says `approve the client again`.

Whenever a consent is newly created, any leftover access and refresh tokens for that user and
client are deleted first, so an old token can never attach to the new approval.

`src/oauth-grants.ts` adds two session-scoped endpoints:

- `GET /oauth2/grants` lists the signed-in user's consents with the client id and name, the
  approval time, the scopes and the resources;
- `POST /oauth2/grants/revoke` takes `{ id }`, verifies the consent belongs to the session user,
  and deletes the grant in this order: the consent, the user+client access and refresh tokens, the
  pending `deviceCode` rows, and the pending authorization codes.

Authorization codes are not a table of their own in 1.7.28: each lives in `verification` under the
hashed code, with the user id and `query.client_id` in its JSON value. The revoke scans that table
for the grant's user and client and deletes the matches, so a code issued before the revoke cannot
be exchanged afterwards. The consent is deleted first to narrow the concurrent-rotation window: a
rotation that slips through lands on a grant with no approval record and fails closed next time.

The provider's `/oauth2/delete-consent` is in `disabledPaths`. It deletes the consent but leaves
the tokens alive, and a later approval would revive them. `/oauth2/grants/revoke` is the only
revocation path. A JWT access token already issued stays valid for at most its fifteen minutes
after a revoke; that is by design, and resource servers rely on the short lifetime rather than an
introspection call per request.

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

`0003` is history once committed. The generator refuses to overwrite an existing file, and
`src/core/clients-migration.test.ts` fails `bun run check` when the committed file and the
generator's output drift. A later manifest change therefore ships as a **new numbered migration**
with explicit `update`/`insert` statements for the changed rows, never by regenerating `0003`.

A new first-party client is a manifest change plus a new migration, never a runtime call.

### Test clock

The absolute-lifetime check needs a clock past ninety days. The hook honors an `x-spike-now` header
only when the dev sign-in gate is open: `ENVIRONMENT=development`, `DEV_ONLY=true` and a loopback
`BETTER_AUTH_URL`. The committed `wrangler.jsonc` sets `ENVIRONMENT=production`, and
`auth.trajectonomics.com` is not loopback, so a production deployment can satisfy none of the
three. The spike sends the header on one refresh and asserts `invalid_grant`.

## Consequences

- Every token is issued for one audience; a resource server checks its own URI is in `aud` and
  checks the scope.
- A grant can be listed and revoked, and its refresh token fails immediately after revocation. A
  JWT access token already issued can remain valid for up to fifteen minutes; that is by design.
- A grant cannot be extended past ninety days by rotation. Re-approving a valid grant keeps its
  `createdAt` and its token family; re-approving an expired grant deletes the old family and starts
  a fresh ninety-day grant.
- The first-party client set is fixed by a migration. Adding one is a code change and a new
  numbered migration, not an HTTP call.
- The spike (`bun run spike`) proves all of the above against `wrangler dev --local`; its report
  lists each check by name.

## References

- [ADR 0001](0001-better-auth-platform-with-two-server-modes.md)
- [`../spike-refresh-tokens.md`](../spike-refresh-tokens.md)
- Issue #600, comment "Gates for the service slice".
