import { describe, expect, it } from "bun:test"
import { carryInFile, MID_PERIOD, taxedHome, thRecord } from "./projection/carry-in-support"
import { ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import { errorOf, projection } from "./projection/testing"
import { chanceBody, modelFile } from "./projection-chance-support"
import { capture } from "./test-support"

/** A Thai-taxed Scenario, As-of mid-period: its Levy needs a Carry-in record, as `projection run` does. */
function chanceArgs(home: string, extra: readonly string[] = []): string[] {
	return [
		"chance",
		"--scenario",
		"base",
		...MID_PERIOD,
		"--return-model",
		modelFile(home),
		"--paths",
		"20",
		"--seed",
		ILLUSTRATIVE_SEED,
		...extra,
	]
}

describe("projection chance with a Carry-in", () => {
	it("refuses a mid-period Levy without --carry-in, and the hint names a flag the leaf takes", async () => {
		const home = await taxedHome()
		const res = await projection(home, chanceArgs(home))
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error.code).toBe("invalid_input")
		expect(error.hint).toContain("--carry-in")
	})

	it("runs once the Carry-in record is given, and echoes it", async () => {
		const home = await taxedHome()
		const res = await projection(
			home,
			chanceArgs(home, ["--carry-in", carryInFile(home, [thRecord()])]),
		)
		expect(res.code).toBe(0)
		const body = chanceBody(res)
		expect(body.paths).toBe(20)
		expect(body.definition.seed).toBe(ILLUSTRATIVE_SEED)
		expect((body as { carryIn?: unknown[] }).carryIn).toMatchObject([
			{ levy: "th-2026-pit", source: "flag" },
		])
	})

	it("refuses both documents on standard input", async () => {
		const home = await taxedHome()
		const res = await projection(home, [
			...chanceArgs(home).filter(
				(arg, index, all) => all[index - 1] !== "--return-model" && arg !== "--return-model",
			),
			"--return-model",
			"-",
			"--carry-in",
			"-",
		])
		expect(res.code).toBe(2)
		expect(errorOf(res).path).toBe("--carry-in")
	})

	it("lists --carry-in in traj schema", async () => {
		const res = await capture(["schema", "projection", "chance", "--json"])
		const data = JSON.parse(res.out) as { input: { properties: Record<string, unknown> } }
		expect(Object.keys(data.input.properties)).toContain("carryIn")
	})
})
