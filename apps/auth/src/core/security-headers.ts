/**
 * The headers every page and every Worker response carries.
 *
 * Workers static assets serve `dist-site/_headers`, which the build writes from the committed
 * `public/_headers`. The policy itself lives here so the pages, the build script and the tests read
 * one definition. Every inline `<script>` the built pages carry is hashed into `script-src`; there
 * is no `'unsafe-inline'` for scripts, so a page that grows an unhashed inline script fails to run
 * and the e2e run says so.
 *
 * Pure: text in, text out. The one `Response` helper takes the response it hardens.
 */

/** The frame, type and referrer rules, the same on a page and on the Worker's own answer. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
	"x-frame-options": "DENY",
	"x-content-type-options": "nosniff",
	"referrer-policy": "no-referrer",
	"strict-transport-security": "max-age=63072000; includeSubDomains",
})

/** Where the build script puts the hashes of the inline scripts it found. */
export const SCRIPT_HASHES_TOKEN = "__INLINE_SCRIPT_HASHES__"

/** Where the build script puts the hashes of the inline styles it found. */
export const STYLE_HASHES_TOKEN = "__INLINE_STYLE_HASHES__"

/**
 * The Worker's own answers are JSON and redirects, never pages, so nothing may load from them. The
 * frame rule still travels with them: an API answer or a redirect must not be framed either.
 */
export const WORKER_CONTENT_SECURITY_POLICY =
	"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'none'"

/** One `sha256-…` source for a piece of inline text, in the form CSP expects. */
export async function hashSource(text: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
	const bytes = new Uint8Array(digest)
	let binary = ""
	for (const byte of bytes) binary += String.fromCharCode(byte)
	return `sha256-${btoa(binary)}`
}

/** The readable text of every inline `<script>` in one page, in document order. */
export function inlineScripts(html: string): readonly string[] {
	const scripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)
	const found: string[] = []
	for (const [, attributes, body] of scripts) {
		if (attributes === undefined || body === undefined) continue
		if (/\ssrc\s*=/i.test(attributes)) continue
		if (body.trim() === "") continue
		found.push(body)
	}
	return found
}

/** The text of every inline `<style>` in one page, in document order. */
export function inlineStyles(html: string): readonly string[] {
	const styles = html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)
	return [...styles].map(([, body]) => body ?? "").filter((body) => body.trim() !== "")
}

/** Every distinct hash source, sorted so the file is stable between builds. */
export function sortedSources(sources: Iterable<string>): readonly string[] {
	return [...new Set(sources)].sort()
}

/**
 * The page policy: everything from this origin, no framing, no plugins, no base rewriting, forms
 * only to this origin, avatars from Google and GitHub, and exactly the inline scripts and styles
 * the build hashed.
 */
export function pageContentSecurityPolicy(
	scriptHashes: readonly string[],
	styleHashes: readonly string[],
): string {
	return [
		"default-src 'self'",
		"base-uri 'none'",
		"object-src 'none'",
		"frame-ancestors 'none'",
		"form-action 'self'",
		"img-src 'self' https: data:",
		"font-src 'self'",
		"connect-src 'self'",
		`script-src 'self' ${scriptHashes.map((hash) => `'${hash}'`).join(" ")}`.trim(),
		`style-src 'self' ${styleHashes.map((hash) => `'${hash}'`).join(" ")}`.trim(),
	].join("; ")
}

/** The committed template with the two hash lists filled in. A missing token is a build error. */
export function fillHeadersTemplate(
	template: string,
	scriptHashes: readonly string[],
	styleHashes: readonly string[],
): string {
	if (!template.includes(SCRIPT_HASHES_TOKEN) || !template.includes(STYLE_HASHES_TOKEN)) {
		throw new Error("_headers is missing an inline hash placeholder")
	}
	const quotedScripts = scriptHashes.map((hash) => `'${hash}'`).join(" ")
	const quotedStyles = styleHashes.map((hash) => `'${hash}'`).join(" ")
	const filled = template
		.replace(SCRIPT_HASHES_TOKEN, quotedScripts)
		.replace(STYLE_HASHES_TOKEN, quotedStyles)
	if (filled.includes("__INLINE_")) throw new Error("_headers still holds an unreplaced token")
	return filled
}

/** The same frame and type rules on a Worker answer, with a policy that loads nothing. */
export function withSecurityHeaders(response: Response): Response {
	const headers = new Headers(response.headers)
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value)
	headers.set("content-security-policy", WORKER_CONTENT_SECURITY_POLICY)
	const bodyless = response.status === 204 || response.status === 304 || response.body === null
	return new Response(bodyless ? null : response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}
