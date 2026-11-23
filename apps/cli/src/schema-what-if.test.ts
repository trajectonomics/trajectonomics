import { describe, expect, it } from "bun:test"
import { capture } from "./test-support"

/** The input properties a leaf publishes, and each property's flag spelling (cli ADR-0054). */
type Input = { properties: Record<string, { flag?: string }>; required: string[] }

async function inputOf(path: readonly string[]): Promise<Input> {
	const res = await capture(["schema", ...path, "--json"])
	expect(res.code).toBe(0)
	return (JSON.parse(res.out) as { input: Input }).input
}

const WHAT_IF_LEAVES: readonly (readonly string[])[] = [
	["projection", "run"],
	["projection", "compare"],
	["fi"],
	["projection", "chance"],
	["scenario", "fork"],
]

describe("what-if overrides in traj schema", () => {
	for (const path of WHAT_IF_LEAVES) {
		it(`publishes --without and --decimal on ${path.join(" ")}`, async () => {
			const input = await inputOf(path)
			expect(input.properties["without"]?.flag).toBe("--without")
			expect(input.properties["decimal"]?.flag).toBe("--decimal")
			expect(input.required).not.toContain("without")
			expect(input.required).not.toContain("decimal")
		})
	}

	it("publishes the leaves that take --set, and projection chance now takes it", async () => {
		const chance = await inputOf(["projection", "chance"])
		expect(chance.properties["set"]?.flag).toBe("--set")
	})

	it("lists every input of projection compare, with the new flags among them", async () => {
		const data = await inputOf(["projection", "compare"])
		expect(Object.keys(data.properties).sort()).toEqual([
			"a",
			"age",
			"asOf",
			"b",
			"birthDate",
			"carryIn",
			"decimal",
			"horizon",
			"set",
			"without",
		])
	})
})
