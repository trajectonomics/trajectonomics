import { PRODUCTION_THEME } from "../design/shipped-themes"
import type { DesignTokens } from "../design/tokens"

/** The colours a share image paints with, each read from a Semantic Token Role of the shipped Theme. */
export interface ShareColours {
	readonly background: string
	readonly foreground: string
	readonly mutedForeground: string
	readonly accent: string
}

/** The ways a share image's colours can be rejected: the Theme is missing, or a role it names is. */
export type ShareColourErrorCode = "SHARE_THEME_MISSING" | "SHARE_ROLE_MISSING"

/** A rejected colour lookup: the code names the rule, `field` the Theme or the role that broke it. */
export interface ShareColourError extends Error {
	readonly code: ShareColourErrorCode
	readonly field: string
}

/** The rejection of one colour lookup, frozen so a caller cannot edit the verdict. */
function shareColourError(
	code: ShareColourErrorCode,
	field: string,
	message: string,
): ShareColourError {
	return Object.freeze(Object.assign(new Error(message), { code, field }))
}

/** The colour of one role, or a rejection naming the role the pinned Theme publishes no colour for. */
function colourOf(tokens: DesignTokens, role: string): string {
	const theme = tokens.themes.find((candidate) => candidate.name === PRODUCTION_THEME)
	if (theme === undefined) {
		throw shareColourError(
			"SHARE_THEME_MISSING",
			PRODUCTION_THEME,
			`the pinned Theme CSS publishes no "${PRODUCTION_THEME}" Theme, so the share image has no colours.`,
		)
	}
	const colour = theme.colours[role]
	if (colour === undefined) {
		throw shareColourError(
			"SHARE_ROLE_MISSING",
			role,
			`the "${PRODUCTION_THEME}" Theme publishes no "${role}" role, which the share image paints with.`,
		)
	}
	return colour
}

/** The colours a share image paints with, read from the one Theme a production build ships (ADR 0016). */
export function shareColours(tokens: DesignTokens): ShareColours {
	return Object.freeze({
		background: colourOf(tokens, "background"),
		foreground: colourOf(tokens, "foreground"),
		mutedForeground: colourOf(tokens, "muted-foreground"),
		accent: colourOf(tokens, "accent"),
	})
}
