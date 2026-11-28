/** The one host every static site is served under. */
export const SITE_ORIGIN = "https://trajectonomics.com"

/** The data site's base path under that host; the assets binding serves the build's root here. */
export const BASE_PATH = "/data"

/** The data site's API, under the base path. */
export const API_PATH = "/data/api"

/** The data site's ingest endpoint, under the base path. */
export const INGEST_PATH = "/data/ingest"

/** The browser sign-in routes, under the base path. */
export const AUTH_PATH = `${BASE_PATH}/auth`
export const SIGN_IN_PATH = `${AUTH_PATH}/sign-in`
export const CALLBACK_PATH = `${AUTH_PATH}/callback`
export const SIGN_OUT_PATH = `${AUTH_PATH}/sign-out`

/** The signed-in page and the read its browser makes. */
export const ME_PATH = `${BASE_PATH}/me/`
export const COLLECTORS_PATH = `${API_PATH}/me/collectors`

/** The data site's former host: it keeps the API and ingest, and redirects every page. */
export const LEGACY_HOST = "data.trajectonomics.com"

/** The service-binding host for auth's notices; it has no DNS (ADR 0015). */
export const INTERNAL_HOST = "data.internal"
