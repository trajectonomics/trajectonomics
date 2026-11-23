import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import {
	allowances,
	allowancesHome,
	errorOf,
	RMF,
	withFlag,
	YEARS,
} from "./projection-allowances-support"

describe("projection allowances refuses what it cannot answer", () => {
	it("refuses a plan with no Levy, and names the command that adds one", async () => {
		const home = await projectionHome()
		const res = await allowances(home, [
			"--scenario",
			"base",
			...YEARS,
			"--labels",
			RMF,
			"--step",
			"10000",
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--scenario" })
		expect(errorOf(res).hint).toContain("traj scenario tax")
	})

	it("refuses a label the Levy does not read, and lists the ones it does", async () => {
		const home = await allowancesHome()
		const res = await allowances(home, withFlag("--labels", `${RMF},salary`))
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({ code: "invalid_input", path: "--labels" })
		expect(error.message).toContain('"salary"')
		expect(error.hint).toContain("The Levy reads: ")
		expect(error.hint).toContain(RMF)
		expect(error.hint).not.toContain("income.section40_1")
	})

	it("refuses a step the engine would need more than 2000 steps for, and says to raise --step", async () => {
		const home = await allowancesHome()
		const res = await allowances(home, withFlag("--step", "1.01"))
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({ code: "invalid_input", path: "--step" })
		expect(error.message).toContain("2000 steps or more")
		expect(error.hint).toContain("Raise --step")
	})

	it.each([["1"], ["1.00"], ["0.50"], ["0"], ["-5"]])(
		"refuses --step %s, which is not larger than one major unit",
		async (step) => {
			const home = await allowancesHome()
			const res = await allowances(home, withFlag("--step", step))
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--step" })
			expect(errorOf(res).message).toContain("not larger than one major unit")
		},
	)

	it.each([
		["--step", "1,000", "--step", 2],
		// More places than the Currency has is INVALID_AMOUNT, as `tx add --amount` gives it (cli ADR-0047).
		["--step", "10.001", "step", 3],
		["--budget", "-1", "--budget", 2],
		["--budget", "ten", "--budget", 2],
		["--min-saving", "101", "--min-saving", 2],
		["--min-saving", "5.555", "--min-saving", 2],
		["--min-saving", "5%", "--min-saving", 2],
		["--labels", `${RMF},,${RMF}`, "--labels", 2],
		["--labels", `${RMF},${RMF}`, "--labels", 2],
	])("refuses %s %s at its flag", async (flag, value, path, code) => {
		const home = await allowancesHome()
		const res = await allowances(home, withFlag(flag, value))
		expect(res.code).toBe(code)
		expect(errorOf(res).path).toBe(path)
	})
})
