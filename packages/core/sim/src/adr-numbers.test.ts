import { describe, expect, it } from "bun:test"
import { readdirSync } from "node:fs"

const dir = new URL("../docs/adr/", import.meta.url)

function numberOf(file: string): string | undefined {
	return /^(\d{4})-.+\.md$/.exec(file)?.[1]
}

/** The ADR numbers that more than one of `files` carries, each with its files. */
function shared(files: readonly string[]): Record<string, string[]> {
	const byNumber: Record<string, string[]> = {}
	for (const file of files) {
		const n = numberOf(file)
		if (n !== undefined) byNumber[n] = [...(byNumber[n] ?? []), file]
	}
	return Object.fromEntries(Object.entries(byNumber).filter(([, f]) => f.length > 1))
}

describe("ADR numbers", () => {
	it("gives every file in docs/adr its own number", () => {
		expect(shared(readdirSync(dir))).toEqual({})
	})

	it("reports two files that share a number", () => {
		const files = ["0007-a.md", "0007-b.md", "0008-c.md"]
		expect(shared(files)).toEqual({ "0007": ["0007-a.md", "0007-b.md"] })
	})
})
