/**
 * The value one Theme role holds in a built Theme stylesheet, such as the background a browser
 * paints its bar with. The auth pages read colours from the brand package and write none of their own.
 */
export function themeRole(css: string, role: string): string {
	const pattern = new RegExp(`--ds-color-${role}:\\s*([^;]+);`)
	const value = pattern.exec(css)?.[1]?.trim()
	if (value === undefined || value === "") {
		throw new Error(`themeRole: the Theme stylesheet declares no --ds-color-${role}`)
	}
	return value
}
