import { describe, expect, test } from "bun:test"
import { graphemes } from "./label-graphemes"
import { fitted, type TextMeasure } from "./label-width"

const LABELS = [
	"",
	"salary",
	"SUBSCRIPTIONS",
	"NETFLIX AND HBO",
	"housing, utilities and the shared apartment fees",
	"the name ends with a space   ",
	"  and starts with two",
	"Paid out by the long named retirement account",
	"家賃と生活費と教育費と医療費と交際費の合計額です",
	"コーヒーメーカーのサービス・カードローン返済用",
	"ЖИЛИЩНЫЕ ШКОЛЬНЫЕ ЩЕДРЫЕ ШТРАФЫ",
	"㈱".repeat(30),
	"W".repeat(80),
	"👨‍👩‍👧‍👦".repeat(10),
	"เบี้ยประกันภัยบ้านและที่ดินน้ำท่วม",
	"ẪỖ BẢO HIỂM NHÀ",
	"Saving (a0-from-the-bank) into Bank",
] as const

const ROOMS = [0, 1, 6, 12, 20, 40, 64, 80, 100, 136, 160, 202, 214, 260] as const

/** A measure as the estimate draws: each grapheme's width, so it grows with every grapheme added. */
const estimated: TextMeasure = (text) =>
	graphemes(text, false).reduce((sum, part) => sum + part.width, 0)

/** A measured font with letter and word spacing, as a person's stylesheet adds (#679). */
const spaced: TextMeasure = (text) =>
	text.length * 6.8 + text.replace(/[^ ]/g, "").length * 1.92 + (text === "…" ? 12 : 0)

/** A width map where a capital is wider than a space, as a real face draws them. */
const mixed: TextMeasure = (text) => {
	let width = 0
	for (const character of text) {
		if (character === " ") width += 4
		else if (character === "…") width += 12
		else if (/[A-Z]/.test(character)) width += 9
		else width += 7
	}
	return width
}

/**
 * A face that joins its letters, as Arabic does: a longer prefix can paint narrower, so a prefix's width
 * falls as it grows and the binary search is no longer the linear walk's equal.
 */
const joining: TextMeasure = (text) => {
	if (text === "…") return 5
	return [0, 60, 10, 10, 60][graphemes(text, false).length] ?? 70
}

const MEASURES = [estimated, spaced, mixed] as const

/** Every measure the fitted prefix is held to, including the one whose prefix can narrow. */
const ALL_MEASURES = [estimated, spaced, mixed, joining] as const

/** The linear walk the binary search replaces: the reference every result is held to. */
function walked(
	label: string,
	room: number,
	measure: TextMeasure,
): { text: string; width: number } {
	const whole = measure(label)
	if (whole <= room) return { text: label, width: whole }
	const ellipsis = measure("…")
	const parts = graphemes(label, false)
	let text = ""
	let kept = ""
	for (const part of parts) {
		const next = `${text}${part.text}`
		const candidate = next.trimEnd()
		if (measure(candidate) + ellipsis > room) break
		text = next
		kept = candidate
	}
	if (kept === "") return { text: "", width: measure("") }
	return { text: `${kept}…`, width: measure(kept) + ellipsis }
}

/** A label whose joined prefix narrows: three letters fit where the walk's first one does not. */
const JOINED = "ابتث"

/** Asserts a fitted label stays inside its room and is the label's prefix, cut with an ellipsis or whole. */
function expectFits(label: string, room: number, measure: TextMeasure): void {
	const kept = fitted(label, room, false, measure)
	const said = `${label} at ${room}`
	expect(kept.width, said).toBeLessThanOrEqual(room)
	const cut = kept.text.endsWith("…")
	const prefix = cut ? kept.text.slice(0, -1) : kept.text
	expect(label.startsWith(prefix), said).toBe(true)
	expect(kept.width, said).toBe(measure(prefix) + (cut ? measure("…") : 0))
}

describe("the measured prefix", () => {
	test("is the one the linear walk keeps when every grapheme only adds width", () => {
		for (const measure of MEASURES) {
			for (const label of LABELS) {
				for (const room of ROOMS) {
					expect(fitted(label, room, false, measure), `${label} at ${room}`).toEqual(
						walked(label, room, measure),
					)
				}
			}
		}
	})

	test("never overflows, even where a joined prefix narrows as it grows", () => {
		for (const measure of ALL_MEASURES) {
			for (const label of [...LABELS, JOINED]) {
				for (const room of ROOMS) expectFits(label, room, measure)
			}
		}
	})

	test("may keep more text than the walk where a joined prefix narrows", () => {
		expect(fitted(JOINED, 30, false, joining).text).toBe("ابت…")
		expect(walked(JOINED, 30, joining).text).toBe("")
	})

	test("halves the candidates instead of walking them", () => {
		let measured = 0
		const counting: TextMeasure = (text) => {
			measured += 1
			return mixed(text)
		}
		expect(fitted("W".repeat(80), 200, false, counting).text).toMatch(/^W+…$/)
		expect(measured).toBeLessThan(20)
	})
})
