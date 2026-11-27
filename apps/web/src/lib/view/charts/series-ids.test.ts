import { describe, expect, test } from "bun:test"
import { savedName } from "./edit"
import { seriesCategory, seriesLabelId, seriesWords } from "./series-ids"

describe("words from a series id", () => {
	test("a cash id that is not a list, as a hand-edited chart file may hold, reads words and never throws", () => {
		for (const id of ["cash:5", "cash:{}", 'cash:"rent"', "cash:not json"]) {
			expect(seriesLabelId(id)).toBe("no category")
			expect(seriesCategory(id)).toBeNull()
			expect(seriesWords(id)).toBe("no category")
		}
	})

	test("a new chart naming a removed series is saved under words, never its key", () => {
		const gone = JSON.stringify(["expense", "gone", null, null])
		const name = savedName("", [`cash:${gone}`], new Map())
		expect(name).toContain("gone")
		expect(name).not.toContain("cash:")
		expect(name).not.toContain("[")
	})
})
