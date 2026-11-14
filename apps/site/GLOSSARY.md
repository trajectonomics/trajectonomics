# Site

The public page at the root of trajectonomics.com, in Thai and English. The router mounts it at `/` and sends `/docs` to the Docs Portal.

## Language

**Site**:
This repository's static microfrontend, mounted at `/` of trajectonomics.com.
_Avoid_: Landing page, home page, marketing site

**Language**:
Thai (`th`) or English (`en`), the two native languages of the Site. English is the fallback.
_Avoid_: Translation, copy, tongue

**Locale URL**:
A Site URL whose first segment is a Language code, `/th/…` or `/en/…`. It is the only record of which Language a page is.
_Avoid_: Language prefix, translated URL

**Visitor signal**:
The `Accept-Language` header, otherwise the `cf-ipcountry` header, read only to choose the redirect from `/`. Not the HTTP `Origin` header.
_Avoid_: Origin, geolocation

**Dictionary**:
The strings for one Language. Every Language has the same keys.
_Avoid_: Translation file, messages, catalog

**Worker with Static Assets**:
The Site's Worker that serves the built files. Its only script is the redirect from `/` to a Locale URL.
_Avoid_: Assets Worker, site server, hosting

**Not-found page**:
The built page served with HTTP status 404 when a path is not in the Site.
_Avoid_: soft 404, error page

**Reserved preload path**:
The path `/__mf-preload.js`, owned by the router and never built by the Site.
_Avoid_: preload script, client router
