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

const MEASURES = [estimated, spaced, mixed] as const

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

describe("the measured prefix", () => {
	test("is the same one the linear walk keeps, for every label, room and measure", () => {
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
