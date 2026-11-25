import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import { DEMO_HEADER_PATTERN, HEADERS_FILE } from "./demo"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { headersFor, parseHeadersFile } from "./headers-file"

/** The header that scopes the Demo's pages and assets. */
const CONTENT_SECURITY_POLICY = "content-security-policy"

/** The directives a Demo policy sets to exactly one source list. */
const EXACT = [
	["connect-src", "'self'"],
	["style-src-attr", "'unsafe-inline'"],
	["form-action", "'none'"],
	["base-uri", "'self'"],
	["frame-ancestors", "'none'"],
] as const

/** The directives that may name the Site's own origin and nothing else. */
const SELF_ONLY = ["default-src", "img-src", "font-src", "style-src"] as const

/** The directive that may also allow the inline script the hosted build ships. */
const SELF_OR_INLINE = ["script-src"] as const

/** The directives a Content-Security-Policy names, lower-cased, with their source lists. */
function directivesOf(policy: string): ReadonlyMap<string, readonly string[]> {
	const directives = new Map<string, readonly string[]>()
	for (const part of policy.split(";")) {
		const tokens = part.trim().split(/\s+/).filter(Boolean)
		const name = tokens[0]?.toLowerCase()
		if (name !== undefined) directives.set(name, tokens.slice(1))
	}
	return directives
}

/** The first directive whose source list is not exactly the one the Demo needs. */
function exactProblem(directives: ReadonlyMap<string, readonly string[]>): string | undefined {
	for (const [name, expected] of EXACT) {
		const value = directives.get(name)
		if (value === undefined) return `names no ${name}.`
		if (value.join(" ") !== expected) {
			return `sets ${name} to ${value.join(" ") || "nothing"}, not ${expected}.`
		}
	}
	return undefined
}

/** The first source in these directives that is not the Site's own origin, or inline code. */
function sourceProblem(
	directives: ReadonlyMap<string, readonly string[]>,
	names: readonly string[],
	allowed: readonly string[],
): string | undefined {
	for (const name of names) {
		const value = directives.get(name)
		if (value === undefined) return `names no ${name}.`
		const extra = value.find((source) => !allowed.includes(source))
		if (extra !== undefined) return `allows ${extra} in ${name}.`
	}
	return undefined
}

/** The first way a Demo policy allows more than the Demo build needs, or `undefined` when it does not. */
function policyProblem(policy: string): string | undefined {
	const directives = directivesOf(policy)
	return (
		exactProblem(directives) ??
		sourceProblem(directives, SELF_ONLY, ["'self'"]) ??
		sourceProblem(directives, SELF_OR_INLINE, ["'self'", "'unsafe-inline'"])
	)
}

/**
 * The Site's `_headers` file sets a Content-Security-Policy for `/demo/*`, and that policy allows
 * only the Site's own origin plus the inline script and the inline style attributes the hosted
 * build ships; no page carries an inline `<style>` element, so `style-src` stays `'self'` only.
 */
export function checkDemoHeaders(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const headers = fileAt(files, HEADERS_FILE)
	if (headers === undefined) return [missing(`no ${HEADERS_FILE} file sets a policy.`)]
	const block = headersFor(parseHeadersFile(headers.content), DEMO_HEADER_PATTERN)
	if (block === undefined) return [missing(`no block matches ${DEMO_HEADER_PATTERN}.`)]
	const policy = block.get(CONTENT_SECURITY_POLICY)
	if (policy === undefined) {
		return [
			buildFailure(
				"DEMO_HEADERS_CSP_MISSING",
				HEADERS_FILE,
				`the ${DEMO_HEADER_PATTERN} block sets no ${CONTENT_SECURITY_POLICY}.`,
			),
		]
	}
	const problem = policyProblem(policy)
	if (problem === undefined) return []
	return [
		buildFailure(
			"DEMO_HEADERS_CSP_WRONG",
			HEADERS_FILE,
			`the ${DEMO_HEADER_PATTERN} policy ${problem}`,
		),
	]
}

/** The failure for a headers file that sets nothing for the Demo. */
function missing(message: string): BuildFailure {
	return buildFailure("DEMO_HEADERS_MISSING", HEADERS_FILE, message)
}
