import { describe, expect, it } from "bun:test"
import { baseFlags, errorOf, projection, projectionHome } from "./projection/testing"
import { echoed } from "./projection-what-if-support"

describe("projection run --decimal", () => {
	it("converts a decimal amount exactly, so it hashes as the minor-unit amount does", async () => {
		const home = await projectionHome()
		const decimal = await projection(home, [
			"run",
			...baseFlags(),
			"--set",
			'flows.salary.amount="90000.50"',
			"--decimal",
		])
		const minor = await projection(home, [
			"run",
			...baseFlags(),
			"--set",
			"flows.salary.amount=9000050",
		])
		expect(decimal.code).toBe(0)
		expect(minor.code).toBe(0)
		expect(echoed(decimal).scenario.effectiveContentHash).toBe(
			echoed(minor).scenario.effectiveContentHash,
		)
		// The echo states the value as it was given: the decimal string, not the satang.
		expect(echoed(decimal).overrides).toEqual([{ path: "flows.salary.amount", value: "90000.50" }])
		expect(echoed(minor).overrides).toEqual([{ path: "flows.salary.amount", value: 9000050 }])
	})

	it("refuses a grouped amount at its --set, and names both spellings", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			"--set",
			'flows.salary.amount="90,000.50"',
			"--decimal",
		])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({
			code: "invalid_input",
			path: "--set",
			details: { index: 0, path: "flows.salary.amount" },
		})
		expect(error.hint).toContain("350.00")
	})

	it("refuses a JSON number on a money path under --decimal", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			"--set",
			"flows.salary.amount=90000.5",
			"--decimal",
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ path: "--set", details: { index: 0 } })
	})

	it("refuses more places than the Currency has as INVALID_AMOUNT at the --set", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			"--set",
			'flows.salary.amount="1.001"',
			"--decimal",
		])
		expect(res.code).toBe(3)
		expect(errorOf(res)).toMatchObject({ code: "INVALID_AMOUNT", path: "--set" })
	})

	it("leaves a non-money number alone, so a rate is still an integer under --decimal", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			"--set",
			"economy.inflation=100",
			"--decimal",
		])
		expect(res.code).toBe(0)
		expect(echoed(res).overrides).toEqual([{ path: "economy.inflation", value: 100 }])
	})
})
