import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { capture } from "./test-support"

/*
 * `traj schema` states the inflation shapes the CLI now reads and writes (cli ADR-0085): the Return
 * model's optional `inflation`, the chance's `realBands` and today's-money median, and the path's
 * `inflationBps`. A reader can write a model file from the published shape alone, and every field is
 * published as optional so a run without an inflation factor keeps its bytes.
 */

type JsonSchema = {
	required?: readonly string[]
	properties?: Readonly<Record<string, JsonSchema>>
	items?: JsonSchema
	anyOf?: readonly JsonSchema[]
	const?: unknown
}

type SchemaEnvelope = { output: JsonSchema }

/** The published output schema of one projection leaf. */
async function schemaOf(home: string, leaf: string): Promise<JsonSchema> {
	const res = await capture(["schema", "projection", leaf, "--json"], { TRAJ_HOME: home })
	return (JSON.parse(res.out) as SchemaEnvelope).output
}

describe("traj schema names the inflation output", () => {
	it("publishes the factor, the real Bands and each roll-up's inflation", async () => {
		const home = await projectionHome()

		const model = await schemaOf(home, "model")
		expect(model.properties?.["inflation"]).toBeDefined()

		const chance = await schemaOf(home, "chance")
		expect(chance.properties?.["realBands"]).toBeDefined()
		expect(JSON.stringify(chance.properties?.["tables"])).toContain("p50Real")
		expect(chance.properties?.["returnModel"]?.properties?.["inflation"]).toBeDefined()

		const path = await schemaOf(home, "path")
		expect(JSON.stringify(path.properties?.["returns"])).toContain("inflationBps")
		expect(path.properties?.["returnModel"]?.properties?.["inflation"]).toBeDefined()
	})

	it("leaves every inflation field out of required, so each is optional", async () => {
		const home = await projectionHome()

		const model = await schemaOf(home, "model")
		expect(model.required).not.toContain("inflation")

		const chance = await schemaOf(home, "chance")
		expect(chance.required).not.toContain("realBands")
		expect(chance.properties?.["returnModel"]?.required).not.toContain("inflation")
		const variants = chance.properties?.["tables"]?.items?.anyOf ?? []
		const bands = variants.find((variant) => variant.properties?.["name"]?.const === "bands")
		expect(bands?.properties?.["rows"]?.items?.required).not.toContain("p50Real")

		const path = await schemaOf(home, "path")
		expect(path.properties?.["returns"]?.items?.required).not.toContain("inflationBps")
		expect(path.properties?.["returnModel"]?.required).not.toContain("inflation")
	})
})
