import { describe, expect, it } from "bun:test"
import { edited } from "./baseline/testing"
import { baseFlags, dateFlags, errorOf, projection, projectionHome } from "./projection/testing"
import { setHousehold } from "./scenario-household-support"

/*
 * A stored household is parsed only by the reads that state ages (cli ADR-0048): a corrupt row is
 * the CLI's `internal` failure there, never a throw, and a compare, which does not read it, keeps
 * working.
 */

const VALID = {
	schemaVersion: 1,
	people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
	anchors: [],
}

/** A home whose base Scenario held a valid household, then the text a damaged row holds. */
async function corrupted(text: string): Promise<string> {
	const home = await projectionHome()
	expect((await setHousehold(home, VALID)).code).toBe(0)
	edited(home, `UPDATE scenario SET household = '${text}' WHERE name = 'base'`)
	return home
}

describe("a stored household that does not parse", () => {
	it("returns the CLI's internal envelope from a read that states ages", async () => {
		const home = await corrupted("{not json")
		const res = await projection(home, ["run", ...baseFlags()])
		expect(res.code).toBe(1)
		const body = errorOf(res)
		expect(body.code).toBe("internal")
		expect(body.message).toBe("The stored household does not parse as a household.")
		expect(body.hint).toContain("Report it at")
	})

	it("returns the same envelope when the text parses but is not a household", async () => {
		const home = await corrupted('{"schemaVersion":99}')
		const res = await projection(home, ["run", ...baseFlags()])
		expect(res.code).toBe(1)
		expect(errorOf(res).code).toBe("internal")
	})

	it("never fails a compare, which does not read the household", async () => {
		const home = await corrupted("{not json")
		const res = await projection(home, ["compare", "base", "base", ...dateFlags()])
		expect(res.err).toBe("")
		expect(res.code).toBe(0)
	})
})
