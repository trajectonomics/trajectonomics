import { describe, expect, it } from "bun:test"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import { VOLATILE_PLAN } from "./projection/plan-model-testing"
import { baseFlags, errorOf, projection, projectionHome } from "./projection/testing"
import { outcomesRun, pathAt, pathBody } from "./projection-chance-outcomes-support"
import { applyScenario } from "./scenario-test-support"
import { capture } from "./test-support"

/*
 * `traj projection path` (cli ADR-0069): the Projection of one seeded Market path, in `projection run`'s
 * shape, plus the returns it drew. The agreement with `projection chance --outcomes` is in
 * projection-chance-outcomes.test.ts; this file holds the leaf's own result, refusals and goldens.
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)

/** The command's bytes, with the Scenario's minted id replaced by a stable token. */
function goldenText(out: string, id: string): string {
	return `${out.replace(`"${id}"`, '"the-scenario-id"')}\n`
}

describe("projection path", () => {
	it("matches the committed golden, byte for byte", async () => {
		const { home, flags } = await outcomesRun(20)
		const res = await pathAt(home, flags, 7)
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const text = goldenText(res.out, pathBody(res).scenario.id)
		await recordGoldenTextIn(GOLDENS, "path.output", text)
		expect(await goldenTextIn(GOLDENS, "path.output")).toBe(text)
	})

	it("states the run it is a path of, and one return per Account for each annual roll-up", async () => {
		const { home, flags } = await outcomesRun(20)
		const path = pathBody(await pathAt(home, flags, 7))
		expect(path).toMatchObject({
			index: 7,
			definition: {
				modelId: "illustrative-four-months",
				seed: ILLUSTRATIVE_SEED,
				paths: 20,
				modelHash: expect.stringMatching(/^jcs1:sha256:[0-9a-f]{64}$/),
			},
		})
		expect(path.returnModel).toBeUndefined()
		expect(path.returns.map((rollup) => rollup.index)).toEqual([0, 1, 2])
		const annual = path.tables.find((table) => table.name === "annual")
		expect(path.returns.map((rollup) => [rollup.from, rollup.to])).toEqual(
			(annual?.rows ?? []).map((row) => ("from" in row ? [row.from, row.to] : [])),
		)
		for (const rollup of path.returns) {
			expect(rollup.accounts).toHaveLength(2)
			// The bank Account's bucket returns 8 bps in every month: 1.0008^12 - 1 is 96 bps.
			expect(rollup.accounts[0]?.returnBps).toBe(96)
		}
	})

	it("takes the opt-in flags of projection run", async () => {
		const { home, flags } = await outcomesRun(20)
		const path = pathBody(await pathAt(home, flags, 3, ["--monthly", "--breakdown"]))
		const names = path.tables.map((table) => table.name)
		expect(names).toContain("monthly")
		expect(names).toContain("cashflow")
		expect(names).toContain("cashflowTotals")
	})

	it("replays a path of the plan's own return model and echoes what it was built from", async () => {
		const home = await projectionHome()
		const applied = await applyScenario(home, "volatile", VOLATILE_PLAN)
		expect(applied.code).toBe(0)
		const flags = [
			...baseFlags("volatile"),
			"--return-model",
			"plan",
			"--buckets",
			"64",
			"--paths",
			"50",
			"--seed",
			ILLUSTRATIVE_SEED,
		]
		const path = pathBody(await pathAt(home, flags, 49))
		expect(path.definition.modelId).toBe("plan-64")
		expect(path.returnModel).toMatchObject({ source: "plan", buckets: 64 })
	})

	it("is the same path for the same flags, and a different one at another index", async () => {
		const { home, flags } = await outcomesRun(20)
		const first = await pathAt(home, flags, 4)
		expect((await pathAt(home, flags, 4)).out).toBe(first.out)
		expect(pathBody(await pathAt(home, flags, 5)).returns).not.toEqual(pathBody(first).returns)
	})

	it("accepts the last path of the run and refuses the one after it, at --index, naming the range", async () => {
		const { home, flags } = await outcomesRun(200)
		expect((await pathAt(home, flags, 199)).code).toBe(0)
		const res = await pathAt(home, flags, 200)
		expect(res.code).not.toBe(0)
		const error = errorOf(res)
		expect(error.code).toBe("invalid_input")
		expect(error.path).toBe("--index")
		expect(error.hint).toContain("0..199")
		expect(error.details).toEqual([{ code: "INVALID_PATH_INDEX", path: "--index" }])
	})

	it("refuses a negative index at --index, with the same range", async () => {
		const { home, flags } = await outcomesRun(200)
		const res = await projection(home, ["path", ...flags, "--index=-1"])
		expect(res.code).not.toBe(0)
		expect(errorOf(res).path).toBe("--index")
		expect(errorOf(res).hint).toContain("0..199")
	})

	it("requires --index", async () => {
		const { home, flags } = await outcomesRun(20)
		const res = await projection(home, ["path", ...flags])
		expect(res.code).not.toBe(0)
		expect(errorOf(res).code).toBe("invalid_input")
		expect(res.err).toContain("index")
	})

	it("prints the annual table, then the returns of each roll-up, in the human form", async () => {
		const { home, flags } = await outcomesRun(20)
		const res = await capture(["projection", "path", ...flags, "--index", "2"], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		expect(res.out).toContain("annual (3 rows)")
		expect(res.out).toContain("returns (6 rows)")
		expect(res.out).toContain("This is path 2 of 20")
	})
})
