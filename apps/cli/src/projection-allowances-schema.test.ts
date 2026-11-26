import { describe, expect, it } from "bun:test"
import { ESG, RMF } from "./projection-allowances-support"
import { capture } from "./test-support"
import { ledgerHome } from "./tx-test-support"

type Property = { flag?: string; description?: string }
type Published = {
	input: { properties: Record<string, Property> }
	output: { properties: Record<string, unknown> }
}

async function published(): Promise<Published> {
	const res = await capture(["schema", "projection", "allowances", "--json"], {
		TRAJ_HOME: ledgerHome(),
	})
	expect(res.code).toBe(0)
	return JSON.parse(res.out) as Published
}

describe("traj schema projection allowances", () => {
	it("names each flag, and the labels the Levy `scenario tax` writes reads", async () => {
		const { input } = await published()
		expect(
			["labels", "step", "budget", "minSaving"].map((key) => input.properties[key]?.flag),
		).toEqual(["--labels", "--step", "--budget", "--min-saving"])
		expect(input.properties["labels"]?.description).toContain(RMF)
		expect(input.properties["labels"]?.description).toContain(ESG)
		expect(input.properties["step"]?.description).toContain("There is no default")
	})

	it("publishes both tables and what the request was understood as", async () => {
		const { output } = await published()
		expect(Object.keys(output.properties)).toEqual(
			expect.arrayContaining([
				"taxYears",
				"allowances",
				"labels",
				"step",
				"budget",
				"minSavingBps",
			]),
		)
	})

	it("names the Filer on each table's rows, for a separate filing", async () => {
		const { output } = await published()
		const tables = output.properties as Record<
			string,
			{ items?: { properties?: Record<string, unknown> } }
		>
		expect(tables["taxYears"]?.items?.properties).toHaveProperty("filer")
		expect(tables["allowances"]?.items?.properties).toHaveProperty("filer")
	})
})
