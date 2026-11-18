import { describe, expect, it } from "bun:test"
import { escapeXml, STATEMENT_LINE_CHARS, statementLines } from "./statement"

describe("the lines a share image's statement is set on", () => {
	it("keeps a statement that fits on one line on one line", () => {
		expect(statementLines("Deterministic layers for")).toEqual(["Deterministic layers for"])
	})

	it("breaks at a space and never inside a word", () => {
		expect(statementLines("one two three four", 9)).toEqual(["one two", "three", "four"])
	})

	it("never lets a line carry more characters than the budget", () => {
		const text = "traj is a free, open-source financial simulation tool for AI agents"
		for (const line of statementLines(text))
			expect(line.length).toBeLessThanOrEqual(STATEMENT_LINE_CHARS)
	})

	it("keeps a word longer than the budget alone on its line rather than breaking it", () => {
		const word = "คือเครื่องมือจำลองการเงินโอเพนซอร์สฟรีสำหรับ"
		expect(statementLines(`traj ${word} CLI`, 20)).toEqual(["traj", word, "CLI"])
	})

	it("keeps every word of a Thai statement, in order, and drops the whitespace runs", () => {
		const text = "traj คือเครื่องมือจำลองการเงิน  ไม่มีแดชบอร์ด"
		expect(statementLines(text).join(" ")).toBe("traj คือเครื่องมือจำลองการเงิน ไม่มีแดชบอร์ด")
	})

	it("reads an empty statement as no lines", () => {
		expect(statementLines("   ")).toEqual([])
	})
})

describe("the characters XML cannot read", () => {
	it("escapes the five characters a sentence can carry", () => {
		expect(escapeXml("a & b < c > d \" e ' f")).toBe("a &amp; b &lt; c &gt; d &quot; e &apos; f")
	})

	it("leaves Thai text exactly as the Dictionary writes it", () => {
		expect(escapeXml("ไม่มีแดชบอร์ด")).toBe("ไม่มีแดชบอร์ด")
	})
})
