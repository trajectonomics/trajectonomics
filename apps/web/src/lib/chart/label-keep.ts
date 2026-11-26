import { graphemes } from "./label-graphemes"
import {
	ellipsisWidth,
	fitted,
	type LabelText,
	prefix,
	type TextMeasure,
	widthOf,
} from "./label-width"

/** A twin's id at the very end of a label, with its brackets. */
function trailingId(label: string): string | null {
	const match = /^(.*?)\s*\(([^()]*)\)$/u.exec(label)
	const id = (match?.[2] ?? "").trim()
	return id === "" ? null : `(${id})`
}

/**
 * The label shortened to `room` with a twin's id kept in view: "Salary and rent from…(salary)". The id may
 * sit at the end or before the rest of a line's words, as in "Salary (salary) into Bank", and only the name
 * is cut. The whole id is kept when it fits; the words after it (" into Bank") only when the whole id fits
 * with them, so a cut id keeps its tail clear ("…from-the-bank)") and never ends at just the closing bracket.
 * An id guessed from an ordinary name's ending brackets is used only when it is short beside the room and
 * part of the name survives, so "Fees (annual, paid in January)" is cut normally. A stem that fits but whose
 * space before the id does not is cut with an ellipsis, never glued on.
 */
export function fittedKeepingSuffix(
	label: string,
	room: number,
	code: boolean,
	keep: string | null = null,
	measure?: TextMeasure,
): LabelText {
	const whole = fitted(label, room, code, measure)
	if (whole.text === label) return whole
	const id = keep ?? trailingId(label)
	if (id === null) return whole
	const at = label.indexOf(id)
	if (at <= 0) return whole
	// A guessed suffix is only worth keeping when it is short and the name still shows; otherwise cut normally.
	if (keep === null && widthOf(id, code, measure) * 3 > room) return whole
	const name = label.slice(0, at).trimEnd()
	const tail = label.slice(at + id.length)
	const kept = keptName(name, id, tail, room, code, measure)
	if (kept !== null) return kept
	const idOnly = keptName(name, id, "", room, code, measure)
	if (idOnly !== null) return idOnly
	// A guessed suffix is only kept beside a name; with no room left for one, the label is cut normally.
	if (keep === null) return whole
	return keptIdAlone(id, room, code, measure) ?? keptIdTail(id, room, code, measure) ?? whole
}

/** The name cut to make room for the id and the words after it, with the id and those words kept. */
function keptName(
	name: string,
	id: string,
	tail: string,
	room: number,
	code: boolean,
	measure?: TextMeasure,
): LabelText | null {
	if (name === "") {
		const text = `${id}${tail}`
		const width = widthOf(text, code, measure)
		return width <= room ? { text, width } : null
	}
	const budget = room - widthOf(id, code, measure) - widthOf(tail, code, measure)
	if (budget <= 0) return null
	const kept = prefix(graphemes(name, code), budget, ellipsisWidth(code, measure), measure)
	if (kept.text === "") return null
	const text = `${kept.text}…${id}${tail}`
	return { text, width: widthOf(text, code, measure) }
}

/** A whole id with no name, the surest way to tell two twins apart when not even a letter of the name fits. */
function keptIdAlone(
	id: string,
	room: number,
	code: boolean,
	measure?: TextMeasure,
): LabelText | null {
	const width = widthOf(id, code, measure)
	return width <= room ? { text: id, width } : null
}

/** The tail of an id too long to fit, without the words after it: "…from-the-bank)". Never just ")". */
function keptIdTail(
	id: string,
	room: number,
	code: boolean,
	measure?: TextMeasure,
): LabelText | null {
	const ellipsis = ellipsisWidth(code, measure)
	if (room <= ellipsis) return null
	const parts = graphemes(id, code)
	let text = ""
	for (let index = parts.length - 1; index >= 0; index--) {
		const part = parts[index]
		if (part === undefined) continue
		const next = `${part.text}${text}`
		if (widthOf(next, code, measure) + ellipsis > room) break
		text = next
	}
	if (text === "" || text === ")") return null
	return { text: `…${text}`, width: ellipsis + widthOf(text, code, measure) }
}
