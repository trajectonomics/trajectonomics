/**
 * The inline script that lets the device choose between the Themes the Site ships, or `undefined`
 * when one Theme paints every device, so no script decides the Theme at runtime
 * ([ADR 0016](../../../docs/adr/0016-the-site-ships-the-dark-theme.md)).
 */
export function themeScript(themes: readonly string[]): string | undefined {
	if (themes.length < 2) return undefined
	const shipped = JSON.stringify(themes)
	return [
		"(() => {",
		`\tconst shipped = ${shipped}`,
		'\tconst asked = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"',
		'\tdocument.documentElement.setAttribute("data-theme", shipped.includes(asked) ? asked : shipped[0])',
		"})()",
	].join("\n")
}
