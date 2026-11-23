import { describe, expect, it } from "bun:test"
import simPackage from "../package.json"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { ILLUSTRATIVE_RETURN_MODEL, ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import { AS_OF, baseFlags, HORIZON, projection, projectionHome } from "./projection/testing"
import { chanceBody, chanceFlags, modelFile } from "./projection-chance-support"
import { type Captured, capture } from "./test-support"

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)

/** The command's own bytes, with the Scenario's minted id replaced by a stable token. */
function goldenText(res: Captured): string {
	const id = chanceBody(res).scenario.id
	return `${res.out.replace(`"${id}"`, '"the-scenario-id"')}\n`
}

/** The engine version is checked first, so a bump fails before any byte comparison. */
async function expectGoldenEngineVersion(): Promise<void> {
	let text: string
	try {
		text = await goldenTextIn(GOLDENS, "chance.output")
	} catch {
		if (process.env["TRAJ_UPDATE_GOLDEN"] === "1") return
		throw new Error(
			"The chance golden is missing. Record it deliberately: TRAJ_UPDATE_GOLDEN=1 bun test src/projection-chance.test.ts",
		)
	}
	const { engine } = JSON.parse(text) as { engine: { version: string } }
	if (engine.version !== simPackage.version) {
		throw new Error(
			`The golden was produced with @trajectonomics/cli ${engine.version}, but ${simPackage.version} is installed. Re-baseline it deliberately: TRAJ_UPDATE_GOLDEN=1 bun test src/projection-chance.test.ts`,
		)
	}
}

describe("projection chance", () => {
	it("matches the committed golden, byte for byte", async () => {
		await expectGoldenEngineVersion()
		const home = await projectionHome()
		const res = await projection(home, ["chance", ...chanceFlags(modelFile(home))])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const text = goldenText(res)
		await recordGoldenTextIn(GOLDENS, "chance.output", text)
		expect(await goldenTextIn(GOLDENS, "chance.output")).toBe(text)
	})

	it("echoes the As-of, the engine, the Scenario, the definition and the tax status (ADR-0030)", async () => {
		const home = await projectionHome()
		const body = chanceBody(await projection(home, ["chance", ...chanceFlags(modelFile(home))]))
		expect(body.asOf).toBe(AS_OF)
		expect(body.horizon).toBe(HORIZON)
		expect(body.currency).toBe("THB")
		expect(body.engine).toEqual({ package: "@trajectonomics/cli", version: simPackage.version })
		expect(body.scenario).toMatchObject({
			name: "base",
			contentHash: body.scenario.effectiveContentHash,
		})
		expect(body.overrides).toEqual([])
		expect(body.tax).toBe("not_applied")
		expect(body.definition).toEqual({
			modelId: ILLUSTRATIVE_RETURN_MODEL.id,
			seed: ILLUSTRATIVE_SEED,
			paths: 200,
		})
		expect(body.paths).toBe(200)
	})

	it("reports a floored success share whose count and basis points agree", async () => {
		const home = await projectionHome()
		const body = chanceBody(await projection(home, ["chance", ...chanceFlags(modelFile(home))]))
		expect(body.succeeded).toBeGreaterThanOrEqual(0)
		expect(body.succeeded).toBeLessThanOrEqual(body.paths)
		expect(body.successBps).toBe(Math.floor((body.succeeded * 10000) / body.paths))
	})

	it("gives one Band per annual roll-up, each at the engine's five levels in order", async () => {
		const home = await projectionHome()
		const body = chanceBody(await projection(home, ["chance", ...chanceFlags(modelFile(home))]))
		expect(body.bands).toHaveLength(1)
		expect(body.runsOut).toHaveLength(1)
		expect(body.bands[0]?.netWorth.map((percentile) => percentile.level)).toEqual([
			10, 25, 50, 75, 90,
		])
		const values = body.bands[0]?.netWorth.map((percentile) => Number(percentile.value)) ?? []
		expect(values).toEqual([...values].sort((a, b) => a - b))
	})

	it("prints a few Bands, not every roll-up, in the human table", async () => {
		const home = await projectionHome()
		const body = chanceBody(
			await projection(home, [
				"chance",
				...baseFlags(),
				"--horizon",
				"2046-03-30",
				"--return-model",
				modelFile(home),
				"--paths",
				"10",
				"--seed",
				ILLUSTRATIVE_SEED,
			]),
		)
		expect(body.bands).toHaveLength(20)
		const table = body.tables[0]
		expect(table?.name).toBe("bands")
		expect((table?.rows ?? []).flatMap((row) => ("index" in row ? [row.index] : []))).toEqual([
			0, 4, 9, 14, 19,
		])
	})

	it("counts a plan that runs out as failing paths in the roll-up it ran out in", async () => {
		const home = await projectionHome()
		// The drained Scenario's one-off expense lands in June 2027, far beyond its portfolio.
		const body = chanceBody(
			await projection(home, [
				"chance",
				"--scenario",
				"drained-2027",
				"--as-of",
				AS_OF,
				"--horizon",
				"2028-03-30",
				"--return-model",
				modelFile(home),
				"--paths",
				"20",
				"--seed",
				ILLUSTRATIVE_SEED,
			]),
		)
		expect(body.succeeded).toBe(0)
		expect(body.successBps).toBe(0)
		expect(body.runsOut.map((row) => row.paths)).toEqual([0, 20])
		expect(body.bands).toHaveLength(2)
	})

	it("is the same answer for the same model, seed and count", async () => {
		const home = await projectionHome()
		const flags = chanceFlags(modelFile(home))
		const first = await projection(home, ["chance", ...flags])
		const second = await projection(home, ["chance", ...flags])
		expect(second.out).toBe(first.out)
	})

	it("prints the success share, the Bands and the definition in the human form", async () => {
		const home = await projectionHome()
		const res = await capture(["projection", "chance", ...chanceFlags(modelFile(home))], {
			TRAJ_HOME: home,
		})
		expect(res.code).toBe(0)
		expect(res.out).toContain("bands (1 row)")
		expect(res.out).toContain("p10")
		expect(res.out).toContain("p90")
		expect(res.out).toContain("a success share of")
		expect(res.out).toContain(
			`return model "${ILLUSTRATIVE_RETURN_MODEL.id}" with seed ${ILLUSTRATIVE_SEED}`,
		)
		expect(res.out).not.toContain('"definition"')
	})
})
