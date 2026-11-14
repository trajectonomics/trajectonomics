# Site

The public page at the root of trajectonomics.com. The router mounts it at `/` and sends `/docs` to the Docs Portal.

## Language

**Site**:
This repository's static microfrontend, mounted at `/` of trajectonomics.com.
_Avoid_: Landing page, home page, marketing site

**Worker with Static Assets**:
A Worker with no script that serves the Site's built files.
_Avoid_: Assets Worker, site server, hosting

**Not-found page**:
The built page served with HTTP status 404 when a path is not in the Site.
_Avoid_: soft 404, error page

**Reserved preload path**:
The path `/__mf-preload.js`, owned by the router and never built by the Site.
_Avoid_: preload script, client router
