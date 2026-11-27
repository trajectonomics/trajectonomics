/**
 * The colour of a plan's mark and of its bars, dots and lines.
 *
 * A chromatic value is the Simple Icons brand colour for the same mark `plan-logos` draws,
 * read on 2026-11-27. It lives in this module, not in a stylesheet: the site's chrome paints
 * only from Theme roles, and a third party's published colour is data applied through
 * `--plan-ink`. OpenCode and Cursor publish a black mark, so they use the theme foreground
 * and stay visible on both Themes. Antigravity draws the Gemini mark, so it uses Gemini's colour.
 */
const FOREGROUND = "var(--ds-color-foreground)"

const PLAN_COLOUR: Readonly<Record<string, string>> = Object.freeze({
	claude: "#D97757",
	"opencode-go": FOREGROUND,
	"opencode-free": FOREGROUND,
	"command-code": FOREGROUND,
	antigravity: "#8E75B2",
	cursor: FOREGROUND,
	meta: "#0467DF",
	mistral: "#FA520F",
})

/** The CSS colour for one plan's icon and series. An unknown plan uses the theme foreground. */
export function planColour(plan: string): string {
	return PLAN_COLOUR[plan] ?? FOREGROUND
}
