import { describe, expect, it } from "bun:test"
import { dateFlags, errorOf, projection, projectionHome } from "./projection/testing"
import { chanceBody, chanceFlags, modelFile } from "./projection-chance-support"
import { type Echoed, echoed } from "./projection-what-if-support"

describe("projection compare --without and --decimal", () => {
	it("makes a what-if of one Scenario with a removal, on side B only", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"compare",
			"base",
			"--without",
			"flows.rent",
			...dateFlags(),
		])
		expect(res.code).toBe(0)
		const body = JSON.parse(res.out) as { sides: { a: Echoed; b: Echoed } }
		expect(body.sides.a.removals).toEqual([])
		expect(body.sides.b.removals).toEqual(["flows.rent"])
	})

	it("refuses --without beside a second Scenario", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"compare",
			"base",
			"unreachable",
			"--without",
			"flows.rent",
			...dateFlags(),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ path: "--without" })
	})

	it("compares a decimal what-if against the base with the same hash as minor units", async () => {
		const home = await projectionHome()
		const decimal = await projection(home, [
			"compare",
			"base",
			"--set",
			'flows.salary.amount="90000.50"',
			"--decimal",
			...dateFlags(),
		])
		const minor = await projection(home, [
			"compare",
			"base",
			"--set",
			"flows.salary.amount=9000050",
			...dateFlags(),
		])
		const hashOf = (res: { out: string }) =>
			(JSON.parse(res.out) as { sides: { b: Echoed } }).sides.b.scenario.effectiveContentHash
		expect(decimal.code).toBe(0)
		expect(hashOf(decimal)).toBe(hashOf(minor))
	})
})

describe("projection chance --set", () => {
	it("moves the success share of a what-if that stresses the plan", async () => {
		const home = await projectionHome()
		const model = modelFile(home)
		const plain = await projection(home, ["chance", ...chanceFlags(model)])
		const stressed = await projection(home, [
			"chance",
			...chanceFlags(model),
			"--set",
			"flows.rent.amount=90000000",
		])
		expect(plain.code).toBe(0)
		expect(stressed.code).toBe(0)
		expect(chanceBody(stressed).successBps).toBeLessThan(chanceBody(plain).successBps)
		expect(echoed(stressed).overrides).toEqual([{ path: "flows.rent.amount", value: 90000000 }])
		expect(echoed(stressed).scenario.effectiveContentHash).not.toBe(
			echoed(plain).scenario.contentHash,
		)
	})
})
