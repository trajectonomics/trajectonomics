/**
 * The pure rules of the loopback server `traj dashboard` runs: which built file answers a path, what
 * type it is served as, and which Host headers are this machine's. The server itself is in
 * `scripts/serve.ts` ([ADR 0007](../../../docs/adr/0007-traj-dashboard-serves-the-dashboard-on-loopback.md)).
 */

export { SNAPSHOT_PATH } from "../view/snapshot-url"

/**
 * The keys of the packed build that may answer a request path, in order: the file itself, then a
 * route's prerendered `index.html`. A path that tries to leave the build answers nothing.
 */
export function assetKeys(pathname: string): string[] {
	if (!pathname.startsWith("/") || pathname.split("/").some((part) => part === "..")) return []
	if (pathname.endsWith("/")) return [`${pathname}index.html`]
	return [pathname, `${pathname}/index.html`]
}

const TYPES: Record<string, string> = {
	html: "text/html; charset=utf-8",
	js: "text/javascript; charset=utf-8",
	css: "text/css; charset=utf-8",
	json: "application/json; charset=utf-8",
	svg: "image/svg+xml",
	png: "image/png",
	ico: "image/x-icon",
	webp: "image/webp",
	woff2: "font/woff2",
	txt: "text/plain; charset=utf-8",
	webmanifest: "application/manifest+json",
}

/** The Content-Type a built file is served with; an unknown extension is plain bytes. */
export function contentTypeOf(key: string): string {
	const dot = key.lastIndexOf(".")
	const extension = dot < 0 ? "" : key.slice(dot + 1).toLowerCase()
	return TYPES[extension] ?? "application/octet-stream"
}

/**
 * True when a request's Host header names this machine on the server's port. Anything else is
 * refused, so a web page that rebinds its own domain to 127.0.0.1 cannot read the Snapshot.
 */
export function isLoopbackHost(host: string | null, port: number): boolean {
	if (host === null) return false
	return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`].includes(host.toLowerCase())
}
