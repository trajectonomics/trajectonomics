// An `--add` never replaces a removed item, so the plan a write saves is the plan a projection read,
// even when the item has a household anchor that every save re-applies (cli ADR-0048, ADR-0062).
import { describe, expect, it } from "bun:test"
import { baseFlags, projection, projectionHome } from "./projection/testing"
import { echoed } from "./projection-what-if-support"
import { HOLDER } from "./scenario-household-support"
import { scenario } from "./scenario-test-support"
import { apply, stored } from "./scenario-what-if-support"

const SALARY = {
	id: "salary",
	kind: "income",
	amount: 9_000_000,
	earned: true,
	frequency: "monthly",
	growth: "inflation",
	start: "2026-04-01",
}
const REPLACE = ["--without", "flows.salary", "--add", `flows=${JSON.stringify(SALARY)}`]
const HOUSEHOLD = {
	schemaVersion: 1,
	people: [HOLDER],
	anchors: [{ path: "flows.salary.end", person: "me", age: 60 }],
}

/** A projection home whose `base` plan carries a household that pins the salary's end. */
async function anchoredHome(): Promise<string> {
	const home = await projectionHome()
	const res = await scenario(home, ["household", "base", "--file", "-"], JSON.stringify(HOUSEHOLD))
	expect(res.code).toBe(0)
	return home
}

describe("--add beside the --without of the same item, on a plan with an anchor", () => {
	it("is refused on a projection read, at --add, naming --set", async () => {
		const home = await anchoredHome()
		const res = await projection(home, ["run", ...baseFlags(), ...REPLACE])
		expect(res.code).toBe(2)
		const error = JSON.parse(res.err).error
		expect(error).toMatchObject({
			code: "invalid_input",
			path: "--add",
			details: { path: "flows.salary" },
		})
		expect(error.hint).toContain("--set flows.salary.<key>=<value>")
	})

	it("is refused by scenario apply, which writes nothing", async () => {
		const home = await anchoredHome()
		const before = await stored(home)
		const res = await apply(home, ["base", ...REPLACE])
		expect(res.code).toBe(2)
		expect(JSON.parse(res.err).error).toMatchObject({
			path: "--add",
			details: { path: "flows.salary" },
		})
		expect((await stored(home)).row).toEqual(before.row)
	})

	it("is refused by scenario fork, which creates nothing", async () => {
		const home = await anchoredHome()
		const res = await scenario(home, ["fork", "base", "hh3", ...REPLACE])
		expect(res.code).toBe(2)
		expect(JSON.parse(res.err).error).toMatchObject({
			path: "--add",
			details: { path: "flows.salary" },
		})
		expect((await scenario(home, ["show", "hh3"])).code).not.toBe(0)
	})

	it("leaves an anchored item changed with --set at the hash the write stores", async () => {
		const home = await anchoredHome()
		const set = ["--set", "flows.salary.amount=9000000"]
		const projected = echoed(await projection(home, ["run", ...baseFlags(), ...set]))
		const res = await apply(home, ["base", ...set])
		expect(res.code).toBe(0)
		expect((await stored(home)).contentHash).toBe(projected.scenario.effectiveContentHash)
	})
})
