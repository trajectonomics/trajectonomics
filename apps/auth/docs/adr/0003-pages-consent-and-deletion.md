# ADR 0003: Person-facing pages, marketing consent and account deletion

## Status

Accepted, 2026-11-27. It builds on [ADR 0001](0001-better-auth-platform-with-two-server-modes.md)
and [ADR 0002](0002-oauth-grants-are-server-registered-single-audience-and-revocable.md), which
hold the platform and the OAuth security mechanics. The data side's deletion endpoint is issue
#601 and is not part of this slice.

## Context

ADR 0001 made `auth.trajectonomics.com` its own origin: an XSS on another site sharing it could
make credentialed requests to the auth endpoints. That origin still needs the pages a person uses:
sign-in, the OAuth provider's login and consent pages, the device-code page, the account page and
the two legal pages. The CLI, the data site and the desktop app send people here.

The pages must be fast and cheap, work in English and Thai, and never invent a second header or a
second source of colours. They must also carry an OAuth flow through sign-in without dropping the
provider's signed query, and they must not let a `?next=` value leave the auth origin.

Better Auth 1.7.28 provides three hooks for this slice: `oauthProvider.loginPage`,
`oauthProvider.consentPage` and `oauthProvider.postLogin`. The first two are fixed paths. The third
is how a person answers one question before the provider resumes the authorization flow.

## Decision

### Static Astro pages, served by the Worker's assets binding

The pages are Astro with Svelte 5 islands, the same versions as `apps/data`, built into
`apps/auth/dist-site`. `wrangler.jsonc` gives them to the `assets` binding and runs the Worker first
only for `/api/*`, `/jwks` and `/.well-known/*`; every other path is a static asset. A page never
renders a session server-side: an island asks `/api/auth/get-session` in the browser.

`/` has to redirect on the session, which a static asset cannot see, so it is a small client
redirect with a no-JavaScript link to sign-in. Every other page keeps working without the Worker on
its request path.

The header is `@trajectonomics/site-header` with the Language menu, and colours, type and the
header frame come from `@trajectonomics/brand`. `src/lib/colour-literals.test.ts` fails any colour
literal in a stylesheet, an Astro page or a Svelte component.

### English at `/`, Thai under `/th/`, one page set

`src/lib/language.ts` and the typed dictionaries in `src/lib/dictionary-*.ts` hold both languages.
Every page exists in both trees; the language menu keeps the current query, so a signed OAuth query
or a device `user_code` survives a language switch. `dictionary.test.ts` fails a missing key, an
empty string or a page without a source file. The English legal text is the official version; the
Thai legal page says so.

### Sign-in

`/sign-in` is the provider's `loginPage`: Continue with Google, Continue with GitHub, Sign in with
a passkey, then small Privacy and Terms links. No intro.

The `oauthProviderClient()` plugin adds the page's signed OAuth query to every POST body as
`oauth_query`. The provider's before-hook verifies it, and its after-hook resumes the authorization
flow as soon as a session cookie is set, so a social sign-in returns to the consent page or the
client without the page doing anything.

A passkey sign-in resumes the same way: the provider's client plugin puts the page's signed query on
the POST as `oauth_query`, and the provider's after-hook answers with the address the flow continues
to. The page follows that URL. If no flow is in progress the answer carries no URL, and the page
continues to `?next=` instead; it never navigates back to the signed authorize link, which would
re-run the prompt.

`?next=` is validated by `src/lib/next.ts`: a same-origin path, no absolute address, no protocol
relative form, no backslash, no control character, and no path that normalizes to another host. A
value that fails is ignored and `/account/` is used.

### The first-sign-in question

A person with no `marketingConsent` row answers one screen before continuing: an unticked box,
"Email me product updates (about once a month). You can stop any time.", and Continue. The answer
is recorded either way with `source: "first-sign-in"`.

Two entry points share the page:

- **OAuth flows.** `oauthProvider.postLogin.page` is `/welcome` and `shouldRedirect` reads the D1
  table. The provider sends the person there with its signed query; the page records the answer and
  POSTs `/oauth2/continue` with `postLogin: true`, which resumes the flow.
- **Device and account pages.** `/device` and `/account` ask `GET /marketing-consent` after the
  session check and send a person with no answer to `/welcome?next=…`, which returns to the page.

The provider's page path is fixed, so a Thai person who arrives through an OAuth flow sees the
English page first; the Language menu keeps the signed query and takes them to the Thai copy.
`isContinuation` is not special-cased: a missing record always re-asks, so a person who closes the
page without answering sees it again.

### Device and consent

`/device` takes the code from `?user_code=`, normalizes it exactly as Better Auth does (strip
non-alphanumerics, upper-case), and calls `GET /device`. For the owner, the response carries the
client id and scopes; the page adds the client's public name and renders each scope through
`src/lib/scopes.ts` in plain words (`data:ingest` → "Send your AI usage numbers to the data site").
Approve is the primary button and Deny is secondary. Approve, deny and the invalid, expired and
already-answered states are separate views with an icon and a word, not a colour alone.

`/consent` is the provider's `consentPage` for web clients: the app's name from
`/oauth2/public-client`, the same scope lines, and Allow or Deny through `POST /oauth2/consent`.
A page opened without a `client_id` says it only works from an app.

### Account

`/account` holds one focal point, the person: avatar, name, email. Then:

- **Devices and apps:** `GET /oauth2/grants`, each with the client name and approval date, and
  Revoke through `POST /oauth2/grants/revoke` (ADR 0002's delete-everything path).
- **Passkeys:** list, add through the passkey client's WebAuthn registration and remove.
- **Email updates:** a switch. Turning it off appends a false record and stamps `withdrawnAt` on the
  true row, so the history keeps both.
- **Sign out.**
- **Delete account:** a danger zone. The person types their own email to enable Delete.

All Better Auth calls live in `src/client/auth.ts`; the account and OAuth flow wrappers in
`src/client/account.ts` and `src/client/oauth.ts` use the one request helper, so `createAuthClient`
and its plugins exist in exactly one module.

### The marketing consent record

`migrations/0004_marketing_consent.sql` is generated by `bun run schema` from the
`marketing-consent` plugin. One row per answer: `userId` (cascade on account deletion), `optedIn`,
`wordingVersion` (`"2026-11-27"` until the wording changes), `source` (`"first-sign-in"` or
`"account"`), `language` (`"en"` or `"th"`, added by `migrations/0006_marketing_consent_language.sql`),
`givenAt` and `withdrawnAt` (nullable).

- `GET /marketing-consent` returns `{ consent }`: the latest row as a view, or null when nobody
  has answered. The read asks for one row, newest first (`sortBy givenAt desc, limit 1`), because the
  adapter pages 100 rows and a history longer than that would otherwise report an old answer.
- `POST /marketing-consent` takes `{ optedIn, source, language }`, appends a row, and stamps
  `withdrawnAt` on every open opted-in row when the new answer is false. The stamp and the insert are
  one `DB.batch`, so D1 applies both or neither. It never deletes or rewrites an earlier answer.
- Both require a session. The pure rules are in `src/core/marketing-consent-rules.ts`; the plugin
  reads through the adapter and writes through the D1 binding it is given.

### Account deletion

`user.deleteUser` is enabled. Better Auth 1.7.28's endpoint runs on a sensitive session and, with no
password on this deployment, checks the session's freshness. A session older than the fresh age
gets `SESSION_EXPIRED`; the page tells the person to sign out and sign in again, which is the
library's own protection.

`beforeDelete` inserts the `pendingDeletion` row (`id`, `authUserId`, `requestedAt`,
`acknowledgedAt`, `nextAttemptAt`, `attempts`, `lastError`). The insert runs before the user row is
removed, so a database that cannot queue the notice aborts the deletion: the account is never gone
while the data site would never be told. The account id it names has no live user row afterwards,
which is the point of the queue.

`afterDelete` then deletes the rows that can still name the id — `deviceCode`, and the
`verification` rows whose JSON value holds an authorization code for it — because those two tables
have no foreign key, and tries one `POST https://data.internal/internal/contributors/delete` with
`{ "authUserId": "…" }` through the optional `DATA` service binding. A 2xx sets `acknowledgedAt`. A
missing binding, a non-2xx, a thrown error or a five-second timeout leaves the row pending with
`lastError`, and the cron retries it.

`migrations/0005_pending_deletion.sql` is generated from a schema-only plugin. The table has no
foreign key on purpose: the user row is already gone when the queue row is written. The user,
session, account, passkey, OAuth token and consent tables all cascade from the user row, so the
consent rows and the grant history go with the person; `deviceCode` and `verification` have no
foreign key, which is why `afterDelete` deletes those two by hand.

The hourly Cron Trigger (`43 * * * *`) calls `scheduled`, which reads at most fifty rows whose
`acknowledgedAt` is null, whose `nextAttemptAt` is due and whose user row no longer exists, in
`nextAttemptAt` order, and retries each once. A row whose user still exists is skipped, so a failed
deletion can leave its notice behind without the data site ever being told about a live account. A
failed attempt moves `nextAttemptAt` forward, so failing rows cannot hold the batch. All per-row
writes of a tick go in one `DB.batch`, so a tick is one select, one write batch and one purge batch.
Notices the data site confirmed more than thirty days ago are deleted in that tick, along with
rate-limit counters whose `lastRequest` is older than an hour. The pure timing rules are in
`src/core/deletion.ts`: the first retry waits five minutes, each later one doubles, and the delay
stops growing at one day.

The data-side endpoint is **not built here**. Issue #601 adds it to the `data` Worker. Until then
every notice stays pending and the hourly job retries it; once #601 deploys, the queue drains with
no auth change.

## Evidence

`bun run test:e2e` starts `wrangler dev --local` against a scratch D1 database under `~/.cache`,
signed in through the dev-only email path, and covers: the three sign-in buttons, the unticked first
answer recorded as `optedIn=false`, a device code approved end to end followed by a successful CLI
token poll, the grant listed and revoked on `/account`, a withdrawal appended and the earlier row
kept, and a deleted account leaving one unacknowledged `pendingDeletion` row with no user or
consent rows. `e2e/accessibility.e2e.ts` runs axe on every page at 360 px and 1280 px, in light and
dark, in English and Thai, and fails on a violation or a rule axe could not judge. Screenshots for
the pull request are in `e2e/screenshots/`.

## Consequences

- The pages are cheap and cacheable, and the auth Worker is on the request path only for the API,
  `/jwks` and discovery.
- `/` is a client redirect; a person with JavaScript off uses the link on that page.
- A first OAuth sign-in always passes through `/welcome` until a consent row exists; the answer is
  one record, and the marketing question is not asked again.
- The consent history is append-only until the account is deleted. A wording change is a new
  `wordingVersion`, never an edit to an old row.
- Until #601 ships, deletion notices accumulate as pending rows. That is the designed failure mode,
  not a loss: the data site keeps only the pseudonymous id until it acknowledges.
- `PRIVACY_CONTACT` is a placeholder until the owner confirms the mailbox; there is a `TODO(owner)`
  in `src/lib/legal.ts`.
