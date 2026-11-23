// `--add` with `--decimal`, and on the reads beside `projection run` (cli ADR-0062).
import { describe, expect, it } from "bun:test"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import {
	AS_OF,
	baseFlags,
	dateFlags,
	errorOf,
	fi,
	projection,
	projectionHome,
} from "./projection/testing"
import { echoed } from "./projection-what-if-support"

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

describe("--add with --decimal", () => {
	it("converts the item's money exactly, hashes as minor units do, and echoes the item as given", async () => {
		const home = await projectionHome()
		const decimal = await projection(home, [
			"run",
			...baseFlags(),
			...add("flows", { ...EXTRA, amount: "1000.50" }),
			"--decimal",
		])
		const minor = await projection(home, [
			"run",
			...baseFlags(),
			...add("flows", { ...EXTRA, amount: 100050 }),
		])
		expect(decimal.code).toBe(0)
		expect(echoed(decimal).scenario.effectiveContentHash).toBe(
			echoed(minor).scenario.effectiveContentHash,
		)
		expect((JSON.parse(decimal.out) as Added).additions).toEqual([
			{ path: "flows.extra", value: { ...EXTRA, amount: "1000.50" } },
		])
	})

	it("refuses a JSON number as invalid input, and too many places as INVALID_AMOUNT, at the --add", async () => {
		const home = await projectionHome()
		for (const [amount, code, exit] of [
			[1000.5, "invalid_input", 2],
			["1.001", "INVALID_AMOUNT", 3],
			["1,000", "invalid_input", 2],
		] as const) {
			const res = await projection(home, [
				"run",
				...baseFlags(),
				...add("flows", { ...EXTRA, amount }),
				"--decimal",
			])
			expect(res.code).toBe(exit)
			expect(errorOf(res)).toMatchObject({ code, path: "--add" })
		}
	})
})

describe("--add on the other reads", () => {
	it("fi echoes the addition", async () => {
		const home = await projectionHome()
		const res = await fi(home, [...baseFlags(), ...add("flows", EXTRA)])
		expect(res.code).toBe(0)
		expect((JSON.parse(res.out) as Added).additions).toEqual([
			{ path: "flows.extra", value: EXTRA },
		])
	})

	it("compare makes a what-if of A, and names the addition under side b", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["compare", "base", ...add("flows", EXTRA), ...dateFlags()])
		expect(res.code).toBe(0)
		const sides = (JSON.parse(res.out) as { sides: { a: Added; b: Added } }).sides
		expect(sides.a.additions).toBeUndefined()
		expect(sides.b.additions).toEqual([{ path: "flows.extra", value: EXTRA }])
	})

	it("compare refuses --add beside a second Scenario", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"compare",
			"base",
			"unreachable",
			...add("flows", EXTRA),
			...dateFlags(),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ path: "--add" })
	})
})

describe("--add into accounts and milestones", () => {
	it("adds a contribution into an Account of the plan", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			...add("flows", {
				id: "pay-extra",
				kind: "contribution",
				target: FIXTURE_ACCOUNTS.investment,
				amount: 50000,
				frequency: "monthly",
				start: AS_OF,
				growth: { bps: 0 },
			}),
		])
		expect(res.code).toBe(0)
	})

	it("begins a list the document leaves out", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			...add("milestones", {
				id: "someday",
				combine: "all",
				criteria: [{ id: "start", kind: "date", on: "2026-06-30" }],
			}),
		])
		expect(res.code).toBe(0)
		expect((JSON.parse(res.out) as Added).additions?.[0]?.path).toBe("milestones.someday")
	})
})
