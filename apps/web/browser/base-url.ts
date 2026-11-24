// Two checkouts of this repository can run the suite at once, so the port is not the Dashboard's own
// (4321) and can be moved: BROWSER_PORT=4410 bun run test:browser.
export const BROWSER_PORT = Number(process.env["TRAJ_WEB_BROWSER_PORT"] ?? 4391)
export const BASE_URL = `http://127.0.0.1:${BROWSER_PORT}`
