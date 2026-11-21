import type { DesignTokens } from "./tokens"

/** The Semantic Token Role the browser's own bar carries: the surface behind the fixed header. */
const BAR_ROLE = "background"

/** One browser bar paint: the shipped Theme it follows, its device-scheme query, and its colour. */
export interface ThemePaint {
	/** The shipped Theme this paint is read from. */
	readonly theme: string
	/**
	 * The device-scheme query that follows this Theme, written only when the Site ships more than one:
	 * one shipped Theme paints every device, so its paint carries no query at all.
	 */
	readonly media: string | undefined
	/** The published colour of the Theme's `background` role. */
	readonly colour: string
}

/** The media query that follows one device scheme, or none when one Theme paints every device. */
function mediaOf(theme: string, shippedCount: number): string | undefined {
	return shippedCount > 1 ? `(prefers-color-scheme: ${theme})` : undefined
}

/** One paint per shipped Theme, at that Theme's published `background` colour. */
export function themePaints(
	tokens: DesignTokens,
	themes: readonly string[],
): readonly ThemePaint[] {
	return Object.freeze(
		themes.flatMap((shipped) => {
			const theme = tokens.themes.find((published) => published.name === shipped)
			const colour = theme?.colours[BAR_ROLE]
			if (colour === undefined) return []
			return [Object.freeze({ theme: shipped, media: mediaOf(shipped, themes.length), colour })]
		}),
	)
}
