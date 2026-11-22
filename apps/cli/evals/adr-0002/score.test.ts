import { describe, expect, it } from "bun:test"
import { correctCount, fiMatches, parseAnswer, scoreCorrectness, taxMatches } from "./score"

const expected = { fiMonth: "2043-08", tax2026Baht: 32_450, whatIfFiMonth: "2040-05" }
const block = (json: string): string => `Here is my answer.\n\n\`\`\`json\n${json}\n\`\`\``

describe("parseAnswer", () => {
	it("reads the last fenced json block", () => {
		const text = `${block('{"fiDate":"2040-01-01","tax2026Baht":1,"whatIfFiDate":null}')}\n\n${block(
			'{"fiDate":"2043-08-01","tax2026Baht":32450,"whatIfFiDate":"2040-05-01"}',
		)}`
		expect(parseAnswer(text)).toEqual({
			fiDate: "2043-08-01",
			tax2026Baht: 32_450,
			whatIfFiDate: "2040-05-01",
		})
	})

	it("returns null when there is no block, bad JSON, or a wrong type", () => {
		expect(parseAnswer("no block here")).toBeNull()
		expect(parseAnswer(block("{not json"))).toBeNull()
		expect(parseAnswer(block('{"fiDate":"soon","tax2026Baht":1,"whatIfFiDate":null}'))).toBeNull()
		expect(parseAnswer(block('{"fiDate":null,"tax2026Baht":"x","whatIfFiDate":null}'))).toBeNull()
		expect(parseAnswer(block("[1,2]"))).toBeNull()
	})

	it("allows a null tax only as null, never as a missing figure", () => {
		expect(parseAnswer(block('{"fiDate":null,"tax2026Baht":null,"whatIfFiDate":null}'))).toEqual({
			fiDate: null,
			tax2026Baht: null,
			whatIfFiDate: null,
		})
	})
})

describe("tolerances", () => {
	it("accepts an FI month one month either side and rejects two", () => {
		expect(fiMatches("2043-07-01", "2043-08")).toBe(true)
		expect(fiMatches("2043-09-01", "2043-08")).toBe(true)
		expect(fiMatches("2043-10-01", "2043-08")).toBe(false)
	})

	it("matches a null FI only with a null oracle", () => {
		expect(fiMatches(null, null)).toBe(true)
		expect(fiMatches(null, "2043-08")).toBe(false)
		expect(fiMatches("2043-08-01", null)).toBe(false)
	})

	it("accepts tax within one baht and rejects more", () => {
		expect(taxMatches(32_451, 32_450)).toBe(true)
		expect(taxMatches(32_452, 32_450)).toBe(false)
		expect(taxMatches(null, 32_450)).toBe(false)
	})
})

describe("scoreCorrectness", () => {
	it("counts all three correct for a matching answer", () => {
		const text = block('{"fiDate":"2043-08-01","tax2026Baht":32450,"whatIfFiDate":"2040-05-01"}')
		const score = scoreCorrectness(text, expected)
		expect(score).toEqual({ parsed: true, fi: true, tax: true, whatIf: true })
		expect(correctCount(score)).toBe(3)
	})

	it("marks an unparsed answer wrong on every question", () => {
		expect(scoreCorrectness("nothing", expected)).toEqual({
			parsed: false,
			fi: false,
			tax: false,
			whatIf: false,
		})
	})

	it("scores each question separately", () => {
		const text = block('{"fiDate":"2030-01-01","tax2026Baht":32450,"whatIfFiDate":"2040-05-01"}')
		const score = scoreCorrectness(text, expected)
		expect(score).toEqual({ parsed: true, fi: false, tax: true, whatIf: true })
		expect(correctCount(score)).toBe(2)
	})
})
