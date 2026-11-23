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
		expect(error.message).toContain("more than 2000 steps")
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
		// More places than the Currency has is this leaf's own refusal, with the flag and a hint (cli ADR-0061).
		["--step", "10.001", "--step", 2],
		["--step", "1000.005", "--step", 2],
		["--budget", "1.005", "--budget", 2],
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

	it.each([
		["--step", "1000.005"],
		["--budget", "1.005"],
	])("says %s %s has too many decimal places, with the flag and a hint", async (flag, value) => {
		const home = await allowancesHome()
		const error = errorOf(await allowances(home, withFlag(flag, value)))
		expect(error.code).toBe("invalid_input")
		expect(error.message).toStartWith(`${flag}: "${value}"`)
		expect(error.message).toContain("decimal places")
		expect(error.hint).toContain("major units")
	})
})
