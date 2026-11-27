/** The port the browser checks serve the auth Worker on: a sibling Run may hold the default. */
export const AUTH_BROWSER_PORT = Number(process.env["AUTH_BROWSER_PORT"] ?? 8793)

/** The origin the browser checks drive: the built pages and the Worker, on one local port. */
export const BASE_URL = `http://127.0.0.1:${AUTH_BROWSER_PORT}`
