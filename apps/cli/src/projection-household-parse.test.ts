import { describe, expect, it } from "bun:test"
import { edited } from "./baseline/testing"
import { baseFlags, dateFlags, errorOf, projection, projectionHome } from "./projection/testing"
import { setHousehold } from "./scenario-household-support"
import { capture } from "./test-support"

/*
 * A stored household is parsed by the reads that may use it (run, path, fi and chance; cli ADR-0048):
 * a corrupt row is the CLI's `internal` failure there, never a throw. A compare and the allowances
 * read, which never use it, skip it and keep working.
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

	it("keeps the SyntaxError for TRAJ_DEBUG=1, and nothing else without it", async () => {
		const home = await corrupted("{not json")
		const quiet = await projection(home, ["run", ...baseFlags()])
		const loud = await capture(["projection", "run", ...baseFlags(), "--json"], {
			TRAJ_HOME: home,
			TRAJ_DEBUG: "1",
		})
		expect(quiet.err).not.toContain("SyntaxError")
		expect(loud.err).toContain("SyntaxError")
		// The diagnostic sits above the failure, which stays byte-identical.
		expect(loud.err.endsWith(quiet.err)).toBe(true)
		expect(loud.code).toBe(1)
	})

	it("never fails a compare, which does not read the household", async () => {
		const home = await corrupted("{not json")
		const res = await projection(home, ["compare", "base", "base", ...dateFlags()])
		expect(res.err).toBe("")
		expect(res.code).toBe(0)
	})

	it("never fails a what-if compare either, whose second side is the same plan with a Set", async () => {
		const home = await corrupted("{not json")
		const argv = ["compare", "base", "--set", "flows.salary.amount=9000000", ...dateFlags()]
		const res = await projection(home, argv)
		expect(res.err).toBe("")
		expect(res.code).toBe(0)
	})
})
