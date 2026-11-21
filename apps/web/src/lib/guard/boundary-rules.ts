import type { LineRule } from "./line-rule"

/** The one file allowed `{@html}`: the brand mark, from the brand package, never a string of the reader's. */
export const HTML_ALLOWLIST: ReadonlySet<string> = new Set([
	"src/components/shell/SiteBrand.svelte",
])

/** Whether a file is in the browser folder, where storage, the address bar and fetch are reached. */
export function isBrowserFile(file: string): boolean {
	return file.startsWith("src/client/")
}

/** A money string becomes a number only in `toChartNumber`, never in a component. */
export const MONEY_RULE: LineRule = {
	rule: "money/number-conversion",
	pattern: /\b(Number|parseFloat|parseInt)\(|\.toFixed\(|\bIntl\.NumberFormat\b/,
	message:
		"A money string is shown as the CLI printed it. A number for a chart mark comes from `toChartNumber` in `src/lib/chart/`.",
}

/** React and Astro belong to apps/docs (React, for Fumadocs) and never to the Dashboard. */
export const FRAMEWORK_RULE: LineRule = {
	rule: "framework/react-or-astro",
	pattern: /["'](react|react-dom)(\/[^"']*)?["']|["']@astrojs\/[^"']*["']/,
	message:
		"The Dashboard is Svelte 5. Write a Svelte component; React and Astro are not imported here.",
}

/** Never render a string as HTML. */
export const HTML_RULE: LineRule = {
	rule: "html/at-html",
	pattern: /\{@html\b/,
	message:
		"Never render a string as HTML. Use text: `{value}`. Only the brand mark in SiteBrand.svelte may use `{@html}`.",
	applies: (file) => !HTML_ALLOWLIST.has(file),
}

const OUTSIDE_CLIENT = (file: string) => !isBrowserFile(file)

/** The browser is reached only from `src/client/`, through a module such as `client/preferences.svelte.ts`. */
export const BROWSER_RULES: readonly LineRule[] = [
	{
		rule: "browser/fetch",
		pattern: /\bfetch\(/,
		message: "Read data through `src/client/snapshot.svelte.ts`. A component never calls `fetch`.",
		applies: OUTSIDE_CLIENT,
	},
	{
		rule: "browser/local-storage",
		pattern: /\blocalStorage\b/,
		message: "Settings are stored by `src/client/preferences.svelte.ts`, not by a component.",
		applies: OUTSIDE_CLIENT,
	},
	{
		rule: "browser/window",
		pattern: /\bwindow\./,
		message:
			"Read the address through `src/client/location.svelte.ts`. A component never reads `window`.",
		applies: OUTSIDE_CLIENT,
	},
	{
		rule: "browser/document",
		pattern: /\bdocument\./,
		message:
			"Touch the page only from `src/client/`. A component renders markup, it does not touch `document`.",
		applies: OUTSIDE_CLIENT,
	},
]
