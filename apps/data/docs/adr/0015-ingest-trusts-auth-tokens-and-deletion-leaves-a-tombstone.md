# ADR 0015: Ingest trusts auth's tokens, and a deleted account leaves a tombstone

## Status

Accepted, 2026-11-28. Carries out step 6 of [ADR 0004](0004-separate-auth-service.md) (issue
#601). The auth side is `apps/auth` ADRs 0001 to 0003. This data Worker runs in the `platform`
mode those ADRs define.

## Context

`/data/ingest` and the old host's `/ingest` accepted one shared secret, `INGEST_BOOTSTRAP_KEY`,
which mapped to contributor `trajectonomics`, until #601's last pull request retired it (see
"Retiring the bootstrap key"). The auth Worker now issues access tokens for this audience:
15-minute EdDSA JWTs that `https://auth.trajectonomics.com/jwks` signs. It also queues account
deletions and posts each one to `https://data.internal/internal/contributors/delete` through its
`DATA` service binding, and that route answered 404 until this ADR shipped.

## Decision

### Verifying a token

- A pure verifier in `src/core/` takes the token, a JWKS and the current time as arguments, and
  wraps `jose` (pinned exactly, the version `apps/auth` pins). It accepts a token only when all of
  these hold:
  - the header `alg` is `EdDSA`, and no other algorithm;
  - `iss` equals the configured issuer exactly;
  - `aud` is a string or an array that contains `https://trajectonomics.com/data` (the access token
    also names auth's userinfo endpoint, so the whole array is never compared for equality);
  - the space-separated `scope` contains the required scope, which is `data:ingest` for ingest;
  - `exp` and `iat` are present and `nbf` is honoured, each with a 30-second skew, and `exp - iat`
    is at most one hour;
  - `sub` is a non-empty string of at most 255 characters.
- The JWKS is fetched over plain `fetch` from `<issuer>/jwks`, which works because the auth Worker
  runs on a Custom Domain in the same zone. The isolate keeps the set in memory for an hour. A token
  whose `kid` is not in the set triggers one refetch, at most once a minute per isolate, so a stream
  of made-up `kid`s cannot turn into a stream of subrequests. A fetch starts at most once a minute
  whatever asks for it, including a cold start, and a set fetched during the request is never
  refetched, so a `kid` missing from it is `401`. When the set cannot be fetched, the isolate keeps
  serving the last set it fetched for up to 24 hours, so a short auth outage does not stop ingest;
  past that, or with no set at all, ingest answers `503 auth_unavailable` rather than `401`, so a
  collector retries next hour instead of being told it has signed out.
- The issuer is the Worker variable `AUTH_ISSUER`, `https://auth.trajectonomics.com` in
  `wrangler.jsonc`.

### Who a token sends as

- The contributor comes from the token's `sub`, through `contributor.auth_user_id`, and never from
  the body. One D1 read answers three questions: which contributor holds this `sub`, whether the
  `sub` is tombstoned, and whether the org contributor is still unbound.
- The org contributor `trajectonomics` is bound once. The optional Worker secret
  `ORG_AUTH_USER_ID` names the owner's auth user id. The first verified ingest whose `sub` equals it
  while the org row's `auth_user_id` is NULL binds the row, inside the ingest's own `DB.batch`.
  After that the binding alone decides, and the secret no longer matters. An auth user id is not a
  credential, but it is a person's identifier, so it stays out of this public repository.
- A `sub` that no contributor holds gets `403 not_a_contributor`, and a tombstoned `sub` gets
  `403 account_deleted`. Community contributors are not created here. They arrive with the
  community work in [ADR 0013](0013-community-identity-and-plan-return.md).

### Deleting an account

- `POST /internal/contributors/delete` is routed only when the request's hostname is
  `data.internal`. That host has no DNS and is reachable only through a service binding. On every
  other host, `/internal/*` is `not_found`. The body is `{ "authUserId": string }`, 1 to 255
  characters, at most 1 KB.
- The Worker always writes a tombstone: the SHA-256 hex of the auth user id in
  `contributor_tombstone`, never the id itself. It then acts by the contributor's kind:
  - **community**: deletes the contributor's `usage_hourly`, `quota_sample` and `ingest_log` rows
    and the contributor row. No `measured-by-us` rollup changes, because the rollup reads org rows
    only.
  - **org**: unbinds the row (`auth_user_id = NULL`) and keeps the numbers. The org's series belongs
    to the organisation, not to the person who once signed its collector in, so deleting that
    person's account never wipes the published series.
- The tombstone, the deletes and the unbind share one `DB.batch`. The endpoint is idempotent and
  answers `200 {"deleted": true}` for an id it has never seen, so auth's queue acknowledges the
  notice and stops retrying.
- A tombstoned `sub` can never send or sign in again. That includes an access token issued before
  the deletion and still inside its 15 minutes.

### The collector signs in

- `collector login` runs the RFC 8628 device flow against the seeded `traj-data-collector` client
  with scope `openid offline_access data:ingest` and `resource=https://trajectonomics.com/data`.
  It keeps the refresh token in `~/.config/traj-data/credentials.json`: mode 600 in a mode-700
  directory, written atomically, and refused when group or others can read it. A headless collector
  host has no keychain, so the file is the only store.
- Each send refreshes once, saves the rotated refresh token before using the new access token, and
  sends every batch in that run with that one access token. An `invalid_grant` answer tells the
  person to run `login` again. Auth's limits still apply: 30 days sliding, 90 days absolute.

### Web sign-in

- `/data/auth/sign-in` starts the authorization code flow with PKCE (S256) for the seeded
  `traj-data-web` client, with scope `openid` only, so `traj-data` never receives an email or a
  name. State and verifier sit in a short-lived HttpOnly cookie on `/data/auth`. The callback
  exchanges the code, verifies the access token with the same verifier (with no scope requirement),
  and discards both tokens. It then creates its own session: a random id in an HttpOnly, Secure,
  SameSite=Lax cookie on `/data`, stored only as a hash in `web_session` with the auth user id and
  an 8-hour expiry. Deletion also removes that user's sessions.
- A deleted user's `sub` never starts a session: the insert writes nothing while
  `contributor_tombstone` holds its hash, and the callback answers `?signin=failed`.
- The cookies keep their `/data` paths and no `__Host-` prefix, which would need `Path=/`. The
  accepted cost: a hostile host under `trajectonomics.com` could plant a `Domain=` cookie that
  shadows ours, and so show a person someone else's collector list or sign them in as another user.
  Every subdomain is ours, and the only view is read-only.
- The token request uses `redirect: "manual"`, and any 3xx fails the sign-in. workerd refuses
  `"error"`, and `"manual"` has the same effect, because the request never follows a redirect.
- `/data/me/` lists "my collectors": each machine label the signed-in contributor has sent from,
  with its first and last UTC day, its row count and its last send. `GET /data/api/me/collectors`
  answers `Cache-Control: private, no-store` and never enters rollups or any public read.

### Retiring the bootstrap key

The key path stayed only until our own collector sent with a token. #601's last pull request
removed `authorizeIngest`'s key branch, `Env.INGEST_BOOTSTRAP_KEY`, the collector's `--key-file`
fallback and the `ingest.key` file, and the secret is deleted after that deploy
(`bunx wrangler secret delete INGEST_BOOTSTRAP_KEY --name data`). A bearer that is not auth's JWT is
now `401 unauthorized`. The old host's `/ingest` and `/api/*` still answer (root AGENTS.md rule 11);
only the credential changed.

## Consequences

- Ingest is one read plus one batch, two D1 queries per request, well inside the Free plan's 50.
- The owner signs the collector in once every 90 days at most. A lapse fails that runner's hourly
  unit; the existing "no ingest for 3 hours" health warning fires only once every runner stops.
- A leak of `traj-data` exposes auth user ids on contributor rows and on sessions, but never an
  email, and never the id of a deleted account.
- Rejected alternatives:
  - **Trust on first use for the org:** the first stranger to sign up and send would own the org's
    series.
  - **Deleting the org series with the owner's account:** one account action would erase a public
    dataset that others cite.
  - **Storing the tombstone as the raw id:** the hash answers "was this deleted?" without keeping
    the identifier of a person who asked to be forgotten.
