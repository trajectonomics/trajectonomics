import { describe, expect, it } from "bun:test"
import { edited } from "./baseline/testing"
import { setHousehold, shown } from "./scenario-household-support"
import { applyScenario, errorOf, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

/*
 * `scenario show`, `scenario fork` and `scenario tax` read the stored household too: a corrupt row is
 * the CLI's `internal` failure with the same message a projection read gives, never a throw (cli
 * ADR-0048).
 */

const HOUSEHOLD = {
	schemaVersion: 1,
	people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
	anchors: [],
}
const MESSAGE = "The stored household does not parse as a household."
const CORRUPT = "{not json"
const TWO_HOLDERS = JSON.stringify({
	...HOUSEHOLD,
	people: [...HOUSEHOLD.people, { id: "you", role: "holder", born: "1991-06", lifeExpectancy: 90 }],
})

/** A home whose base Scenario held a valid household, then the text a damaged row holds. */
async function corrupted(text: string = CORRUPT): Promise<string> {
	const home = scenarioHome()
	expect((await applyScenario(home, "base", SCENARIO_DOCUMENT)).code).toBe(0)
	expect((await setHousehold(home, HOUSEHOLD)).code).toBe(0)
	edited(home, `UPDATE scenario SET household = '${text}' WHERE name = 'base'`)
	return home
}

/** One command's human and `--json` answers to the same corrupt row. */
async function answers(home: string, argv: readonly string[]) {
	return {
		human: await capture(["scenario", ...argv], { TRAJ_HOME: home }),
		json: await capture(["scenario", ...argv, "--json"], { TRAJ_HOME: home }),
	}
}

/** Both answers to `scenario tax` over a home whose stored household holds this text. */
async function taxAnswers(text: string) {
	return answers(await corrupted(text), [
		"tax",
		"base",
		"--tax",
		"th-2026",
		"--filing-status",
		"single",
		"--dry-run",
	])
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

	it("is the internal failure of scenario apply", async () => {
		const res = await applyScenario(await corrupted(), "base", SCENARIO_DOCUMENT)
		expect(res.code).toBe(1)
		expect(errorOf(res).message).toBe(MESSAGE)
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

	it("is the internal failure of scenario tax, in both forms", async () => {
		const { human, json } = await taxAnswers(CORRUPT)
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

	it("is the internal failure of scenario tax when the row is JSON, but not a household", async () => {
		const { human, json } = await taxAnswers(TWO_HOLDERS)
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

describe("a stored household that parses", () => {
	it("is shown as it is stored, key for key", async () => {
		const home = scenarioHome()
		expect((await applyScenario(home, "base", SCENARIO_DOCUMENT)).code).toBe(0)
		expect((await setHousehold(home, HOUSEHOLD)).code).toBe(0)
		const household = (await shown(home)).household as Record<string, unknown>
		// The stored text is canonical, with sorted keys; a schema-built copy would reorder them.
		expect(Object.keys(household)).toEqual(["anchors", "people", "schemaVersion"])
		const [person] = household["people"] as Record<string, unknown>[]
		expect(Object.keys(person ?? {})).toEqual(["born", "id", "lifeExpectancy", "role"])
	})
})
