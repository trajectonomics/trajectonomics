import { describe, expect, it } from "bun:test"
import { WORKING_PATH_NOTE } from "./projection/fi"
import type { FiView } from "./projection/fi-view"
import { baseFlags, fi, projection, projectionHome } from "./projection/testing"
import { runBody } from "./projection-run-support"
import { capture } from "./test-support"

/** The `levied` fixture Scenario: 3% of the salary is taxed and settled each 15 February. */
const FLAGS: readonly string[] = [
	"--scenario",
	"levied",
	"--as-of",
	"2026-03-31",
	"--horizon",
	"2029-03-30",
]

function fiBody(out: string): FiView {
	return JSON.parse(out) as FiView
}

describe("the tax years `fi` prints", () => {
	it("stop owing tax on a salary that stops at the FI date", async () => {
		const home = await projectionHome()
		const body = fiBody((await fi(home, FLAGS)).out)
		expect(body.fi).toMatchObject({ reachable: true, fiDate: "2026-11-01" })
		// Salary is 80,000 a month and taxed at 3%, so 2,400 a month. The salary runs April to
		// October 2026, seven months: 7 x 2,400 = 16,800. Every year after the FI date owes nothing.
		expect(body.taxYears.map((year) => [year.from, year.due, year.prepaid])).toEqual([
			["2026-01-01", "16800.00", "16800.00"],
			["2027-01-01", "0.00", "0.00"],
			["2028-01-01", "0.00", "0.00"],
			["2029-01-01", "0.00", "0.00"],
		])
		expect(body.notes).not.toContain(WORKING_PATH_NOTE)
	})

	it("differ from the working path's, which keeps charging the salary it never stops", async () => {
		const home = await projectionHome()
		const run = runBody(await projection(home, ["run", ...FLAGS]))
		// The same Scenario projected as written pays nine months of salary tax in 2026: 9 x 2,400.
		expect(run.taxYears[0]?.due).toBe("21600.00")
		expect(run.taxYears[1]?.due).toBe("29340.00")
	})

	it("keep the FI date the survival scan chose", async () => {
		const home = await projectionHome()
		const body = fiBody((await fi(home, baseFlags())).out)
		expect(body.fi).toMatchObject({ reachable: true, fiDate: "2026-04-01" })
		expect(body.taxYears).toEqual([])
	})

	it("describe the working path, and say so, when FI is unreachable", async () => {
		const home = await projectionHome()
		const flags = [...FLAGS, "--set", "flows.rent.amount=900000000"]
		const body = fiBody((await fi(home, flags)).out)
		expect(body.fi.reachable).toBe(false)
		expect(body.notes).toContain(WORKING_PATH_NOTE)
		const run = runBody(await projection(home, ["run", ...flags]))
		expect(body.taxYears).toEqual(run.taxYears)
	})

	it("say in the schema which path the rows describe", async () => {
		const res = await capture(["schema", "fi"])
		expect(res.code).toBe(0)
		expect(res.out).toContain("earned income as the Scenario states it before fiDate")
		expect(res.out).toContain("When FI is unreachable")
	})
})
