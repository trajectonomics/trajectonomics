---
status: accepted
---

# The Site measures visits from the page itself

The Site had no number for anything it did. The organisation's `site` Surface records the reason plainly: its copy rate was `not instrumented`, because the Copy button wrote no counter and the router served no count (`trajectonomics/factory` ADR 0020). A visitor's path — which Language home they opened, how they arrived, whether they copied the one command — was invisible, so every change to the page was judged by opinion. The owner asked for PostHog analytics on the Site and the Docs Portal on 2026-11-17.

Two rules in this repository shape how that can be done. [ADR 0005](./0005-page-weight-and-web-font-budget.md) holds one page to 50,000 gzipped bytes of HTML and CSS and 10,000 uncompressed bytes of program JavaScript, and the Site ships no third-party script. [ADR 0003](./0003-thai-and-english-from-visitor-signals.md) says nothing is stored for the visitor: the Site sets no cookie, and the built-file rule `SCRIPT_DETECTS_LANGUAGE` fails a home whose script reads the browser's Language, a cookie or storage at all.

## Decision

1. **PostHog is the Site's analytics service.** The project is `268299` on the EU host, and its ingestion key is public by design — it can only write events — so it is committed in `src/lib/analytics/posthog.ts`.
2. **The page posts the event itself.** It sends a JSON body to `https://eu.i.posthog.com/i/v0/e/` with `navigator.sendBeacon` and a `text/plain` body, falling back to `fetch` with `keepalive`. No library, no third-party script, no `<script src>` off this origin: the module is small enough that Astro inlines it.
3. **Nothing is stored.** No cookie, no `localStorage`, no `sessionStorage`. Every event carries an id made for that event alone (`crypto.randomUUID`), so a pageview and a copy are two counts and never one profile. `$process_person_profile` is `false` on every event, so PostHog keeps no person.
4. **Only the production host is measured.** The page sends nothing unless `location.hostname` is `trajectonomics.com`, which keeps a preview, `workers.dev` and `localhost` out of the project without a build flag the served page could not read.
5. **An opt-out wins.** A visitor whose browser reports `navigator.doNotTrack === "1"` or `navigator.globalPrivacyControl === true` is not measured at all.
6. **Two events.** `$pageview` on the page's load, which the Web Analytics product reads, and `site_command_copied` when the Copy button puts the one command on the clipboard. The copy event names the command by a stable name (`install`), never by its text, which changes every release. The Copy button dispatches a `traj:site-command-copied` event and posts nothing itself, so its progressive enhancement is unchanged.
7. **The payloads are pure functions with tests.** `pageviewProperties`, `commandCopiedProperties`, `capturePayload` and `shouldSend` live in `src/lib/analytics/` beside their unit tests; only `client.ts` touches the browser.

## Considered Options

- **`posthog-js`.** The library brings autocapture, session replay and heatmaps, and it is what PostHog's wizard installs. Rejected: it is 40 KB or more, which is four times the whole program budget, and it loads from another origin, which `EXTERNAL_ASSET` fails and ADR 0005 forbids.
- **A `/go/*` counter in the router that the Site increments.** This is the shape the `site` Surface brief assumed. Rejected: it needs a Cloudflare-side counter and a Worker change to serve it, so the number would exist only where the owner's dashboard is, and a pass could not read it.
- **Store a tab id in `sessionStorage`, as the Docs Portal does.** Rejected: `SCRIPT_DETECTS_LANGUAGE` fails a script that reads storage on a Locale home, and ADR 0003's rule is that nothing is stored for the visitor. The copy rate is a ratio of two counts, so no id needs to survive an event.
- **Count in the Worker from request logs.** Rejected: it measures requests, not visitors, and cannot see a copy at all.
- **No analytics.** Rejected by the owner's request; the copy rate would stay `not instrumented` and every page change would stay opinion.

## Consequences

- The copy rate becomes a number for the first time: `site_command_copied` over `$pageview`, per Language home and per referrer.
- `trajectonomics/factory` ADR 0020 and the `site` brief still say the copy rate becomes a number when `web-router` serves a `/go/*` count. That line is now wrong and needs a pull request in `factory` that names this event instead. It is not this repository's to change.
- The home's program JavaScript is 8,240 bytes of the 10,000 budget, 1,503 of them this module. The remaining headroom is about 1,760 bytes, so the next script on the home needs to earn its place.
- A visitor with JavaScript off is not measured at all, and neither is one on the staging host. Both are absences of evidence, not zero visitors.
- Reading the numbers needs a PostHog credential, which only the owner holds. A Factory pass reads them through the PostHog MCP server, not through this repository.
