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
		expect(chance.realBands).toBeUndefined()
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

	it("parses a chance drawn from the plan's own return model, and says what it was built from (cli ADR-0068)", async () => {
		const chance = projectionChance.parse(await golden("chance-plan.output"))
		expect(chance.returnModel).toMatchObject({ source: "plan", buckets: 16 })
		expect(chance.returnModel?.accounts[0]).toMatchObject({ volatility: 1500 })
		expect(chance.returnModel?.inflation).toBeUndefined()
		expect(chance.realBands).toBeUndefined()
		expect(chance.definition.modelId).toBe("plan-16")
	})

	it("parses the plan's inflation factor, the real Bands and the median in today's money (cli ADR-0085)", async () => {
		const body = (await golden("chance-plan.output")) as {
			returnModel: Record<string, unknown>
			bands: { index: number; to: string; netWorth: { level: number; value: string }[] }[]
			tables: { name: string; count: number; rows: Record<string, unknown>[] }[]
		}
		const median = body.bands[0]?.netWorth.find((entry) => entry.level === 50)?.value ?? ""
		const parsed = projectionChance.parse({
			...body,
			returnModel: { ...body.returnModel, inflation: { rate: 250, volatility: 150 } },
			realBands: body.bands,
			tables: body.tables.map((table) =>
				table.name === "bands"
					? { ...table, rows: table.rows.map((row) => ({ ...row, p50Real: median })) }
					: table,
			),
		})
		expect(parsed.returnModel?.inflation).toEqual({ rate: 250, volatility: 150 })
		expect(parsed.realBands?.[0]?.netWorth).toHaveLength(5)
		const table = parsed.tables.find((entry) => entry.name === "bands")
		if (table?.name === "bands") expect(table.rows[0]?.p50Real).toBe(median)
	})

	it("leaves the file model's read without a returnModel, and refuses one it does not name", async () => {
		expect(projectionChance.parse(await golden("chance.output")).returnModel).toBeUndefined()
		const body = (await golden("chance-plan.output")) as { returnModel: object }
		const bad = { ...body, returnModel: { ...body.returnModel, extra: 1 } }
		expect(projectionChance.safeParse(bad).success).toBe(false)
	})

	it("refuses a spending Band the contract does not name", async () => {
		const body = (await golden("chance-spending.output")) as { spendingBands: object[] }
		const bad = { ...body, spendingBands: [{ ...body.spendingBands[0], extra: 1 }] }
		expect(projectionChance.safeParse(bad).success).toBe(false)
	})

	it("parses a chance with --outcomes: each path's result and the paths to open first (cli ADR-0069)", async () => {
		const chance = projectionChance.parse(await golden("chance-outcomes.output"))
		expect(chance.outcomes).toHaveLength(20)
		expect(chance.outcomes?.map((outcome) => outcome.index)).toEqual([...Array(20).keys()])
		expect(chance.outcomes?.[0]?.lowestYear).toBe("2026-03-31")
		expect(chance.representative).toMatchObject({ earliestRunsOut: null })
		const lowest = chance.representative?.lowest ?? -1
		expect(chance.outcomes?.some((outcome) => outcome.index === lowest)).toBe(true)
	})

	it("parses a chance with --milestone-dates: each Milestone's reach, dates, ages and years (cli ADR-0081)", async () => {
		const chance = projectionChance.parse(await golden("chance-milestones.output"))
		expect(chance.milestones?.map((entry) => entry.id)).toEqual(["stop", "retire", "rich", "never"])
		expect(chance.milestones?.[0]).toMatchObject({
			displayLabel: "stop work",
			reached: { paths: 20, share: "100.00%" },
		})
		expect(chance.milestones?.[0]?.dates?.p50).toEqual({
			date: "2026-09-01",
			ages: [{ person: "me", age: 36 }],
		})
		expect(chance.milestones?.at(-1)?.dates).toBeNull()
	})

	it("parses each outcome's fired dates with --outcomes too, and refuses an unknown Milestone key", async () => {
		const chance = projectionChance.parse(await golden("chance-milestones-outcomes.output"))
		expect(chance.outcomes?.[0]?.milestones).toMatchObject({ stop: "2026-09-30" })
		const body = (await golden("chance-milestones-outcomes.output")) as {
			milestones: object[]
		}
		const bad = { ...body, milestones: [{ ...body.milestones[0], extra: 1 }] }
		expect(projectionChance.safeParse(bad).success).toBe(false)
	})

	it("leaves a chance without --outcomes with neither key, and refuses an outcome it does not name", async () => {
		const plain = projectionChance.parse(await golden("chance.output"))
		expect(plain.outcomes).toBeUndefined()
		expect(plain.representative).toBeUndefined()
		const body = (await golden("chance-outcomes.output")) as { outcomes: object[] }
		const bad = { ...body, outcomes: [{ ...body.outcomes[0], extra: 1 }] }
		expect(projectionChance.safeParse(bad).success).toBe(false)
	})
})
