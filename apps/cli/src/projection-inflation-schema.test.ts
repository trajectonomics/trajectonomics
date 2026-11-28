import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { capture } from "./test-support"

/*
 * `traj schema` states the inflation shapes the CLI now reads and writes (cli ADR-0085): the Return
 * model's optional `inflation`, the chance's `realBands` and today's-money median, and the path's
 * `inflationBps`. A reader can write a model file from the published shape alone.
 */

describe("traj schema names the inflation output", () => {
	it("publishes the factor, the real Bands and each roll-up's inflation", async () => {
		const home = await projectionHome()
		const of = async (leaf: string) =>
			JSON.parse((await capture(["schema", "projection", leaf, "--json"], { TRAJ_HOME: home })).out)

		const model = await of("model")
		expect(model.output.properties.inflation).toBeDefined()

		const chance = await of("chance")
		expect(chance.output.properties.realBands).toBeDefined()
		expect(JSON.stringify(chance.output.properties.tables)).toContain("p50Real")
		expect(chance.output.properties.returnModel.properties.inflation).toBeDefined()

		const path = await of("path")
		expect(JSON.stringify(path.output.properties.returns)).toContain("inflationBps")
		expect(path.output.properties.returnModel.properties.inflation).toBeDefined()
	})
})
