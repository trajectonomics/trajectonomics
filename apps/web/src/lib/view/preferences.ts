/** The localStorage key of the theme: "light" or "dark". Absent means follow the system. */
export const THEME_KEY = "traj.theme"

/** The localStorage key of hide-amounts: "1" when on, "0" when off. */
export const HIDE_KEY = "traj.hideAmounts"

/** The two Themes. Each is a `data-theme` value on `<html>`. */
export type Theme = "light" | "dark"

/** A stored theme, or null for anything that is not one. */
export function parseTheme(raw: string | null): Theme | null {
	return raw === "light" || raw === "dark" ? raw : null
}

/** The Theme in effect: the stored one, or the system's preference when nothing valid is stored. */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
	return parseTheme(stored) ?? (prefersDark ? "dark" : "light")
}

/** Whether amounts are hidden: only a stored "1" hides them. */
export function parseHideAmounts(raw: string | null): boolean {
	return raw === "1"
}

/** The stored form of hide-amounts. */
export function serializeHideAmounts(hidden: boolean): string {
	return hidden ? "1" : "0"
}
