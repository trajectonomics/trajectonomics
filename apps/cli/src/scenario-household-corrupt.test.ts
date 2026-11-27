import { describe, expect, it } from "bun:test"
import { edited } from "./baseline/testing"
import { isAppError } from "./errors"
import { allowancesOf } from "./scenario/tax/allowances"
import { coupleOf, holderIdOf } from "./scenario/tax/couple"
import { departedClaimants } from "./scenario/tax/departed-claims"
import { filerScopeOf } from "./scenario/tax/filer-scope"
import type { TaxRequest } from "./scenario/tax/flags"
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

/** A home whose base Scenario held a valid household, then the text a damaged row holds. */
async function corrupted(): Promise<string> {
	const home = scenarioHome()
	expect((await applyScenario(home, "base", SCENARIO_DOCUMENT)).code).toBe(0)
	expect((await setHousehold(home, HOUSEHOLD)).code).toBe(0)
	edited(home, `UPDATE scenario SET household = '${CORRUPT}' WHERE name = 'base'`)
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
		const { human, json } = await answers(await corrupted(), [
			"tax",
			"base",
			"--tax",
			"th-2026",
			"--filing-status",
			"single",
			"--dry-run",
		])
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
})

/*
 * A tax write reads the household through `coupleOf` before the Filers or the departed claims, so a
 * corrupt row stops there; these call every reader to pin that each refuses it, not throws.
 */
describe("the tax readers of a stored household", () => {
	it("refuse it as the internal failure, not a throw", () => {
		const kept = {
			jurisdiction: "th-2026",
			filingStatus: "single",
			children: 0,
			childrenAtHigherRate: 0,
			allowances: allowancesOf({}),
		} satisfies TaxRequest
		const readers = [
			holderIdOf(CORRUPT),
			coupleOf(CORRUPT),
			filerScopeOf(CORRUPT, SCENARIO_DOCUMENT, "married_joint"),
			departedClaimants(kept, CORRUPT),
		]
		for (const reader of readers) {
			expect(isAppError(reader)).toBe(true)
			if (isAppError(reader)) {
				expect(reader.body.code).toBe("internal")
				expect(reader.body.message).toBe(MESSAGE)
			}
		}
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
