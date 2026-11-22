import { describe, expect, it } from "bun:test"
import { capture } from "./test-support"
import { ledgerHome } from "./tx-test-support"

/** The `--set` description a leaf's published input schema carries. */
async function setDescriptionOf(path: readonly string[]): Promise<string> {
	const res = await capture(["schema", ...path, "--json"], { TRAJ_HOME: ledgerHome() })
	expect(res.code).toBe(0)
	const detail = JSON.parse(res.out) as {
		input: { properties: Record<string, { description?: string }> }
	}
	return detail.input.properties["set"]?.description ?? ""
}

const LEAVES: readonly (readonly string[])[] = [
	["projection", "run"],
	["projection", "compare"],
	["fi"],
]

describe("the --set amounts in traj schema", () => {
	for (const path of LEAVES) {
		it(`states that amounts are in satang on ${path.join(" ")}`, async () => {
			expect(await setDescriptionOf(path)).toContain("amounts are in satang")
		})
	}
})
