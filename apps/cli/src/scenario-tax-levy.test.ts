import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { scenario } from "./scenario-test-support"

describe("scenario tax result", () => {
	it("states the Levy id it wrote, the id the Scenario then lists", async () => {
		const home = await projectionHome()
		const res = await scenario(home, [
			"tax",
			"base",
			"--tax",
			"th-2026",
			"--label",
			"salary=income.section40_1",
		])
		expect(res.code).toBe(0)
		expect(JSON.parse(res.out)).toMatchObject({ levy: "th-2026-pit", status: "updated" })
	})

	it("states no Levy when --none removed it", async () => {
		const home = await projectionHome()
		await scenario(home, [
			"tax",
			"base",
			"--tax",
			"th-2026",
			"--label",
			"salary=income.section40_1",
		])
		const res = await scenario(home, ["tax", "base", "--none"])
		expect(res.code).toBe(0)
		expect(JSON.parse(res.out)).not.toHaveProperty("levy")
	})
})
