import type { DesignTokens } from "./tokens"

/** The device schemes `prefers-color-scheme` names, which are also the names a Theme is published under. */
const SCHEMES = ["light", "dark"] as const

/** The Semantic Token Role the browser's own bar carries: the surface behind the fixed header. */
const BAR_ROLE = "background"

/** One browser bar paint: the published Theme it follows, the device scheme's media query, and its colour. */
export interface ThemePaint {
	/** The published Theme the device scheme names: `light` or `dark`. */
	readonly theme: string
	/** The media query that follows that device scheme. */
	readonly media: string
	/** The published colour of the Theme's `background` role. */
	readonly colour: string
}

/** One paint per published Theme a device scheme names, at that Theme's `background` colour. */
export function themePaints(tokens: DesignTokens): readonly ThemePaint[] {
	return Object.freeze(
		SCHEMES.flatMap((scheme) => {
			const theme = tokens.themes.find((published) => published.name === scheme)
			const colour = theme?.colours[BAR_ROLE]
			if (colour === undefined) return []
			return [Object.freeze({ theme: scheme, media: `(prefers-color-scheme: ${scheme})`, colour })]
		}),
	)
}
