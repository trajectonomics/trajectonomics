// `--add <list>=<json>` (cli ADR-0062): a what-if puts one new item on a list, transiently.
import { describe, expect, it } from "bun:test"
import { AS_OF, baseFlags, errorOf, projection, projectionHome } from "./projection/testing"
import { closingOf, echoed } from "./projection-what-if-support"

const EXTRA = {
	id: "extra",
	kind: "expense",
	amount: 100000,
	frequency: "monthly",
	start: AS_OF,
	growth: { bps: 0 },
}
const add = (list: string, item: unknown): string[] => ["--add", `${list}=${JSON.stringify(item)}`]

type Added = ReturnType<typeof echoed> & { additions?: { path: string; value: unknown }[] }

describe("projection run --add", () => {
	it("adds one item, echoes it, and changes the effective hash and the figures", async () => {
		const home = await projectionHome()
		const plain = await projection(home, ["run", ...baseFlags()])
		const res = await projection(home, ["run", ...baseFlags(), ...add("flows", EXTRA)])
		expect(res.code).toBe(0)
		const body = JSON.parse(res.out) as Added
		expect(body.additions).toEqual([{ path: "flows.extra", value: EXTRA }])
		expect(body.overrides).toEqual([])
		expect(body.removals).toEqual([])
		expect(body.scenario.effectiveContentHash).not.toBe(body.scenario.contentHash)
		expect(closingOf(res)).not.toBe(closingOf(plain))
	})

	it("leaves the bytes of a run without --add as they were: no additions key", async () => {
		const home = await projectionHome()
		const plain = JSON.parse((await projection(home, ["run", ...baseFlags()])).out) as object
		expect(Object.hasOwn(plain, "additions")).toBe(false)
	})

	it("never writes: the stored Scenario keeps its hash after an addition", async () => {
		const home = await projectionHome()
		const before = echoed(await projection(home, ["run", ...baseFlags()])).scenario.contentHash
		await projection(home, ["run", ...baseFlags(), ...add("flows", EXTRA)])
		const after = echoed(await projection(home, ["run", ...baseFlags()])).scenario.contentHash
		expect(after).toBe(before)
	})

	it("has the effective hash of the same document with the item stored", async () => {
		const home = await projectionHome()
		const one = await projection(home, ["run", ...baseFlags(), ...add("flows", EXTRA)])
		const two = await projection(home, [
			"run",
			...baseFlags(),
			...add("flows", { ...EXTRA, amount: 1 }),
			"--set",
			"flows.extra.amount=100000",
		])
		expect(echoed(two).scenario.effectiveContentHash).toBe(
			echoed(one).scenario.effectiveContentHash,
		)
	})

	it("applies additions in command-line order, after removals and before Sets", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			...add("flows", EXTRA),
			...add("flows", { ...EXTRA, id: "second" }),
			"--set",
			"flows.extra.amount=200000",
			"--without",
			"flows.rent",
		])
		expect(res.code).toBe(0)
		const body = JSON.parse(res.out) as Added
		expect(body.additions?.map((added) => added.path)).toEqual(["flows.extra", "flows.second"])
		expect(body.overrides).toEqual([{ path: "flows.extra.amount", value: 200000 }])
		expect(body.removals).toEqual(["flows.rent"])
	})

	it("refuses an --add whose id the same call's --without took out, and names --set", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			"--without",
			"flows.rent",
			...add("flows", { ...EXTRA, id: "rent" }),
		])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({
			code: "invalid_input",
			path: "--add",
			details: { index: 0, path: "flows.rent", list: "flows", id: "rent" },
		})
		expect(error.hint).toContain("--set flows.rent.<key>=<value>")
	})

	it("refuses to remove an item the same call adds, because removals come first", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			...add("flows", EXTRA),
			"--without",
			"flows.extra",
		])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({ path: "--without", details: { segment: "extra" } })
		expect(error.hint).toContain("Every --without runs before every --add")
	})

	it("refuses an id the list already holds, at the --add, and names --set", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			...add("flows", { ...EXTRA, id: "rent" }),
		])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({
			code: "invalid_input",
			path: "--add",
			details: { index: 0, path: "flows.rent", list: "flows", id: "rent" },
		})
		expect(error.hint).toContain("--set")
	})

	it("refuses the same id given twice, at the second --add", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			...add("flows", EXTRA),
			...add("flows", EXTRA),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			path: "--add",
			details: { index: 1, path: "flows.extra" },
		})
	})

	it("refuses a list that is not one of accounts, flows and milestones", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["run", ...baseFlags(), ...add("levies", { id: "x" })])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({ path: "--add", details: { index: 0, path: "levies" } })
		expect(error.hint).toContain("accounts, flows, milestones")
	})

	it("refuses an item that is not JSON, not an object, or has no id", async () => {
		const home = await projectionHome()
		for (const value of ["nope", "[1]", '{"kind":"expense"}', '{"id":""}', '{"id":3}']) {
			const res = await projection(home, ["run", ...baseFlags(), "--add", `flows=${value}`])
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({ path: "--add", details: { path: "flows" } })
		}
		const bare = await projection(home, ["run", ...baseFlags(), "--add", "flows"])
		expect(bare.code).toBe(2)
		expect(errorOf(bare)).toMatchObject({ path: "--add" })
	})

	it("checks the item as the engine checks a stored one, and names the added path", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			...add("flows", { ...EXTRA, amount: -1 }),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--add",
			details: {
				index: 0,
				path: "flows.extra",
				documentPath: "document.flows.3.amount",
				code: "NEGATIVE_AMOUNT",
			},
		})
	})

	it("refuses a contribution whose target is not an Account, at the added item", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			...add("flows", {
				id: "to-nowhere",
				kind: "contribution",
				target: "ghost",
				amount: 1,
				frequency: "monthly",
				start: AS_OF,
				growth: { bps: 0 },
			}),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ path: "--add", details: { path: "flows.to-nowhere" } })
	})
})
