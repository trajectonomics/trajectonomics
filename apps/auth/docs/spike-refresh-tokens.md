# Spike: refresh tokens through the device flow, and Ed25519 JWTs under `wrangler dev`

Status: answered, 2026-11-27. This is step 1 of #600. The service is in
[ADR 0001](adr/0001-better-auth-platform-with-two-server-modes.md).

## The two answers

| Question | Answer | Evidence |
|---|---|---|
| Can one pinned stable Better Auth issue a refresh token through RFC 8628 device authorization on Workers + D1 under `wrangler dev`? | **YES** | A test client with `offline_access` and the `refresh_token` grant received a `refresh_token` from `/api/auth/oauth2/token`; the refresh grant returned a new access token and a rotated refresh token. |
| Can it sign an Ed25519 (EdDSA) JWT, publish the key at `/jwks`, and can a separate `jose` verifier check it against that JWKS with an `aud` check? | **YES** | `/jwks` returned one `OKP`/`Ed25519`/`EdDSA` key; `jwtVerify` with `issuer`, `audience` and `algorithms: ["EdDSA"]` passed; the relay audience and RS256 were both rejected. |

## Pinned version

**Better Auth 1.7.28**, exact. On 2026-11-27 the registry had
`latest: 1.7.28`, `beta: 1.8.0-beta.11`, `canary: 1.0.0-canary.14` and
`rc: 1.7.0-rc.6`. 1.7.28 is the newest non-beta, non-canary, non-RC release. The companion packages
`@better-auth/oauth-provider` and `@better-auth/passkey` are pinned to 1.7.28 as well.
`jose` is pinned to 6.2.18.

## What was exercised

The harness boots `wrangler dev --local` with a scratch D1 database, applies `migrations/0001_init.sql`,
and then:

1. creates a synthetic test user through the dev-only email + password endpoint;
2. registers a public native OAuth client (`token_endpoint_auth_method: "none"`) with the
   `urn:ietf:params:oauth:grant-type:device_code` and `refresh_token` grants and the
   `openid profile email offline_access data:ingest` scopes;
3. requests a device code with `resource=https://data.trajectonomics.com`;
4. polls once before approval and receives `authorization_pending`, the RFC 8628 waiting answer;
5. signs in as the test user, claims the code at `GET /api/auth/device`, and approves it at
   `POST /api/auth/device/approve`, then waits the advertised five-second polling interval;
6. polls `POST /api/auth/oauth2/token` with `grant_type=urn:ietf:params:oauth:grant-type:device_code`;
6. uses the refresh token at the same endpoint with `grant_type=refresh_token`;
7. fetches `/jwks` and verifies the access JWT with `jose` against it, including `aud` and `iss`.

This is the OAuth provider's device grant, not the standalone `deviceAuthorization()` plugin. The
standalone plugin's `/device/token` mints a Better Auth **session token**: no refresh token, no
`aud`, no JWT. The pair that gives RFC 8628 a first-class OAuth token set is `oauthProvider()` +
`oauthDeviceAuthorization()`, both from `@better-auth/oauth-provider` at 1.7.28.

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
	"scope": "openid profile email offline_access data:ingest"
}
```

The refresh response has the same seven fields, a new `access_token`, and a **rotated**
`refresh_token` (different from the device-flow one). Access tokens last 900 seconds; refresh
tokens last 2,592,000 seconds (30 days).

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
		"https://data.trajectonomics.com",
		"http://127.0.0.1:<port>/api/auth/oauth2/userinfo"
	],
	"sub": "<redacted>",
	"scope": "openid profile email offline_access data:ingest",
	"iat": 1794999100,
	"exp": 1795000000,
	"jti": "<redacted>"
}
```

`jose.jwtVerify(token, createLocalJWKSet(jwks), { issuer, audience: "https://data.trajectonomics.com", algorithms: ["EdDSA"] })`
passed. The same call with `audience: "https://relay.trajectonomics.com"` failed with
`unexpected "aud" claim value`, and `algorithms: ["RS256"]` failed. A resource server must therefore
accept an audience **array that contains** its own URI; the userinfo endpoint is a second audience
on OIDC access tokens. Do not compare the whole `aud` array for equality.

The issuer in production is `https://auth.trajectonomics.com` because `BETTER_AUTH_URL` is that
value. The local run above used `http://127.0.0.1:<port>`.

## Plugins on Workers

| Plugin | Package | Result |
|---|---|---|
| Google social provider | built in | Configured when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` exist. Worker boots and the route is registered; no real OAuth round trip (no credentials yet). |
| GitHub social provider | built in | Same as Google, with `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. |
| Passkeys | `@better-auth/passkey` 1.7.28 | Worker boots and the passkey schema is created. No WebAuthn ceremony was run; that needs a browser or an authenticator. |
| OAuth 2.1 / OIDC provider | `@better-auth/oauth-provider` 1.7.28 | Worked: client registration, device grant, scoped/audience-bound JWT access tokens, refresh rotation, ID token. |
| Device authorization | `oauthDeviceAuthorization()` from the same package | Worked as the RFC 8628 front half: `/device/code`, `/device`, `/device/approve`, then the OAuth token endpoint. |
| JWT / JWKS | `jwt` from `better-auth/plugins` | Worked: EdDSA/Ed25519 key in D1, `/jwks`, `iss`/`aud`/`exp` claims. |
| Standalone `deviceAuthorization()` | `better-auth/plugins/device-authorization` | Not used. It issues a session token, not a refreshable OAuth token set; installing it instead of `oauthDeviceAuthorization()` would fail the design. |

`nodejs_compat` is required: Better Auth imports `node:async_hooks` and `node:crypto`; D1 is the
native `database: env.DB` adapter in 1.7.28, not Kysely wired by hand. `wrangler dev --local`
applied the generated migration and served every request above.

## Reproduce

```sh
cd apps/auth
bun install
bun run spike            # random free port; SPIKE_PORT=8787 bun run spike to pin one
bun run schema           # regenerate migrations/0001_init.sql from the auth options
bun run check            # Biome, tsc, unit tests, wrangler deploy --dry-run
```

`bun run spike` creates a scratch directory under `~/.cache`, applies the migration to a local D1,
starts `wrangler dev --local`, runs the flow, prints the redacted report, and removes the directory.
It exits non-zero if any check is false, and it never prints a token or a user identifier.

## Caveats and follow-ups for the service slice

- **Client registration and resources.** The session endpoint `POST /api/auth/oauth2/create-client`
  cannot set `resources`; the admin endpoint that can is marked `SERVER_ONLY` and is not reachable
  over HTTP. The spike therefore sets `enforcePerClientResources: false`. Production should
  register the data and CLI clients server-side with their resource links and turn enforcement on.
- **Resource seeding.** `resourceSeedScope: "process"` is Better Auth's recommended stopgap when the
  instance is rebuilt per request on Workers; it is documented as temporary.
- **Dev sign-in.** The test user exists only when `ENVIRONMENT=development`, `DEV_ONLY=true` and
  `BETTER_AUTH_URL` is loopback. The committed `wrangler.jsonc` sets `ENVIRONMENT=production`, and
  `auth.trajectonomics.com` is not loopback, so neither a production deploy nor a leaked secret can
  enable email + password.
- **ID token.** The device grant returns an `id_token` even though the CLI only needs the access and
  refresh tokens. Ignore it in the CLI rather than relying on it.
- **`use` on the JWK.** The published key has no `use` member; `jose` accepts it. A strict
  verifier must rely on `kty`, `crv` and `alg`, not on `use`.
