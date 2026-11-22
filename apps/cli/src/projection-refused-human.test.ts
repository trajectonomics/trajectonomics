import { describe, expect, it } from "bun:test"
import { baseFlags, seededHome } from "./projection/testing"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

describe("a refused projection in human output", () => {
	it("lists every engine problem its hint promises, one per line", async () => {
		const home = seededHome()
		await capture(
			["scenario", "apply", "small", "--file", "-", "--json"],
			{ TRAJ_HOME: home },
			undefined,
			JSON.stringify(SCENARIO_DOCUMENT),
		)
		const res = await capture(["projection", "run", ...baseFlags("small")], { TRAJ_HOME: home })
		expect(res.code).toBe(3)
		const lines = res.err.split("\n")
		expect(lines[0]).toContain("error: projection_refused (baseline.balances.0.account)")
		expect(lines).toContain("details:")
		const items = lines.filter((line) => line.startsWith("  - "))
		expect(items).toHaveLength(6)
		expect(items[0]).toBe("  - UNDECLARED_BALANCE_ACCOUNT at baseline.balances.0.account")
	})
})
