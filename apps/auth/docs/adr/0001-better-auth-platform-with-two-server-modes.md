# ADR 0001: Better Auth is the platform, with two self-hosted server modes

## Status

Accepted, 2026-11-27. The spike that proves the two risky mechanics is in
[`../spike-refresh-tokens.md`](../spike-refresh-tokens.md). The service, the sign-in pages and the
OAuth clients ship in later slices of #600.

## Context

People sign in to contribute usage and to use the CLI, the desktop app and OpenJot. The project is
open source with a hosted cloud service and a bring-your-own-backend option, so accounts cannot live
inside `traj-data`: a numbers store must never hold an email or a name. The auth service is a
separate Worker with its own D1 database, `traj-auth`.

Better Auth is the chosen library. It must run on Cloudflare Workers with D1, issue access tokens
that short-lived CLIs can refresh, sign them with Ed25519 and publish the public keys. A pin to one
exact version is required: plugin names and packages change between releases.

## Decision

- **Pinned Better Auth 1.7.28**, the `latest` stable release on 2026-11-27. No beta, canary or RC.
  The plugins are `@better-auth/oauth-provider` and `@better-auth/passkey`, both at 1.7.28, plus
  the built-in `jwt` plugin. Device authorization uses the OAuth provider's
  `oauthDeviceAuthorization()`, not the standalone `deviceAuthorization()`, so the device grant
  issues a first-class OAuth token set with a refresh token.
- **`auth.trajectonomics.com` is its own origin**, a Worker named `auth` with D1 `traj-auth`, not a
  path under `trajectonomics.com`. An XSS bug on another site sharing the origin (the docs, the
  blog, the data site) could make credentialed same-origin requests to the auth endpoints. A
  separate origin makes the browser's origin boundary do that work.
- **Sign-in at launch: Google, GitHub and passkeys.** Apple joins when the iOS app ships. The
  hosted platform stores the user, the linked accounts, the passkeys and the OAuth grants.
- **Tokens are audience-bound.** Each server in `platform` mode registers with the platform for
  free and receives its own audience (`aud`), an absolute resource URI. An access JWT for the data
  server is rejected by the relay and by every other server, so a self-hosted server cannot replay
  a user's token against the hosted relay. The access JWT lives fifteen minutes; the refresh token
  lives thirty days. The device-flow client registers with the device-code grant, the
  `refresh_token` grant and the `offline_access` scope: without the grant Better Auth omits the
  refresh token even when the scope asks for it (spike finding). An OIDC access token also carries
  the userinfo endpoint in `aud`, so a server checks that its own URI is present rather than
  comparing the claim for equality.
- **A self-hosted server (relay, data, MCP) has exactly two auth modes**, set by its operator:

  | Mode | Who can use it | Check | For |
  |---|---|---|---|
  | `platform` | Trajectonomics accounts the operator allows | JWT from `auth.trajectonomics.com`, verified against cached `/jwks` | A family or team server with no user database to run |
  | `none` | Whoever can reach it | No user accounts. Binds to localhost/LAN by default. Exposing it publicly requires one static server token set by the operator | One person: a laptop, a home server, a tailnet |

  There is no third issuer. A self-hoster does not run their own user system, and servers do not
  accept arbitrary OIDC issuers. Trusting our `/jwks` is the `platform` mode; `none` sits beside it.
- **Encryption keys never pass through auth.** The platform knows who signed in; synced data stays
  end-to-end encrypted.
- **Clients take a server URL**, with the hosted service as the default. Changing the URL is how a
  user brings their own backend.

## Consequences

- `traj-auth` holds people and credentials; `traj-data` holds numbers and the auth user id. A leak
  of the data database cannot expose an email or a name.
- The owner must create the Google OAuth client, the GitHub OAuth app, the D1 database `traj-auth`
  and the `auth.trajectonomics.com` route before the Worker deploys.
- Every server that wants audience-bound tokens registers a resource URI; a client that requests a
  resource it is not linked to is rejected once per-client resource enforcement is on.
- The auth Worker is on the request path only for sign-in and token refresh. Resource servers cache
  `/jwks`, so the fifteen-minute access token needs no per-request call to auth.
