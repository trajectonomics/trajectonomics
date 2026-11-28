import { faceFor, META_FACE, STATEMENT_FACE } from "./face"
import { META_SIZE } from "./layout"
import { drawableThai, escapeXml } from "./statement"

/** One run of a share image's text, in the face its own script asks for. */
export function textMarkup(
	text: string,
	x: number,
	y: number,
	size: number,
	colour: string,
	face: string,
	attributes = "",
): string {
	return `<text x="${x}" y="${y}"${attributes} font-family="${face}" font-size="${size}" fill="${colour}">${escapeXml(drawableThai(text))}</text>`
}

/** One meta-layer run, in the Thai face when it carries Thai, right-aligned when asked. */
export function metaText(
	text: string,
	x: number,
	y: number,
	colour: string,
	end = false,
	size = META_SIZE,
): string {
	return textMarkup(
		text,
		x,
		y,
		size,
		colour,
		faceFor(text, META_FACE),
		end ? ' text-anchor="end"' : "",
	)
}

/** One statement-face run, in the Thai face when it carries Thai. */
export function statementText(
	text: string,
	x: number,
	y: number,
	size: number,
	colour: string,
	attributes = "",
): string {
	return textMarkup(text, x, y, size, colour, faceFor(text, STATEMENT_FACE), attributes)
}
