import { describe, expect, it } from "bun:test"
import { capture } from "../test-support"
import { ledgerHome } from "../tx-test-support"

/** The input schema `traj schema dashboard` publishes, with its properties. */
async function dashboardInput(): Promise<{
	properties: Record<string, Record<string, unknown>>
}> {
	const res = await capture(["schema", "dashboard", "--json"], { TRAJ_HOME: ledgerHome() })
	expect(res.code).toBe(0)
	return (JSON.parse(res.out) as { input: { properties: Record<string, Record<string, unknown>> } })
		.input
}

describe("the dashboard's published input schema", () => {
	it("states the Market path count's bounds, 1 to 10,000, not only in its help", async () => {
		const paths = (await dashboardInput()).properties["paths"]
		expect(paths).toMatchObject({ type: "integer", minimum: 1, maximum: 10000 })
	})

	it("states the seed as sixteen lower-case hex digits", async () => {
		const seed = (await dashboardInput()).properties["seed"]
		expect(seed).toMatchObject({ type: "string", pattern: "^[0-9a-f]{16}$" })
	})
})
