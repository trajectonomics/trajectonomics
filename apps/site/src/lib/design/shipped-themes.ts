import type { BuildMode } from "../build/mode"

/** The Theme a production build forces on every visitor, whatever the device asks for ([ADR 0016]). */
export const PRODUCTION_THEME = "dark"

/**
 * The Themes every other build ships, in the order a page falls back to them: a preview build asks
 * the device, so the evidence can still capture the light Theme and it cannot rot while it is deferred.
 */
export const PREVIEW_THEMES = Object.freeze(["light", "dark"] as const)

/** The one Theme a production build ships. */
const PRODUCTION_THEMES: readonly [string] = Object.freeze([PRODUCTION_THEME] as const)

/**
 * The Themes one build ships, and always at least one: a production build forces one Theme, every other
 * build follows the device.
 */
export function shippedThemes(mode: BuildMode): readonly [string, ...string[]] {
	return mode === "production" ? PRODUCTION_THEMES : PREVIEW_THEMES
}

/** The Theme a page falls back to, which is the first one the build ships. */
export function fallbackTheme(mode: BuildMode): string {
	return shippedThemes(mode)[0]
}

/** Whether a name is one of the Themes a build ships, so a page's `data-theme` may name it. */
export function isShippedTheme(name: string, themes: readonly string[]): boolean {
	return themes.includes(name)
}
