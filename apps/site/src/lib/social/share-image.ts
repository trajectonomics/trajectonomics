import type { Dictionary } from "../language/dictionary"
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
import { shareImagePath } from "./share-advert"
import type { ShareColours } from "./share-colours"
import { escapeXml, statementLines } from "./statement"

/** The most a share image may weigh, in bytes, so a card is fetched by a crawler and not by a page. */
export const SHARE_IMAGE_MAX_BYTES = 100_000

/** The host a visitor types, without its scheme: the line under the statement. */
const HOST = SITE_ORIGIN.replace(/^https?:\/\//, "")

/** Everything one Language's share image is composed from: its words, its colours, and the lockup. */
export interface ShareImageInput {
	readonly language: Language
	readonly dictionary: Dictionary
	readonly colours: ShareColours
	readonly lockup: ShareLockup
}

/** One Language's share image: the file it is written to, its pixel size, and the SVG that draws it. */
export interface ShareImage {
	readonly path: string
	readonly width: number
	readonly height: number
	readonly svg: string
}

/** One line of the statement, at its own baseline, in the face its own script asks for. */
function lineMarkup(text: string, baseline: number, colour: string): string {
	const face = faceFor(text, STATEMENT_FACE)
	return `<text x="${MARGIN}" y="${baseline}" font-family="${face}" font-size="${STATEMENT_SIZE}" fill="${colour}">${escapeXml(text)}</text>`
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
	return `<text x="${x}" y="${baseline}"${anchor} font-family="${face}" font-size="${META_SIZE}" fill="${colour}">${escapeXml(text)}</text>`
}

/**
 * One Language's share image: the Theme's own colours, the brand lockup, the Language's value statement
 * and the host under it, at the size every share sheet cuts a large card to.
 */
export function shareImage(input: ShareImageInput): ShareImage {
	const { colours, language } = input
	const lines = statementLines(input.dictionary.description)
	const svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_IMAGE_WIDTH}" height="${SHARE_IMAGE_HEIGHT}" viewBox="0 0 ${SHARE_IMAGE_WIDTH} ${SHARE_IMAGE_HEIGHT}">`,
		`<rect width="${SHARE_IMAGE_WIDTH}" height="${SHARE_IMAGE_HEIGHT}" fill="${colours.background}"/>`,
		placedLockup(input.lockup, MARGIN, MARGIN, LOCKUP_HEIGHT, colours.foreground),
		metaMarkup(
			input.dictionary.languageName,
			SHARE_IMAGE_WIDTH - MARGIN,
			META_BASELINE,
			colours.mutedForeground,
			true,
		),
		`<rect x="${MARGIN}" y="${ruleTop(lines.length)}" width="${RULE_WIDTH}" height="${RULE_HEIGHT}" fill="${colours.accent}"/>`,
		statementMarkup(colours, lines),
		metaMarkup(HOST, MARGIN, ORIGIN_BASELINE, colours.mutedForeground),
		"</svg>",
	].join("\n")
	return Object.freeze({
		path: shareImagePath(language),
		width: SHARE_IMAGE_WIDTH,
		height: SHARE_IMAGE_HEIGHT,
		svg,
	})
}
