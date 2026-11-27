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

A grant's approval record is its `oauthConsent` row. A device approval creates or updates one in a
**before**-hook on `/device/approve`, after confirming the code is pending, unexpired, claimed by
the signed-in user or not claimed at all, and that it names a scope. The before-hook finds the code
with the library's own lookup order: the typed value first, then the stripped, upper-cased form, so
approving `abcd-efgh` records the consent for `ABCDEFGH`. Recording it before the endpoint flips
the code to `approved` is what closes the race: no poll can redeem an approved code before its
consent exists. The token exchange never creates a consent: an approved code left unredeemed
after a revoke fails closed. The authorization-code flow creates its consent on `/oauth2/consent`.
The consent's `createdAt` is the original approval and is never moved by rotation.

The before-hook and the endpoint must not disagree about the outcome. A signed-in user who does
not own the code is refused in the before-hook with `403 access_denied`, rather than skipped: a
skipped hook that still recorded a consent would approve a grant for a code the person cannot
approve. A code nobody has claimed yet is not refused there: the endpoint answers its own 400
"not claimed", and the after-hook takes that consent back.

The before-hook remembers what its write changed: a row it created, with the `updatedAt` it
stamped, or the previous scopes and resources of the row it merged into. An **after**-hook on
`/device/approve` takes that write back only when the endpoint failed. It first reads the
endpoint's answer from the hook context (`context.returned`). Anything but an `Error` (an
`APIError` is one) is a success, and the write is kept without reading the code: the device may
have polled and redeemed it already, which deletes the row, and undoing then would leave a live
token for a grant that is not listed. After an error, the final device-code status decides. When it
is `approved` and its user is the approving user, the write is kept, so a refused second submit of
an already-approved code undoes nothing. Otherwise the after-hook runs one conditional statement: a
delete of the created row, or an update restoring the merged row's previous scopes and resources
with a new `updatedAt`, each filtered by the `updatedAt` its write stamped. Zero changed rows means
someone else owns the row now and it is left alone; the read-then-write this replaced could always
be raced.

Only the request whose own insert created the surviving row may record a row to delete. Two
concurrent approvals can both find no consent; both insert, and the second one's re-read merges the
two rows. That request records nothing to undo, because the row it would delete is the approval the
other request just made.

A merge is conditional too: it updates the row only while it carries the `updatedAt` the merge was
computed from, and deletes duplicate rows only after that update changed a row. Otherwise another
request's undo, a revoke or another approval got there first, and the whole record step runs again
from a fresh read, then inserts or merges. It does the same when the row it inserted is gone and no
row holds its scopes and resources. After three passes it deletes its own insert, if nothing has
changed that row, and fails the request with `500 server_error`, so an approval never succeeds
without its consent. The write it records, `created` or `merged`, is the one that happened on the
last pass.

Every write this Worker makes to a consent row's `updatedAt` stamps `max(now, previous + 1 ms)`,
where `previous` is the latest `updatedAt` it read. An insert also moves past every expired row it
replaced, a merge past the row it merged into, and a restore past the `updatedAt` the failed write
had stamped. Two of these writes in one millisecond therefore never share a stamp, and the first
request's undo, still filtered by the exact `updatedAt` its write stored, cannot match the row the
second write now owns. The library's own `/oauth2/consent` endpoint is the one exception: it writes
a whole-second `updatedAt` through the adapter, so a stamp it writes is outside this rule. The
restored `updatedAt` is a fresh stamp, not the value from before the merge: `updatedAt` is the undo
guard, not part of the grant's state.

Undoing a merge restores the keeper's previous scopes and resources; the duplicate rows the merge
deleted stay deleted. The undo can therefore only remove grants, never add one.

An endpoint that throws something other than an `APIError` skips the after-hook entirely, and its
consent is then left without an approval. It grants nothing: no token is issued without an
`approved` code, so a poll for that code fails. A revoke, or the next approval of the client,
cleans the row up. Nothing else is built for that case.

A before-hook that runs after ours and throws skips the after-hook in the same way. The provider's
own hook does this for a body carrying `oauth_query` whose signature fails, and it would leave a
consent, or a widened one, that the person never approved. Our before-hook therefore refuses any
`/device/approve` body with a field besides `userCode` before it writes anything; the first-party
page sends only `userCode`.

A revoke concurrent with an approval still has a window that no hook can close. It covers three
in-flight requests: a device poll that read an approved `deviceCode` row before the revoke, a code
exchange already running, and an authorize that writes its code after the revoke's delete. Each can
leave at most one access token, which lives fifteen minutes and whose refresh fails because no
consent remains.

Two parked approvals on one grant that both fail, undone oldest first, can leave a single consent
behind: the older undo finds a row the newer one has bumped, and the newer one restores the older
one's write. The consent is listed, grants nothing new by itself and is removed by a revoke. Nothing
is built for that case.

One user may approve the same client from several machines. The consent is keyed by user and
client, and 1.7.28 has no unique constraint on that pair, so the hooks merge instead of relying
on the database: the oldest row is kept so `createdAt` never moves forward, the scopes and
resources become the union of every approval, and any duplicate row is deleted. A second approval
therefore cannot narrow the first, and a revoke can never leave a second row behind.

A refresh is rejected with `invalid_grant` when `consent.createdAt + 90 days <= now`, or when no
consent exists. Failing closed is deliberate: without an approval record the platform cannot prove
the grant is inside its lifetime. `refreshTokenExpiresIn` stays at thirty days, so a refresh token
still rotates every thirty days; the absolute check stops the chain at ninety.

Re-approving a client after the ninety days is a new grant, not an extension: when the existing
consent is expired, the approval deletes the old consent, then its token family, then creates a
fresh consent with a new `createdAt`. `createdAt` is never moved without deleting the tokens. The
authorize before-hook expires the signed-in user's own consent before the provider can update the
expired row, on a GET to `/oauth2/authorize`, the internal re-dispatch after sign-in and
`/oauth2/continue`; the consent before-hook removes a leftover token family before the provider
creates a new consent. The refresh error says `approve the client again`.

The authorize-time expiry reads only the signed-in user's consent for the request's `client_id`.
An anonymous authorize request expires nothing: a client-wide scan would delete other people's
grants, and the operator cannot see who the request belongs to until they sign in. The provider's
auto-consent path compares scopes and resources but not the approval age, so deleting the expired
row is what makes every code-issuing path fail closed into the consent page.

A request that finds no live consent deletes the old token family before it writes its own. It
reads the consents first; only when that read finds no live consent does it snapshot the ids of that
user's and that client's access and refresh tokens, in one statement, and then read the consents
again. A live consent in the second read is another approval that landed in between: that approval
owns the family, so this request merges into it and deletes no token. Otherwise it deletes exactly
the snapshotted ids, in one D1 batch of two statements, each an `in (select value from json_each(?1))`
over one bound JSON array, access tokens first because `oauthAccessToken.refreshId` references the
refresh row. The ids, not a timestamp, are the boundary: the library stores a token's `createdAt` in
whole seconds, so a token minted later in the second a read lands in carries an earlier `createdAt`
than that read, and a filter on the read's clock would delete a live token. Any token the snapshot
did not list survives, and a family of thousands of rotated rows costs the same statements as a family
of one: no scan, no chunk, a constant well inside D1's fifty-query cap for one invocation.

An in-flight rotation of the old refresh token is the one way a token of the previous grant can still
attach to a new approval: a refresh whose checks passed a moment before a revoke, or in the narrow
window around the ninety-day expiry, can insert its rotated row just after the snapshot, and that row
then survives and is checked against the new consent. The window is one rotation wide, and the next
re-approval deletes the row.

`src/oauth-grants.ts` adds two session-scoped endpoints:

- `GET /oauth2/grants` lists the signed-in user's consents with the client id and name, the
  approval time, the scopes and the resources;
- `POST /oauth2/grants/revoke` takes `{ id }`, verifies the consent belongs to the session user,
  and deletes, in one D1 batch, every consent row for that user and client, the pending `deviceCode`
  rows, the user+client access and refresh tokens, and the pending authorization codes.

Authorization codes are not a table of their own in 1.7.28: each lives in `verification` under the
hashed code, with the user id and `query.client_id` in its JSON value. The revoke deletes the
grant's codes with **one** D1 statement (a prepared `delete` filtered with `json_valid` and
`json_extract` on `$.type`, `$.userId` and `$.query.client_id`), so the query count does not grow
with the table. Anonymous requests (passkey options, social sign-in state) fill `verification`, so
a scan would cost one query per hundred rows, would hit D1's per-invocation query budget on a
large table, and would skip a row whenever a concurrent delete shrinks the table between pages.
The same statement serves consent preparation and expiry. Any other paged read, such as the
consent list, steps on `id > lastId` for the same reason, never on an offset.

All five deletes run in one `database.batch`, which D1 executes as a single transaction. A failure
therefore deletes nothing: the reply is a 500, the consent stays listed, and a retry finds the
grant again and finishes it. The earlier loop tried every step and returned a 500 at the end, so a
step that failed after the consents were gone left a grant that was listed nowhere and could not
be revoked, while a pending device code or authorization code could still mint tokens. Nothing
outside the batch may delete the consent first: that is what made the partial failure visible as a
404 on every retry.

POST `/oauth2/authorize` is rejected with `invalid_request`: no first-party client posts the
authorization request, and the library parses a POST body before the before-hook runs, so a
repeated `resource` in that body collapses to its last value and the one-resource gate cannot
count it. The same rule must not fire on the provider's internal re-dispatch of authorize after a
sign-in, where the real request is the sign-in and the authorization parameters live in the query;
the hook tells the two apart by the request's pathname. `/device/code` rejects any `Content-Type`
whose media type merely contains `application/x-www-form-urlencoded`: the library form-parses such
a body while the hook reads it as JSON, and the two disagree about the resources it names. A body
the hook cannot read fails closed rather than counting as no resource. `/oauth2/authorize` also
refuses OIDC's `claims` request parameter with any value; the decision and its discovery caveat are
in [ADR 0003](0003-pages-consent-and-deletion.md).

The provider's `/oauth2/delete-consent` is in `disabledPaths`. It deletes the consent but leaves
the tokens alive, and a later approval would revive them. `/oauth2/grants/revoke` is the only
revocation path. `/oauth2/update-consent` is disabled too: it updates the consent's scopes behind
the hooks, so a signed-in user could raise them and the next authorize would issue a code without
the consent page for scopes they never approved. A JWT access token already issued stays valid for
at most its fifteen minutes after a revoke; that is by design, and resource servers rely on the
short lifetime rather than an introspection call per request.

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

### Test clock and approval hold

The absolute-lifetime check needs a clock past ninety days. The hook honors an `x-spike-now` header
only when the dev sign-in gate is open: `ENVIRONMENT=development`, `DEV_ONLY=true` and a loopback
`BETTER_AUTH_URL`. The committed `wrangler.jsonc` sets `ENVIRONMENT=production`, and
`auth.trajectonomics.com` is not loopback, so a production deployment can satisfy none of the
three. The spike sends the header on one refresh and asserts `invalid_grant`.

The same gate opens one more spike affordance: an `x-spike-hold` header on one `/device/approve`
request. With the value `1`, the before-hook records the consent and then polls the code it is about
to approve until another request moves it off `pending`. That is what makes the double-submit race
deterministic: the first request is parked after writing its consent, the second approves the code,
and the first endpoint then refuses it. With the value `after`, the after-hook parks before it
settles until the code's row is gone, so the spike can redeem the code of a successful approval
first. Neither header is read unless the gate is open, so a production deployment cannot use either.

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
