import { describe, expect, it } from "bun:test"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { allowancesHome, planFlags } from "./projection-allowances-support"
import { capture } from "./test-support"

/*
 * `projection allowances`' bytes, pinned in both forms on the taxed plan with an RMF contribution
 * and a ThaiESG one (cli ADR-0061). Re-baseline deliberately with
 * TRAJ_UPDATE_GOLDEN=1 bun test src/projection-allowances-golden.test.ts
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

/** The command's own bytes in one form, with the minted Scenario id replaced by a stable token. */
async function bytesOf(argv: readonly string[]): Promise<string> {
	const res = await capture(["projection", "allowances", ...argv], {
		TRAJ_HOME: await allowancesHome(),
	})
	expect(res.code).toBe(0)
	expect(res.err).toBe("")
	return `${res.out.replace(UUID, "the-scenario-id")}\n`
}

async function expectGolden(name: string, text: string): Promise<void> {
	await recordGoldenTextIn(GOLDENS, name, text)
	expect(text).toBe(await goldenTextIn(GOLDENS, name))
}

describe("projection allowances is pinned by goldens", () => {
	it("pins the JSON, byte for byte", async () => {
		await expectGolden("allowances.output", await bytesOf([...planFlags(), "--json"]))
	})

	it("pins the human form, byte for byte", async () => {
		await expectGolden("allowances-human.output", await bytesOf(planFlags()))
	})
})
