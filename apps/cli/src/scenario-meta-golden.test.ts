import { describe, expect, it } from "bun:test"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { goldenHome } from "./interchange/testing"
import { scenario } from "./scenario-test-support"

/*
 * What `scenario list` and `scenario show` print for a plan with notes that is the main plan, and for
 * one with neither (cli ADR-0071). The Dashboard's contract parses these bytes
 * (`apps/web/src/lib/contract/scenario-meta.test.ts`), so a field the CLI adds or renames fails there.
 * Record them deliberately with TRAJ_UPDATE_GOLDEN=1.
 */
const GOLDENS = new URL("./scenario/fixtures/", import.meta.url)
const PLAIN = "0194c000-0001-7000-8000-000000000001"

async function pinned(name: string, argv: readonly string[]): Promise<void> {
	const res = await scenario(await goldenHome(), argv)
	expect(res.code).toBe(0)
	expect(res.err).toBe("")
	await recordGoldenTextIn(GOLDENS, name, `${res.out}\n`)
	expect(`${res.out}\n`).toBe(await goldenTextIn(GOLDENS, name))
}

describe("the notes and the main mark are pinned by goldens", () => {
	it("pins the list, where base is the main plan and has notes", async () => {
		await pinned("list.output", ["list"])
	})

	it("pins show --decimal of the main plan with its notes (the form the Dashboard reads)", async () => {
		await pinned("show-main.output", ["show", "base", "--decimal"])
	})

	it("pins show of a plan with neither", async () => {
		await pinned("show-plain.output", ["show", PLAIN, "--decimal"])
	})
})
