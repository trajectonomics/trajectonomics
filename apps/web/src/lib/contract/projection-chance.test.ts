import { describe, expect, it } from "bun:test"
import { projectionChance } from "./projection-chance"

/*
 * The CLI's own `projection chance` goldens, parsed by the Dashboard's contract (cli ADR-0063). The
 * goldens are the CLI's bytes, so a field the CLI adds or renames fails here before it reaches the page.
 */
const CLI_FIXTURES = new URL("../../../../cli/src/projection/fixtures/", import.meta.url)

async function golden(name: string): Promise<unknown> {
	return JSON.parse(await Bun.file(new URL(name, CLI_FIXTURES)).text())
}

describe("the projection chance contract against the CLI's goldens", () => {
	it("parses a plan without a spending rule, which has no spending keys", async () => {
		const chance = projectionChance.parse(await golden("chance.output"))
		expect(chance.spendingBands).toBeUndefined()
		expect(chance.lowestYearSpending).toBeUndefined()
		expect(chance.tables.map((table) => table.name)).toEqual(["bands"])
	})

	it("parses a plan with a spending rule: its Bands and its lowest year (cli ADR-0063)", async () => {
		const chance = projectionChance.parse(await golden("chance-spending.output"))
		expect(chance.spendingBands?.map((band) => band.index)).toEqual([0, 1, 2])
		expect(chance.spendingBands?.[0]?.spending.map((entry) => entry.level)).toEqual([
			10, 25, 50, 75, 90,
		])
		expect(chance.lowestYearSpending?.paths).toBe(20)
		expect(chance.lowestYearSpending?.spending).toHaveLength(5)
		expect(chance.tables.map((table) => table.name)).toEqual([
			"bands",
			"spendingBands",
			"lowestYearSpending",
		])
	})

	it("refuses a spending Band the contract does not name", async () => {
		const body = (await golden("chance-spending.output")) as { spendingBands: object[] }
		const bad = { ...body, spendingBands: [{ ...body.spendingBands[0], extra: 1 }] }
		expect(projectionChance.safeParse(bad).success).toBe(false)
	})
})
