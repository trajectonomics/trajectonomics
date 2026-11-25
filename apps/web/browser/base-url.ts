// Two checkouts of this repository can run the suite at once, so the port is not the Dashboard's own
// (4321) and can be moved: TRAJ_WEB_BROWSER_PORT=4410 bun run test:browser.
/** The port the built Demo is served on, 4391 unless `TRAJ_WEB_BROWSER_PORT` says otherwise. */
export const BROWSER_PORT = Number(process.env["TRAJ_WEB_BROWSER_PORT"] ?? 4391)
/** Where the suite reaches the served Demo: loopback only. */
export const BASE_URL = `http://127.0.0.1:${BROWSER_PORT}`

/** The port the hosted Demo's build (`dist-hosted/`) is served on, one above the loopback build's unless `TRAJ_WEB_BROWSER_HOSTED_PORT` says otherwise. */
export const HOSTED_PORT = Number(process.env["TRAJ_WEB_BROWSER_HOSTED_PORT"] ?? BROWSER_PORT + 1)
/** Where the suite reaches the hosted Demo: loopback only, with the base path the Site serves it under. */
export const HOSTED_ORIGIN = `http://127.0.0.1:${HOSTED_PORT}`
/** The path the hosted Demo is served under, as the Site serves it. */
export const HOSTED_PREFIX = "/demo"
