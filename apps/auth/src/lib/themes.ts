/** The Themes the auth pages ship, in fallback order: the first holds when JavaScript is off. */
export const THEMES = Object.freeze(["light", "dark"] as const)

/** One Theme the pages ship. */
export type Theme = (typeof THEMES)[number]

/** The Theme a page carries before any script runs, and keeps when JavaScript is off. */
export const FALLBACK_THEME: Theme = THEMES[0]

/**
 * The inline script that lets the device choose the Theme: it reads `prefers-color-scheme` once on
 * load and again whenever the device changes scheme. There is no toggle and no stored choice.
 */
export function themeScript(): string {
	return [
		"(() => {",
		'\tconst query = window.matchMedia("(prefers-color-scheme: dark)")',
		'\tconst apply = () => document.documentElement.setAttribute("data-theme", query.matches ? "dark" : "light")',
		"\tapply()",
		'\tquery.addEventListener("change", apply)',
		"})()",
	].join("\n")
}
