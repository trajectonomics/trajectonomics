import { describe, expect, test } from "bun:test"
import { colourLiterals } from "./colour-literals"
import { SERIES_CUES, seriesCue } from "./series-style"

describe("a series cue", () => {
	test("has a colour, a dash or a marker shape for every plan", () => {
		for (const cue of SERIES_CUES) {
			expect(cue.colour.length).toBeGreaterThan(0)
			expect(cue.dash === null || cue.dash.length > 0).toBe(true)
			expect(cue.shape.length).toBeGreaterThan(0)
		}
	})

	test("paints only from Theme roles", () => {
		for (const cue of SERIES_CUES) expect(colourLiterals(cue.colour)).toEqual([])
	})

	test("gives each of the eight plans a different combination", () => {
		const combinations = SERIES_CUES.map((cue) => `${cue.colour}|${cue.dash}|${cue.shape}`)
		expect(new Set(combinations).size).toBe(SERIES_CUES.length)
	})

	test("cycles for a ninth plan", () => {
		expect(seriesCue(8)).toEqual(SERIES_CUES[0] as (typeof SERIES_CUES)[number])
	})
})
