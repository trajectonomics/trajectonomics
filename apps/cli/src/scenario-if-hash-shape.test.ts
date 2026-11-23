// `--if-hash` takes a contentHash as `traj scenario show` prints it; any other text is a usage error, never
// read as a plan that moved on (cli ADR-0055).
import { describe, expect, it } from "bun:test"
import { seedBase } from "./scenario-household-support"
import { errorOf, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

const MALFORMED = [
	"abc",
	"jcs1:sha256:zz",
	`jcs1:sha256:${"A".repeat(64)}`,
	`jcs1:sha256:${"0".repeat(63)}`,
	`sha256:${"0".repeat(64)}`,
]

describe("--if-hash shape", () => {
	for (const hash of MALFORMED) {
		it(`refuses ${JSON.stringify(hash)} as invalid input at --if-hash, on apply and on household`, async () => {
			const home = scenarioHome()
			await seedBase(home)
			const file = `${home}/doc.json`
			await Bun.write(file, JSON.stringify(SCENARIO_DOCUMENT))
			for (const argv of [
				["scenario", "apply", "base", "--file", file, "--if-hash", hash, "--json"],
				["scenario", "household", "base", "--none", "--if-hash", hash, "--json"],
			]) {
				const res = await capture(argv, { TRAJ_HOME: home })
				expect(res.code).toBe(2)
				expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--if-hash" })
			}
		})
	}
})
