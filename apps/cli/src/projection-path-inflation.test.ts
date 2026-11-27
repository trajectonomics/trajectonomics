import { describe, expect, it } from "bun:test"
import type { ReturnModel } from "@trajectonomics/core/sim"
import { ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import { projection } from "./projection/testing"
import { DATES, FULL, inflationHome } from "./projection-chance-inflation-support"
import { chanceBody, modelFile } from "./projection-chance-support"
import { errorOf } from "./scenario-test-support"
import { capture } from "./test-support"

/*
 * `projection path` states each roll-up's own inflation (sim ADR 0033, cli ADR 0085), and a
 * Return model file may carry the same factor. The CLI ships no figure: every rate here is the
 * test's own.
 */

const PATH_FLAGS: readonly string[] = [
	"path",
	"--scenario",
	"inflationary",
	...DATES,
	"--return-model",
	"plan",
	"--paths",
	"1",
	"--seed",
	ILLUSTRATIVE_SEED,
	"--index",
	"0",
	"--buckets",
	"16",
]

describe("projection path with an inflation factor", () => {
	it("states each roll-up's own inflation, and echoes the factor", async () => {
		const home = await inflationHome()
		const res = await projection(home, [...PATH_FLAGS])
		expect(res.code).toBe(0)
		const body = JSON.parse(res.out) as {
			returnModel?: { inflation?: { rate: number; volatility: number } }
			returns: { inflationBps?: number }[]
		}
		expect(body.returnModel?.inflation).toEqual({ rate: 250, volatility: 150 })
		expect(body.returns.length).toBeGreaterThan(0)
		for (const rollup of body.returns) expect(typeof rollup.inflationBps).toBe("number")
	})

	it("prints an Inflation column in the human returns table", async () => {
		const home = await inflationHome()
		const res = await capture(["projection", ...PATH_FLAGS], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		expect(res.out).toContain("Inflation")
	})
})

describe("a Return model file with an inflation factor", () => {
	const model: ReturnModel = {
		id: "inflated-file",
		accounts: [],
		buckets: [{ returnsBps: [], weight: FULL }],
		inflation: { buckets: [{ rateBps: 100, weight: FULL }] },
	}

	const flags = (file: string): string[] => [
		"chance",
		"--scenario",
		"base",
		...DATES,
		"--return-model",
		file,
		"--paths",
		"1",
		"--seed",
		ILLUSTRATIVE_SEED,
	]

	it("is accepted, and states real Bands", async () => {
		const home = await inflationHome()
		const res = await projection(home, flags(modelFile(home, model, "inflated.json")))
		expect(res.code).toBe(0)
		expect(chanceBody(res).realBands).toBeDefined()
		expect(chanceBody(res).returnModel).toBeUndefined()
	})

	it("words an out-of-range inflation rate as a yearly rate", async () => {
		const home = await inflationHome()
		const bad = { ...model, inflation: { buckets: [{ rateBps: 10_001, weight: FULL }] } }
		const res = await projection(home, flags(modelFile(home, bad, "bad.json")))
		expect(res.code).toBe(2)
		expect(errorOf(res).message).toContain("a year")
	})
})
