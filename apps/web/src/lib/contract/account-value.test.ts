import { describe, expect, it } from "bun:test"
import { accountValue, accountValues } from "./account-value"

/*
 * The CLI's own `account value` goldens, parsed by the Dashboard's contract (cli ADR-0072). The
 * goldens are the CLI's bytes, so a field the CLI adds or renames fails here before it reaches a page.
 */
const CLI_FIXTURES = new URL("../../../../cli/src/account/value/fixtures/", import.meta.url)

async function golden(name: string): Promise<unknown> {
	return JSON.parse(await Bun.file(new URL(name, CLI_FIXTURES)).text())
}

describe("the account value contract against the CLI's goldens", () => {
	it("decodes one value: the figures, the written transaction and the later-valuation note", async () => {
		const result = accountValue.parse(await golden("value.output"))
		expect(result).toMatchObject({
			status: "added",
			date: "2026-03-01",
			before: "0.00",
			value: "1000.00",
			difference: "1000.00",
		})
		expect(result.transaction?.memo).toBe("Valued at 1000.00")
		expect(result.notes).toHaveLength(1)
	})

	it("decodes a batch in applied order, an unchanged entry with no transaction included", async () => {
		const result = accountValues.parse(await golden("values.output"))
		expect(result.values.map((row) => [row.date, row.status, row.index])).toEqual([
			["2026-01-10", "unchanged", 1],
			["2026-02-10", "added", 2],
			["2026-03-01", "added", 0],
		])
		expect(result.values[0]?.transaction).toBeNull()
		expect(result.counts).toEqual({ added: 2, unchanged: 1 })
	})

	it("refuses a field the CLI does not state, so a rename cannot pass silently", async () => {
		const result = accountValue.safeParse({
			...((await golden("value.output")) as object),
			extra: 1,
		})
		expect(result.success).toBe(false)
	})
})
