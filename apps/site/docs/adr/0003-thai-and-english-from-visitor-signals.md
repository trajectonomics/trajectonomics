---
status: accepted
---

# Thai and English are chosen from Visitor signals

The Site speaks Thai and English. A Locale URL is the Language of a page. `/` does not serve a page: it redirects to `/th/` or `/en/`.

The redirect is a pure function of the Visitor signal. `Accept-Language` wins, matched on the primary subtag. The highest quality above zero wins, and the first listed tag wins a tie. If that chooses nothing, a `cf-ipcountry` of `TH` selects Thai, unless a `th` tag was present at quality zero. Otherwise English. The response is status 302, with `Cache-Control: no-store`, `Vary: Accept-Language, CF-IPCountry`, no cookie, and the query string kept.

Nothing is stored for the visitor. The next request to `/` chooses again. Opening a Locale URL does not choose.

Each Language has one Dictionary. A further Language is one Dictionary and one config entry: code, URL prefix, and any country codes. There is no machine translation.

The Language homes are indexed. Their `hreflang` and canonical links are absolute on `https://trajectonomics.com`, and `x-default` is the English home. A Not-found page is not a Language home: it is `noindex`, the Thai one only for a miss under `/th/`, and the English one for every other miss.

The Worker script runs only for `/`. Every other path stays a static asset. [ADR 0002](./0002-site-worker-with-static-assets.md) allowed this script and still requires status 404 for a miss. The scaffold does not add the script. The Language work does.

## Considered Options

- **Serve the chosen Language at `/`.** Rejected. The body would depend on who asked, and crawlers would have a third copy. The Locale URLs are the pages.
- **Remember the choice in `localStorage` or a cookie.** Rejected. The redirect has no document for a script, the switcher must work with JavaScript off, and the Site sets no cookie.
- **Let the country override an explicit rejection of Thai.** Rejected. A `th` tag at quality zero means Thai is not acceptable.
- **Wait for the design system to own the type and the switcher.** Rejected. The theme has no Thai stack yet, and the switcher is one link per other Language.

## Consequences

- The scaffold's 200 at `/` becomes this redirect. A check for the page follows the redirect or requests a Locale URL.
- The glossary term Worker with Static Assets includes that script, and no other script.
- The choice function does no I/O and reads no clock.
- Sentences the owner must write stay placeholders. This record does not choose tax wording.
