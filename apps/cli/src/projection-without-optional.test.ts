// `--without` on the last item of a list the core takes absent but refuses empty (`milestones`,
// `levies`) drops the key, so a what-if can switch off a plan's only Milestone or Levy (cli ADR-0056).
import { describe, expect, it } from "bun:test"
import { SIM_SCENARIO } from "./baseline/fixture"
import { taxedHome } from "./projection/carry-in-support"
import { projection, projectionHome } from "./projection/testing"
import { MILESTONES } from "./projection-milestones-support"
import { echoed } from "./projection-what-if-support"
import { applyScenario, scenario } from "./scenario-test-support"

const DATES = ["--as-of", "2026-03-31", "--horizon", "2027-03-30"]

describe("--without the last item of an optional list", () => {
	it("switches off a plan's only Milestone, and the stored plan keeps it", async () => {
		const home = await projectionHome()
		const one = { ...SIM_SCENARIO, milestones: [MILESTONES[1]] }
		expect((await applyScenario(home, "onems", one)).code).toBe(0)
		const res = await projection(home, [
			"run",
			"--scenario",
			"onems",
			...DATES,
			"--without",
			"milestones.never",
		])
		expect(res.code).toBe(0)
		expect(echoed(res).removals).toEqual(["milestones.never"])
		expect((JSON.parse(res.out) as { milestones?: unknown }).milestones).toBeUndefined()
		const shown = await scenario(home, ["show", "onems", "--json"])
		expect(JSON.parse(shown.out).scenario.document.milestones).toHaveLength(1)
	})

	it("refuses a plan's only Levy for the Flow label that needs it, not for an empty list", async () => {
		// A Levy no labelled Flow reads cannot be stored (UNSUPPLIED_TALLY_LABEL), so the sole Levy always
		// has a reader. With the key dropped, the refusal names that real dependency at --without.
		const home = await taxedHome()
		const res = await projection(home, [
			"run",
			"--scenario",
			"base",
			...DATES,
			"--without",
			"levies.th-2026-pit",
		])
		expect(res.code).toBe(2)
		const error = JSON.parse(res.err).error as { path: string; details: { code: string } }
		expect(error.path).toBe("--without")
		expect(error.details.code).toBe("LEVY_REQUIRED")
	})
})
