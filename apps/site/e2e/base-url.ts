/** The port the browser checks serve the Site on: one Run may move off the default when a sibling holds it. */
export const SITE_BROWSER_PORT = Number(process.env["SITE_BROWSER_PORT"] ?? 8791)

/** The origin the browser checks drive: the built Site, answered by the Worker. */
export const BASE_URL = `http://127.0.0.1:${SITE_BROWSER_PORT}`
