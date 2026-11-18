---
status: accepted
---

# The Site has one address, and the Worker resolves the Language

The Site is bilingual, and until this record it said so in the address: `/` answered a 302 to `/th/` or
`/en/`, chosen from `Accept-Language` then `cf-ipcountry`, and each Language had a Home at its own Locale
URL ([ADR 0003](./0003-thai-and-english-from-visitor-signals.md), which this record supersedes). The
redirect existed because a page served at `/` would depend on who asked, and that was judged a cost worth
paying to keep one URL per Language.

The owner reversed that on 2026-11-18, in `site#67`:

> "update the site landing page too so it does not have /en/ or /th/ — I reverse this decision to make the
> url simple and user can easily copy and paste. We resolve the language for the user based on origin from
> Cloudflare, or check the store if the user already set it. If the user already set it, it is in every app."

And on the two questions the reversal left open, answered in the triage thread: Thai does **not** keep an
address of its own, and the **Site's own Worker** resolves the Language rather than the router.

## Decision

- **The Site answers one address, `https://trajectonomics.com/`, with a page and no redirect.** The
  address in the bar, in the copy action and in a share sheet is the same one, and it is the one a person
  edits nothing to send.
- **The Language is the first of: the stored choice, `Accept-Language`, `cf-ipcountry` (`TH` selects
  Thai), English.** The rules that already chose the redirect keep their shape: the highest quality above
  zero wins, the first listed tag wins a tie, and a `th` tag at quality zero beats a Thai country. The
  resolver stays a Pure Core: data in, data out, no I/O and no clock.
- **The stored choice is one first-party cookie, written only when the visitor picks a Language.** The name
  is `traj_lang`, the value is a Language code, and it carries `Path=/`, `Secure`, `SameSite=Lax` and one
  year, and nothing else. `Path=/` is the whole cross-app contract: the Docs Portal and any later app read
  the same cookie instead of asking anyone. A visitor who never picks gets no cookie.
- **The Language menu is two plain links and a redirect.** Every entry points at `/?lang=<code>`, which the
  Worker answers by writing the cookie and replying 302 to `/` with `Cache-Control: no-store`; a code the
  Site does not speak writes nothing and still answers 302 to `/`. The menu stays a native `<details>`
  disclosure, so it works with JavaScript off. A setter is not a Language alternate, so an entry carries
  `lang` and `aria-current` and no `hreflang`.
- **Every Language has a build path, and only English's is an address.** The English home is written to the
  assets root and the Thai home to `th/`. `th/` is what the Worker fetches to serve Thai at `/`; it is not
  linked, listed, canonicalized or advertised, and `/th` answers 301 to `/`.
- **The addresses already in the index answer 301 to `/`, never 404.** `/en`, `/en/*`, `/th` and `/th/*`
  redirect from the Worker's own branch, and those four patterns are in `run_worker_first`. A static
  `_redirects` rule would be wrong here: the Worker fetches the Thai home through the assets binding, and a
  redirect rule matching that fetch would make Thai undeliverable. Worker code is also pure, unit-tested
  and one local probe away from wrong.
- **`/` says what its answer depends on.** The response carries `Vary: Cookie, Accept-Language,
  CF-IPCountry`, `Cache-Control: private, no-cache`, and the `ETag` of the bytes it serves, and it keeps all
  three on a 304. `private` keeps a shared cache from handing Thai bytes to an English visitor; `no-cache`
  makes a browser revalidate instead of serving a remembered Language after the visitor switched.
- **One address means one canonical, one `x-default`, one Sitemap entry, one Not-found page.** A home's
  canonical and `og:url` are `/`; every indexed page names one `x-default` alternate to `/` and no
  per-Language alternate, because a second address no longer exists to name. The Sitemap lists the one
  entry and the IndexNow payload follows it. `llms.txt` links `/` once and `llms-full.txt` carries no
  Languages section. `og:locale` and `og:locale:alternate` state the Language a share was read in, because
  the address no longer does. A miss answers one English Not-found page.
- **Thai is not indexed, and that is the accepted cost.** A search engine arrives with no cookie and a
  preference for neither Language, so it sees the English page at `/`; with one address there is no second
  URL for `hreflang` to name. A Thai page in the index is a future decision, and it needs a new address.
- **The router resolves nothing.** It returns the `/` mount's response unchanged and forwards the whole
  request, so the cookie and `cf-ipcountry` already reach this Worker
  ([ADR 0002](./0002-site-worker-with-static-assets.md)). `trajectonomics/web-router#21` proposed the
  router resolve the Language once for every app; the owner answered that the Site resolves it, and one
  component owns the one writer of `traj_lang`. If a second app ever ships two languages, the resolver and
  the cookie move into the router unchanged.

## Considered Options

- **Keep the per-Language addresses and 302 from `/`.** Rejected by the owner: the prefix in the address is
  what they asked to remove.
- **Keep `/th/` as a crawlable address and redirect only `/en/`.** Rejected by the owner's answer: one
  address everywhere. It would have kept Thai in the index, at the cost of a prefix in every Thai search
  result.
- **Serve each Language at `/` and let `hreflang` name both.** Rejected: `hreflang` needs two URLs, and one
  address cannot be two. A self-referential `hreflang` per Language would state something no crawler can
  act on.
- **Resolve the Language in the router.** Rejected: it changes the router for one app, it breaks the
  router's promise that a `/` response comes back untouched, and its pull request in that repository
  merges only on the owner's say-so, so the Site's own address would wait for it.
- **Store the choice in `localStorage`.** Rejected: a stored choice must be readable by every app under the
  origin before a page runs, and the menu must work with JavaScript off.
- **Store the Language the resolver chose, not only an explicit choice.** Rejected: it would put a cookie
  on a first visit, and the Site's rule is that it stores nothing the visitor did not ask for.
- **Redirect the old prefixes from a `_redirects` file.** Rejected: the Worker fetches the Thai build through
  the same assets layer, so a rule matching it would break Thai delivery, and the file's behaviour is not
  covered by the probe's unit-tested rules.
- **Force the Language on every request with the country alone.** Rejected: it would ignore a visitor's own
  browser preference and a stored choice.

## Consequences

- The visible change is the address: a visitor lands on `/` and stays there, and `/th/` and `/en/` in an old
  link answer 301.
- The Site sets a cookie for the first time. That amends ADR 0011's "nothing is stored": the analytics stays
  cookieless and anonymous, and the only cookie is the Language the visitor picked. A future privacy page
  must name `traj_lang`.
- `bun run check` gains probe cases rather than a new tool: the four inputs of the resolution, the choice
  link, a hostile cookie value, and the four redirect patterns.
- The build's rule that forbade a document at `/` is inverted. The assets root is now the English home, and
  a build without it has no page at the address the Site is.
- Thai keeps a build path that no address names, so the built files still hold both Languages and every
  budget, contrast, theme and text rule still judges both.
- Restoring a Thai address is a new decision, not a revert: it needs a URL, `hreflang`, a Sitemap entry and
  the choice of which of the two addresses a visitor lands on.
