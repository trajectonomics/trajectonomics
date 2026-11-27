import type { Component } from "svelte"
import { createRawSnippet } from "svelte"

/** The attributes a person reads or hears: a link's and a chart's labels, a tooltip, and a field's placeholder. */
const ATTRIBUTE = /(?:aria-label|title|placeholder)="([^"]*)"/g

/** The text a person reads, without the tags, the code a page quotes, or the CLI's own strings shown as data. */
export function pageText(body: string): string {
	return body
		.replace(/<code\b[\s\S]*?<\/code>/g, " ")
		.replace(/<(li|p|span|div)\b[^>]*\bdata-cli\b[^>]*>[\s\S]*?<\/\1>/g, " ")
		.replace(/<[^>]+>/g, " ")
}

/** The values of the attributes a person reads or hears. */
function pageAttributes(body: string): string {
	return [...body.matchAll(ATTRIBUTE)].map((match) => match[1] ?? "").join(" ")
}

/** Everything a page says to a person, in its text or in an attribute. */
export function visible(body: string): string {
	return `${pageText(body)} ${pageAttributes(body)}`
}

/** The engine's words a page must not say, with the plain words that replace them. */
const BANNED_WORDS: readonly { readonly word: RegExp; readonly name: string }[] = [
	{ word: /seeded/i, name: "seeded" },
	{ word: /as-of terms/i, name: "As-of terms" },
	{ word: /nominal/i, name: "Nominal" },
	{ word: /snapshot/i, name: "Snapshot" },
	{ word: /levy /i, name: "Levy " },
	{ word: /success share/i, name: "success share" },
	// Case-sensitive: this names the eyebrow exactly, and a plan may be called "base".
	{ word: /Plan base/, name: "Plan base" },
]

/** What the guard forbids in one page: the CLI's word for a Plan, an ISO date, and each engine word. */
export function problemsOf(body: string): string[] {
	const words = visible(body)
	const found: string[] = []
	if (/scenario/i.test(words)) found.push("Scenario")
	if (/\b\d{4}-\d{2}(-\d{2})?\b/.test(words)) found.push("ISO date")
	for (const banned of BANNED_WORDS) if (banned.word.test(words)) found.push(banned.name)
	return found
}

// biome-ignore lint/suspicious/noExplicitAny: a test renders pages whose props differ.
type AnyPage = Component<any>

/** A page of the Dashboard: its path under `src/routes/`, and the page component that renders it. */
export interface RoutePage {
	readonly path: string
	readonly page: AnyPage
}

/** Every page under `src/routes/`, so a page added there is guarded without an edit here. */
export async function pagesOfRoutes(): Promise<readonly RoutePage[]> {
	const files = [...new Bun.Glob("**/+page.svelte").scanSync({ cwd: import.meta.dir })].sort()
	const pages = files.map(async (file) => {
		const dir = file.slice(0, -"/+page.svelte".length)
		const path = dir === "" ? "/" : `/${dir}/`
		const imported = (await import(`${import.meta.dir}/${file}`)) as { default: AnyPage }
		return { path, page: imported.default }
	})
	return Promise.all(pages)
}

/** The page's place in the shell, so a test can render the layout around it. */
export const pageSnippet = createRawSnippet(() => ({ render: () => "<p>the page</p>" }))
