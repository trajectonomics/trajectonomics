import { describe, expect, it } from "bun:test"
import { edited } from "./baseline/testing"
import { setHousehold } from "./scenario-household-support"
import { applyScenario, errorOf, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

/*
 * `scenario show` and `scenario fork` read the stored household too: a corrupt row is the CLI's
 * `internal` failure with the same message a projection read gives, never a throw (cli ADR-0048).
 */

const HOUSEHOLD = {
	schemaVersion: 1,
	people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
	anchors: [],
}
const MESSAGE = "The stored household does not parse as a household."

/** A home whose base Scenario held a valid household, then the text a damaged row holds. */
async function corrupted(): Promise<string> {
	const home = scenarioHome()
	expect((await applyScenario(home, "base", SCENARIO_DOCUMENT)).code).toBe(0)
	expect((await setHousehold(home, HOUSEHOLD)).code).toBe(0)
	edited(home, `UPDATE scenario SET household = '{not json' WHERE name = 'base'`)
	return home
}

/** One command's human and `--json` answers to the same corrupt row. */
async function answers(home: string, argv: readonly string[]) {
	return {
		human: await capture(["scenario", ...argv], { TRAJ_HOME: home }),
		json: await capture(["scenario", ...argv, "--json"], { TRAJ_HOME: home }),
	}
}

describe("a stored household that does not parse", () => {
	it("is the internal failure of scenario show, in both forms", async () => {
		const { human, json } = await answers(await corrupted(), ["show", "base"])
		expect(human.code).toBe(1)
		expect(human.out).toBe("")
		expect(human.err).toContain("error: internal: ")
		expect(human.err).toContain(MESSAGE)
		expect(json.code).toBe(1)
		const body = errorOf(json)
		expect(body.code).toBe("internal")
		expect(body.message).toBe(MESSAGE)
		expect(body.hint).toContain("Report it at")
	})

	it("is the internal failure of scenario fork, in both forms", async () => {
		const { human, json } = await answers(await corrupted(), ["fork", "base", "copy"])
		expect(human.code).toBe(1)
		expect(human.out).toBe("")
		expect(human.err).toContain("error: internal: ")
		expect(human.err).toContain(MESSAGE)
		expect(json.code).toBe(1)
		const body = errorOf(json)
		expect(body.code).toBe("internal")
		expect(body.message).toBe(MESSAGE)
	})
})
