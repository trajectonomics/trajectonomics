import { SITE_ORIGIN } from "../site"

const SITE_HOST = new URL(SITE_ORIGIN).host
const ABSOLUTE = /^(?:https?:)?\/\/([^/?#]+)([^?#]*)/i
const OTHER_SCHEME = /^[a-z][\w+.-]*:/i

/** The built-file path a URL names on the Site's own origin, or `undefined` for one it does not. */
export function sameOriginPath(fromPath: string, url: string): string | undefined {
	const trimmed = url.trim()
	if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("data:")) return undefined
	const absolute = ABSOLUTE.exec(trimmed)
	if (absolute !== null) {
		const host = (absolute[1] ?? "").toLowerCase()
		return host === SITE_HOST ? resolve("/", absolute[2] ?? "") : undefined
	}
	return OTHER_SCHEME.test(trimmed) ? undefined : resolve(fromPath, trimmed)
}

/** The path relative to `fromPath`, with `.`, `..`, a query and a fragment taken out. */
function resolve(fromPath: string, url: string): string {
	const segments = url.startsWith("/") ? [] : fromPath.split("/").slice(0, -1)
	for (const segment of url.replace(/[?#].*$/, "").split("/")) {
		if (segment === "" || segment === ".") continue
		if (segment === "..") segments.pop()
		else segments.push(segment)
	}
	return segments.join("/")
}
