import { describe, expect, it } from "bun:test"
import { projectionChance } from "./projection-chance"
import { projectionPath } from "./projection-path"

/*
 * The CLI's own `projection path` golden, parsed by the Dashboard's contract (cli ADR-0069). The golden
 * is the CLI's bytes, so a field the CLI adds or renames fails here before it reaches the page.
 */
const CLI_FIXTURES = new URL("../../../../cli/src/projection/fixtures/", import.meta.url)

async function golden(name: string): Promise<unknown> {
	return JSON.parse(await Bun.file(new URL(name, CLI_FIXTURES)).text())
}

describe("the projection path contract against the CLI's golden", () => {
	it("parses a path: its annual table, the run it belongs to and the returns it drew", async () => {
		const path = projectionPath.parse(await golden("path.output"))
		expect(path).toMatchObject({ index: 7, paths: 20, modelId: "illustrative-four-months" })
		expect(path.tables.map((table) => table.name)).toEqual(["annual"])
		expect(path.returns.map((rollup) => rollup.index)).toEqual([0, 1, 2])
		expect(path.returns[0]?.accounts).toHaveLength(2)
		expect(path.returnModel).toBeUndefined()
	})

	it("is the path the chance's outcomes list at the same index", async () => {
		const path = projectionPath.parse(await golden("path.output"))
		const chance = projectionChance.parse(await golden("chance-outcomes.output"))
		const outcome = chance.outcomes?.[path.index]
		const annual = path.tables.find((table) => table.name === "annual")
		expect(annual?.rows.at(-1)?.closingNetWorth).toBe(outcome?.closingNetWorth)
	})

	it("refuses a key the contract does not name", async () => {
		const body = (await golden("path.output")) as object
		expect(projectionPath.safeParse({ ...body, extra: 1 }).success).toBe(false)
		const missing = { ...body, returns: undefined }
		expect(projectionPath.safeParse(missing).success).toBe(false)
	})
})
