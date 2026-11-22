---
status: accepted
---

# The Site asks before it sets an analytics cookie

The owner asked on 2026-11-22 for a cookie on the landing page, with consent. The Site's analytics has been cookieless since [ADR 0011](./0011-analytics-from-the-page-itself.md): every event carries an id made for that event alone. That keeps the Site free of any stored state, and it means a pageview and a copy are two counts that can never be linked. It also means the Site cannot tell a new visitor from a returning one, so the numbers say how many events happened and not how many people came back. Only a stored id can answer that, and only a visitor who agrees should be asked to store one.

## Decision

1. **The Site asks once, on the landing page, with a banner.** The banner names the cookie, what it holds and for how long. It offers two plain links: allow and "no thanks".
2. **Two cookies, both first-party, both for 180 days.** `traj_consent` holds the answer (`granted` or `denied`). `traj_vid` holds a random UUID, and only when the visitor granted consent. Both carry `Path=/`, `Secure`, `SameSite=Lax` and `Max-Age=15552000`. On `trajectonomics.com` they also carry `Domain=trajectonomics.com`, because the Docs Portal is served on `docs.trajectonomics.com` and a host-only cookie on the apex would never reach it; a preview or `localhost` host names no domain, since a browser refuses a cookie for a domain the host is not under. The question is asked again after six months, so an old yes is not a yes forever.
3. **The Worker resolves consent, as it resolves the Language.** `/?consent=granted` and `/?consent=denied` answer 302 to `/` with `Cache-Control: no-store` and the cookies. `/` reads the request's `Cookie` header and writes `data-consent` (and `data-visitor` for a grant) on the `html` element of the home it serves. A grant with no valid id gets one minted by the Worker.
4. **A browser opt-out is a no.** `Sec-GPC: 1` or `DNT: 1` resolves to `denied`, so the banner is not shown to a visitor who has already said no to every site, and the footer's reset link brings it back only once the signal is off. Both headers are named in `Vary`.

   **Only the visitor's own navigation stores an answer.** A consent link fetched with a `Sec-Fetch-Dest` other than `document` (an `<img>` or a `fetch` another site embeds) answers the same 302 with no cookie, so no page can grant consent on a visitor's behalf.
5. **The banner has no script, and no page script reads a cookie.** Each banner choice is a plain link to the Worker's redirect, so it works with JavaScript off and with it on. The redirect stores the `Set-Cookie` and returns the visitor to `/` without the banner, which costs one page load. A script that fetched the link and hid the banner without that reload was specified, and it was dropped: with the analytics identity it took the home's program JavaScript to 10,233 bytes, over the 10,000 budget of [ADR 0005](./0005-page-weight-and-web-font-budget.md). The page script never reads `document.cookie`, which keeps `SCRIPT_DETECTS_LANGUAGE` true, and the banner is never painted before a script could hide it.
6. **A reset link.** The footer's "Cookie choice" link goes to `/?consent=reset`, which clears both cookies, so the banner is asked again.
7. **The Docs Portal follows the same choice.** The Portal reads `traj_consent` and `traj_vid` from `document.cookie` (a read, never a write), and uses the visitor id as `distinct_id` only when the reader granted consent. [Docs ADR 0016](../../../docs/docs/adr/0016-the-portal-follows-the-sites-cookie-choice.md) records the Portal's half.
8. **Every event says whether it was consented.** Each event carries a `consent` property: `granted` when the visitor's id was used, `cookieless` otherwise. `$process_person_profile` stays `false`.

## Considered Options

- **`posthog-js` with its consent API.** Rejected: it is 40 KB or more, four times the program budget, and it loads from another origin. [ADR 0005](./0005-page-weight-and-web-font-budget.md) and [ADR 0011](./0011-analytics-from-the-page-itself.md) rule that out again.
- **A client-side cookie script that sets and reads `traj_consent`.** Rejected: the script would read a cookie on the home, which `SCRIPT_DETECTS_LANGUAGE` forbids, and the banner would flash before the script hid it. The Worker already has the answer before the first byte is sent.
- **A banner on every app.** Rejected for now. The owner asked for the landing page, and the Docs Portal follows the choice the landing page records. A second banner would ask the same question twice.
- **Store the id in `localStorage`.** Rejected: the Site's cookie is what the Worker can read, and `localStorage` would need the page script to read it, which breaks the rule above.

## Consequences

- The cookieless count stays for everyone who has not allowed a cookie. Unique and returning visitors become a number only for those who allowed one, so the two counts describe different populations, and any comparison must say so.
- A personalised home is never revalidated with a 304. Its `ETag` and `Last-Modified` are dropped, and `Vary` and `Cache-Control` keep their meaning. The same bytes answer two ways, so a 304 could hand a browser the cached variant with the banner.
- A visitor who refuses, or who has `Sec-GPC` or `DNT` set, is counted exactly as before, with no id.
- [ADR 0020](./0020-the-site-has-one-address.md) asked for a privacy page that names the Language cookie. It must now name `traj_consent` and `traj_vid` as well, with their lifetime and what they hold.
- The probe checks the consent answers, the grant's cookie pair, the personalised home's `data-consent` and `data-visitor`, and that an undecided home carries no consent marker.
