# Spike: refresh tokens through the device flow, and Ed25519 JWTs under `wrangler dev`

Status: answered, 2026-11-27. This is step 1 of #600. The service is in
[ADR 0001](adr/0001-better-auth-platform-with-two-server-modes.md); the five security gates are in
[ADR 0002](adr/0002-oauth-grants-are-server-registered-single-audience-and-revocable.md).

## The answers

| Question | Answer | Evidence |
|---|---|---|
| Can one pinned stable Better Auth issue a refresh token through RFC 8628 device authorization on Workers + D1 under `wrangler dev`? | **YES** | The seeded `traj-data-collector` client received a `refresh_token` from `/api/auth/oauth2/token`; the refresh grant returned a new access token and a rotated refresh token. |
| Can it sign an Ed25519 (EdDSA) JWT, publish the key at `/jwks`, and can a separate `jose` verifier check it against that JWKS with an `aud` check? | **YES** | `/jwks` returned one `OKP`/`Ed25519`/`EdDSA` key; `jwtVerify` with `issuer`, `audience` and `algorithms: ["EdDSA"]` passed; the relay audience and RS256 were both rejected. |
| Do the five deploy gates hold? | **YES** | Every check in the `checks` block below is `true`: one audience, refresh widening rejected, `data:ingest` unavailable for the relay, user-code guesses get a 429, a revoked grant fails, a grant past its absolute lifetime fails, and the seeded collector completes the flow with `clientPrivileges` closed. |

## Pinned version

**Better Auth 1.7.28**, exact. On 2026-11-27 the registry had
`latest: 1.7.28`, `beta: 1.8.0-beta.11`, `canary: 1.0.0-canary.14` and
`rc: 1.7.0-rc.6`. 1.7.28 is the newest non-beta, non-canary, non-RC release. The companion packages
`@better-auth/oauth-provider` and `@better-auth/passkey` are pinned to 1.7.28 as well.
`jose` is pinned to 6.2.18.

## What was exercised

The harness boots `wrangler dev --local` with a scratch D1 database, applies every migration
(`0001_init.sql`, `0002_rate_limit.sql`, `0003_oauth_clients.sql`), and then:

1. creates a synthetic test user through the dev-only email + password endpoint;
2. requests a device code from the **seeded** `traj-data-collector` client with
   `resource=https://trajectonomics.com/data` and the `openid offline_access data:ingest` scopes;
3. polls once before approval and receives `authorization_pending`, the RFC 8628 waiting answer;
4. signs in as the test user, claims the code at `GET /api/auth/device`, and approves it at
   `POST /api/auth/device/approve`, then waits the advertised five-second polling interval;
5. polls `POST /api/auth/oauth2/token` with `grant_type=urn:ietf:params:oauth:grant-type:device_code`;
6. uses the refresh token at the same endpoint with `grant_type=refresh_token`;
7. fetches `/jwks` and verifies the access JWT with `jose` against it, including `aud` and `iss`;
8. runs the gate checks below.

No client is created over HTTP. The two clients and their resource links are seeded by
`migrations/0003_oauth_clients.sql`, `clientPrivileges` is `() => false`, and
`enforcePerClientResources` is `true`. The client the spike drives is the same one production
ships.

This is the OAuth provider's device grant, not the standalone `deviceAuthorization()` plugin. The
standalone plugin's `/device/token` mints a Better Auth **session token**: no refresh token, no
`aud`, no JWT. The pair that gives RFC 8628 a first-class OAuth token set is `oauthProvider()` +
`oauthDeviceAuthorization()`, both from `@better-auth/oauth-provider` at 1.7.28.

## The five gates

`bun run spike` also drives the gate checks. Every one is `true` in the JSON report:

| Check | What it proves |
|---|---|
| `deviceRequestWithTwoResourcesRejected` | A `/device/code` request with two `resource` parameters returns `400 invalid_target`. |
| `tokenRequestWithTwoResourcesRejected` | The token endpoint applies the same one-audience rule. |
| `refreshWideningFromDataRejected` | A data grant cannot refresh into a relay token. |
| `refreshWideningFromNoneRejected` | A grant approved with no resource cannot gain one on refresh. |
| `dataIngestNotIssuedForRelay` | `data:ingest` for the relay audience is rejected. The collector is linked only to data, so 1.7.28 answers `invalid_target` before the scope intersection; the resource allowlist itself is unit-tested in `src/core/resources.test.ts`. |
| `userCodeGuessesRateLimited` | Rapid `/device` guesses return `429` from the D1-backed limiter. |
| `grantListedAndRevoked` | `GET /oauth2/grants` lists the seeded collector's consent and the revoke endpoint deletes it. |
| `revokedGrantRefreshFails` | The refresh token from the revoked grant fails immediately with `invalid_grant`. |
| `refreshPastAbsoluteLifetimeFails` | A refresh with the `x-spike-now` test clock 91 days ahead fails with `invalid_grant`. The header is honored only when the dev sign-in gate is open; production cannot satisfy its three conditions. |
| `seededCollectorCompletesDeviceFlow` | The seeded `traj-data-collector` completes the device flow with `clientPrivileges` closed and per-client resource enforcement on. |

The absolute-lifetime check uses a test clock rather than a short production setting: the hook
reads `x-spike-now` only when `ENVIRONMENT=development`, `DEV_ONLY=true` and `BETTER_AUTH_URL` is
loopback. The committed `wrangler.jsonc` sets `ENVIRONMENT=production`, and
`auth.trajectonomics.com` is not loopback, so a production deploy cannot move the clock.

## Question 1: yes, with two conditions

The device code response (codes and the local port redacted):

```json
{
	"device_code": "<redacted>",
	"user_code": "<redacted>",
	"verification_uri": "http://127.0.0.1:<port>/api/auth/device",
	"verification_uri_complete": "http://127.0.0.1:<port>/api/auth/device?user_code=<redacted>",
	"expires_in": 1800,
	"interval": 5
}
```

The device token response (values redacted; field names and types are exact):

```json
{
	"access_token": "<redacted compact JWS, alg EdDSA>",
	"refresh_token": "<redacted opaque refresh token>",
	"id_token": "<redacted compact JWS>",
	"token_type": "Bearer",
	"expires_in": 900,
	"expires_at": 1795000000,
	"scope": "openid offline_access data:ingest"
}
```

The refresh response has the same seven fields, a new `access_token`, and a **rotated**
`refresh_token` (different from the device-flow one). Access tokens last 900 seconds; a refresh
token's own lifetime is 2,592,000 seconds (30 days). A grant has an **absolute** lifetime of
7,776,000 seconds (90 days) from its `oauthConsent.createdAt`; the before-hook enforces it, so
rotation cannot extend it (ADR 0002, gate 3).

Two conditions are required, and missing either one silently removes the refresh token:

- the client must be allowed the `refresh_token` grant, and
- the requested scope must include `offline_access`.

With `grant_types: ["urn:ietf:params:oauth:grant-type:device_code"]` and no `refresh_token` grant,
the token response had no `refresh_token` field even though the scope still said `offline_access`.
That was the only failure in the first run; adding the grant fixed it.

## Question 2: yes

`GET /jwks` (the Worker rewrites the public alias to `/api/auth/jwks`) returned:

```json
{
	"keys": [
		{
			"kty": "OKP",
			"crv": "Ed25519",
			"alg": "EdDSA",
			"kid": "<redacted>",
			"x": "<redacted public key>"
		}
	]
}
```

The access JWT's meaningful claims (no user identifier copied):

```json
{
	"iss": "http://127.0.0.1:<port>",
	"aud": [
		"https://trajectonomics.com/data",
		"http://127.0.0.1:<port>/api/auth/oauth2/userinfo"
	],
	"sub": "<redacted>",
	"scope": "openid offline_access data:ingest",
	"iat": 1794999100,
	"exp": 1795000000,
	"jti": "<redacted>"
}
```

`jose.jwtVerify(token, createLocalJWKSet(jwks), { issuer, audience: "https://trajectonomics.com/data", algorithms: ["EdDSA"] })`
passed. The same call with `audience: "https://relay.trajectonomics.com"` failed with
`unexpected "aud" claim value`, and `algorithms: ["RS256"]` failed. A resource server must therefore
accept an audience **array that contains** its own URI; the userinfo endpoint is a second audience
on OIDC access tokens. Do not compare the whole `aud` array for equality.

The issuer in production is `https://auth.trajectonomics.com` because `BETTER_AUTH_URL` is that
value. The local run above used `http://127.0.0.1:<port>`.

## Gate checks

The report's `checks` block from a passing run (`bun run spike`, exit 0):

```json
{
	"pendingPollReportsAuthorizationPending": true,
	"deviceCodeHasRefreshToken": true,
	"refreshGrantRotatesRefreshToken": true,
	"accessTokenExpiresInFifteenMinutes": true,
	"accessTokenIsEdDsaJwt": true,
	"accessTokenAudienceIsDataServer": true,
	"seededCollectorCompletesDeviceFlow": true,
	"jwksPublishesEd25519": true,
	"jwtVerifiesAgainstJwks": true,
	"wrongAudienceRejected": true,
	"wrongAlgorithmRejected": true,
	"multiResourceDeviceRequestRejected": true,
	"multiResourceTokenRequestRejected": true,
	"dataIngestNotIssuedForRelay": true,
	"refreshWideningFromDataRejected": true,
	"refreshWideningFromNoneRejected": true,
	"revokedGrantRefreshFails": true,
	"grantListedAndRevoked": true,
	"refreshPastAbsoluteLifetimeFails": true,
	"userCodeGuessesRateLimited": true,
	"paddedGrantTypeRejected": true,
	"revokeBeforeRedemptionHolds": true,
	"dashedUserCodeCreatesConsent": true,
	"deleteConsentPathDisabled": true,
	"oldTokenNotRevivedByNewApproval": true,
	"expiredDeviceCodePollCreatesNoConsent": true,
	"smuggledJsonResourceArrayRejected": true,
	"reapprovalAfterExpiryWorks": true,
	"revokeKillsPendingAuthCode": true,
	"revokeHoldsWithManyVerificationRows": true,
	"revokeHoldsUnderConcurrentVerificationDeletes": true,
	"revokeIsFastWithManyRows": true,
	"updateConsentPathDisabled": true,
	"deviceCodeContentTypeSmugglingRejected": true,
	"postAuthorizeRejected": true,
	"expiredConsentNeverIssuesCode": true,
	"deviceConsentExistsBeforeRedeem": true,
	"revokeRemovesDuplicateConsents": true,
	"emptyScopeDeviceRequestRejected": true,
	"consentScopesAreUnion": true,
	"failedDoubleApproveKeepsConsent": true,
	"failedApprovalUndoesConsent": true,
	"redeemedBeforeSettlementKeepsConsent": true,
	"revokeRetryAfterPartialFailure": true
}
```

How each gate is exercised:

- **One audience per token.** A device-code request with two `resource` values and a refresh with
  two `resource` values both answer `400 invalid_target`. A refresh that adds the relay resource to
  a data grant answers `invalid_target`; a grant approved with no resource that asks for data on
  refresh also answers `invalid_target`.
- **Rate limiting.** Ten rapid `GET /api/auth/device?user_code=...` guesses from one
  `cf-connecting-ip` hit the custom 5-per-minute rule and one answers `429`. The counter is the D1
  `rateLimit` table from `0002_rate_limit.sql`.
- **Revocation.** `GET /api/auth/oauth2/grants` lists the collector's consent;
  `POST /api/auth/oauth2/grants/revoke` deletes it and the user's tokens for that client; the next
  refresh answers `400 invalid_grant`.
- **Absolute lifetime.** One refresh sends `x-spike-now` 91 days ahead. The hook reads that header
  only when the dev sign-in gate is open, so production cannot move the clock; the refresh answers
  `400 invalid_grant`.
- **Scopes per resource.** A device-code request for the relay with `scope=data:ingest` is rejected
  (`invalid_target`, because the collector is linked only to data). The resource allowlist itself is
  unit-tested: the relay's `allowedScopes` does not contain `data:ingest`.
- **Server-side client.** The whole flow uses the seeded `traj-data-collector`; no
  `/oauth2/create-client` call is made, and `clientPrivileges` is closed.

## Security-review round

The independent reviews of #799 and #814 reproduced each hole below against
`wrangler dev --local`; every case is now a `true` check:

| Check | What it drives |
|---|---|
| `paddedGrantTypeRejected` | `refresh_token%20` and `%09refresh_token`, for both the 90-day lifetime rule and the widening rule, answer `400 invalid_request` instead of skipping the hook. |
| `revokeBeforeRedemptionHolds` | Approve a device code, revoke the grant, then poll: the deleted device code yields no token set and no consent is recreated. |
| `dashedUserCodeCreatesConsent` | Approving `abcd-efgh` (lower-case, dashed) finds the code with the library's normalized lookup and records the consent. |
| `deleteConsentPathDisabled` | `POST /oauth2/delete-consent` answers `404`; revoke is the only path. |
| `oldTokenNotRevivedByNewApproval` | With the old consent deleted out of band, a fresh approval deletes the leftover token family; the old refresh token answers `invalid_grant`. |
| `expiredDeviceCodePollCreatesNoConsent` | Polling an expired approved code answers `expired_token` and leaves zero consents. |
| `smuggledJsonResourceArrayRejected` | A JSON body sent as `application/json; x=application/x-www-form-urlencoded`, alone and beside a query resource, is rejected with `invalid_target`. |
| `reapprovalAfterExpiryWorks` | An expired device grant re-approves into a working first refresh, and an expired web consent is recreated with a fresh `createdAt`. |
| `revokeKillsPendingAuthCode` | An authorization code issued before a revoke cannot be exchanged afterwards (`invalid_grant`). |
| `revokeHoldsWithManyVerificationRows` | A pending code and an approved device code past Better Auth's 100-row `findMany` page still die with the grant. |
| `revokeHoldsUnderConcurrentVerificationDeletes` | The library's expired-row purge runs while the revoke reads the same table; the pending code is still dead afterwards. |
| `revokeIsFastWithManyRows` | 40,000 inert `verification` rows do not turn the revoke into a paged scan: it stays under one second. |
| `updateConsentPathDisabled` | `POST /oauth2/update-consent` answers `404`, so no request can raise a consent's scopes behind the hooks. |
| `deviceCodeContentTypeSmugglingRejected` | A `/device/code` body whose media type merely contains the form type is rejected. |
| `postAuthorizeRejected` | `POST /oauth2/authorize` answers `400 invalid_request`. |
| `expiredConsentNeverIssuesCode` | An expired consent cannot issue an authorization code on any path. |
| `deviceConsentExistsBeforeRedeem` | A trigger refuses to mark a code `approved` unless its consent row already exists. |
| `revokeRemovesDuplicateConsents` | A revoke deletes every consent row for the user and client, not only the id it was given. |
| `emptyScopeDeviceRequestRejected` | `/device/code` with no scope answers `400 invalid_request`. |
| `consentScopesAreUnion` | Two approvals of one client keep one row carrying the union of both scope sets. |
| `failedDoubleApproveKeepsConsent` | Request A writes the consent and parks; B approves the same code (200); A then answers 400 but keeps the consent, so the poll mints tokens, the grant stays listed and the first refresh works. |
| `failedApprovalUndoesConsent` | A code is denied while its approve is parked, so the approve answers 400: a new consent is gone, and a merged one has its previous scopes, resources and timestamps byte for byte. |
| `redeemedBeforeSettlementKeepsConsent` | The approve is parked in the after-hook while the device redeems the code, for a new grant and for a scope merge: it answers 200, the grant stays listed with every scope and refresh answers 200. |
| `revokeRetryAfterPartialFailure` | A trigger aborts one delete in the batch, so the revoke answers 500 and the grant stays listed; after the trigger is dropped the retry answers 200, and the pending code and the device poll both fail. |

## Plugins on Workers

| Plugin | Package | Result |
|---|---|---|
| Google social provider | built in | Configured when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` exist. Worker boots and the route is registered; no real OAuth round trip (no credentials yet). |
| GitHub social provider | built in | Same as Google, with `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. |
| Passkeys | `@better-auth/passkey` 1.7.28 | Worker boots and the passkey schema is created. No WebAuthn ceremony was run; that needs a browser or an authenticator. |
| OAuth 2.1 / OIDC provider | `@better-auth/oauth-provider` 1.7.28 | Worked: seeded client, device grant, scoped/audience-bound JWT access tokens, refresh rotation, ID token. |
| Device authorization | `oauthDeviceAuthorization()` from the same package | Worked as the RFC 8628 front half: `/device/code`, `/device`, `/device/approve`, then the OAuth token endpoint. |
| JWT / JWKS | `jwt` from `better-auth/plugins` | Worked: EdDSA/Ed25519 key in D1, `/jwks`, `iss`/`aud`/`exp` claims. |
| Grant management | `src/oauth-grants.ts` (local plugin) | Worked: list and revoke the seeded collector's consent; the refresh token fails immediately. |
| Standalone `deviceAuthorization()` | `better-auth/plugins/device-authorization` | Not used. It issues a session token, not a refreshable OAuth token set; installing it instead of `oauthDeviceAuthorization()` would fail the design. |

`nodejs_compat` is required: Better Auth imports `node:async_hooks` and `node:crypto`; D1 is the
native `database: env.DB` adapter in 1.7.28, not Kysely wired by hand. `wrangler dev --local`
applied the generated migrations and served every request above.

## Reproduce

```sh
cd apps/auth
bun install
bun run spike            # random free port; SPIKE_PORT=8787 bun run spike to pin one
bun run schema -- --out migrations/0002_rate_limit.sql --only rateLimit
bun run clients:sql      # writes 0003 once; refuses to overwrite, later changes are new migrations
bun run check            # Biome, tsc, unit tests, wrangler deploy --dry-run
```

`bun run spike` creates a scratch directory under `~/.cache`, applies the migrations to a local D1,
starts `wrangler dev --local`, runs the flow and the gate checks, prints the redacted report, and
removes the directory. It exits non-zero if any check is false, and it never prints a token or a
user identifier.

## Caveats and follow-ups for the service slice

- **Resource seeding.** `resourceSeedScope: "process"` is Better Auth's recommended stopgap when the
  instance is rebuilt per request on Workers; it is documented as temporary. The migration seeds
  the same rows, and `resourceSeedMode` stays at the safe `insertOnly` default.
- **Device consent.** Better Auth's device grant creates no consent row, so the Worker creates one
  at approval (and idempotently at token exchange). A grant is one consent per user and client; a
  second device on the same client shares it, and revoking it signs both out. This matches the
  provider's own user+client refresh family.
- **Dev sign-in.** The test user exists only when `ENVIRONMENT=development`, `DEV_ONLY=true` and
  `BETTER_AUTH_URL` is loopback. The committed `wrangler.jsonc` sets `ENVIRONMENT=production`, and
  `auth.trajectonomics.com` is not loopback, so neither a production deploy nor a leaked secret can
  enable email + password.
- **ID token.** The device grant returns an `id_token` even though the CLI only needs the access and
  refresh tokens. Ignore it in the CLI rather than relying on it.
- **`use` on the JWK.** The published key has no `use` member; `jose` accepts it. A strict
  verifier must rely on `kty`, `crv` and `alg`, not on `use`.
- **Refresh reuse.** `refreshTokenReuseInterval` is 60 seconds. A retry inside the window gets the
  same response; a replay after it revokes the family. The CLI should retry a failed refresh once
  inside a minute before falling back to a new device flow.
- **Migrations before deploy.** `0002_rate_limit.sql` and `0003_oauth_clients.sql` must be applied
  before the Worker starts; the deploy workflow will do that when the auth app joins it.
