import type { Redirect } from "../moved-posts"
import { BLOG_BASE } from "../site"
import { type BuiltFile, type Failure, failure } from "./failures"

/** The Workers Static Assets redirect table at the build root. */
const REDIRECTS_FILE = "_redirects"

/** One parsed line from `_redirects`. */
interface ParsedRule {
	readonly from: string
	readonly to: string
	readonly status: string
}

/** The build path a public path under the blog's base names, or `undefined` when it is outside it. */
export function buildPathOf(pathname: string): string | undefined {
	if (pathname === BLOG_BASE) return ""
	if (!pathname.startsWith(`${BLOG_BASE}/`)) return undefined
	return pathname.slice(BLOG_BASE.length + 1)
}

/** The built HTML file a public path under the blog's base resolves to, or `undefined`. */
function pageFileOf(pathname: string): string | undefined {
	const path = buildPathOf(pathname)
	if (path === undefined) return undefined
	return path === "" || path.endsWith("/") ? `${path}index.html` : `${path}/index.html`
}

/** Every redirect line in `_redirects`: `from to status`. */
function parsedRedirects(text: string): readonly ParsedRule[] {
	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line !== "" && !line.startsWith("#"))
		.flatMap((line) => {
			const [from, to, status] = line.split(/\s+/)
			return from !== undefined && to !== undefined && status !== undefined
				? [{ from, to, status }]
				: []
		})
}

/** Checks one redirect rule: its target exists in the build and its source does not. */
function checkRule(rule: ParsedRule, built: ReadonlySet<string>): Failure[] {
	const failures: Failure[] = []
	const targetFile = pageFileOf(rule.to)
	if (targetFile === undefined || !built.has(targetFile)) {
		failures.push(
			failure(
				"redirect-target-unbuilt",
				REDIRECTS_FILE,
				`redirects ${rule.from} to ${rule.to}, which the build lacks`,
			),
		)
	}
	const sourceFile = pageFileOf(rule.from)
	if (sourceFile !== undefined && built.has(sourceFile)) {
		failures.push(
			failure(
				"redirect-source-built",
				REDIRECTS_FILE,
				`redirects ${rule.from}, which is still a built page`,
			),
		)
	}
	return failures
}

/** Every expected 301 rule missing from the emitted `_redirects` file. */
function missingRules(rules: readonly ParsedRule[], expected: readonly Redirect[]): Failure[] {
	const present = new Set(rules.map((rule) => `${rule.from} ${rule.to} ${rule.status}`))
	return expected
		.filter((rule) => !present.has(`${rule.from} ${rule.to} 301`))
		.map((rule) =>
			failure(
				"redirect-rule-missing",
				REDIRECTS_FILE,
				`is missing the 301 redirect ${rule.from} -> ${rule.to}`,
			),
		)
}

/** Every expected redirect is emitted, points to a built page, and does not collide with one. */
export function checkRedirects(
	files: readonly BuiltFile[],
	built: ReadonlySet<string>,
	expected: readonly Redirect[],
): Failure[] {
	const file = files.find((entry) => entry.path === REDIRECTS_FILE)
	if (file === undefined) {
		return expected.length === 0
			? []
			: [
					failure(
						"redirects-missing",
						REDIRECTS_FILE,
						"is missing, so moved Posts answer 404 instead of redirecting",
					),
				]
	}
	const rules = parsedRedirects(file.text ?? "")
	return [...rules.flatMap((rule) => checkRule(rule, built)), ...missingRules(rules, expected)]
}
