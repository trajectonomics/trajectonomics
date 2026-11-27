import type { Language } from "../language/language"
import { SITE_ORIGIN } from "../site"
import { faceFor, META_FACE, STATEMENT_FACE } from "./face"
import {
	LOCKUP_HEIGHT,
	MARGIN,
	META_BASELINE,
	META_SIZE,
	ORIGIN_BASELINE,
	RULE_HEIGHT,
	RULE_WIDTH,
	ruleTop,
	SHARE_IMAGE_HEIGHT,
	SHARE_IMAGE_WIDTH,
	STATEMENT_SIZE,
	statementBaselines,
} from "./layout"
import { placedLockup, type ShareLockup } from "./lockup"
import type { ShareColours } from "./share-colours"
import { drawableThai, escapeXml, statementLines } from "./statement"

/** The host a visitor types, without its scheme: the line under the statement. */
export const HOST = SITE_ORIGIN.replace(/^https?:\/\//, "")

/** One page's card, worded and addressed by the caller rather than by a Dictionary. */
export interface ShareComposition {
	readonly language: Language
	readonly languageName: string
	readonly statement: string
	readonly path: string
	readonly host: string
	readonly colours: ShareColours
	readonly lockup: ShareLockup
}

/** One page's share image: the file it is written to, its pixel size, and the SVG that draws it. */
export interface ShareImage {
	readonly path: string
	readonly width: number
	readonly height: number
	readonly svg: string
}

/** One line of the statement, at its own baseline, in the face its own script asks for. */
function lineMarkup(text: string, baseline: number, colour: string): string {
	const face = faceFor(text, STATEMENT_FACE)
	return `<text x="${MARGIN}" y="${baseline}" font-family="${face}" font-size="${STATEMENT_SIZE}" fill="${colour}">${escapeXml(drawableThai(text))}</text>`
}

/** Every line of the statement, laid out upwards from the last baseline, in the Theme's ink. */
function statementMarkup(colours: ShareColours, lines: readonly string[]): string {
	const baselines = statementBaselines(lines.length)
	return lines
		.map((text, index) => lineMarkup(text, baselines[index] ?? 0, colours.foreground))
		.join("")
}

/** One meta run, right-aligned when it is the Language's own name in the corner. */
function metaMarkup(
	text: string,
	x: number,
	baseline: number,
	colour: string,
	end = false,
): string {
	const anchor = end ? ' text-anchor="end"' : ""
	const face = faceFor(text, META_FACE)
	return `<text x="${x}" y="${baseline}"${anchor} font-family="${face}" font-size="${META_SIZE}" fill="${colour}">${escapeXml(drawableThai(text))}</text>`
}

/** One card: the Theme's colours, the brand lockup, a value statement and the host under it. */
export function composeShareImage(input: ShareComposition): ShareImage {
	const { colours } = input
	const lines = statementLines(input.statement)
	const svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_IMAGE_WIDTH}" height="${SHARE_IMAGE_HEIGHT}" viewBox="0 0 ${SHARE_IMAGE_WIDTH} ${SHARE_IMAGE_HEIGHT}">`,
		`<rect width="${SHARE_IMAGE_WIDTH}" height="${SHARE_IMAGE_HEIGHT}" fill="${colours.background}"/>`,
		placedLockup(input.lockup, MARGIN, MARGIN, LOCKUP_HEIGHT, colours.foreground),
		metaMarkup(
			input.languageName,
			SHARE_IMAGE_WIDTH - MARGIN,
			META_BASELINE,
			colours.mutedForeground,
			true,
		),
		`<rect x="${MARGIN}" y="${ruleTop(lines.length)}" width="${RULE_WIDTH}" height="${RULE_HEIGHT}" fill="${colours.accent}"/>`,
		statementMarkup(colours, lines),
		metaMarkup(input.host, MARGIN, ORIGIN_BASELINE, colours.mutedForeground),
		"</svg>",
	].join("\n")
	return Object.freeze({
		path: input.path,
		width: SHARE_IMAGE_WIDTH,
		height: SHARE_IMAGE_HEIGHT,
		svg,
	})
}
