// `scenario apply <name> --set/--without --if-hash`: a what-if writes only over the plan its caller read (cli ADR-0055, ADR-0057).
import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { errorOf, scenarioHome } from "./scenario-test-support"
import { apply, bodyOf, STALE, stored } from "./scenario-what-if-support"

describe("scenario apply --set, with --if-hash", () => {
	it("writes when the stored contentHash is the one the caller read", async () => {
		const home = await projectionHome()
		const before = await stored(home)
		const res = await apply(home, [
			"base",
			"--set",
			"flows.rent.amount=2600000",
			"--if-hash",
			before.contentHash,
		])
		expect(res.code).toBe(0)
		expect(bodyOf(res).status).toBe("updated")
		expect((await stored(home)).version).toBe(before.version + 1)
	})

	it("refuses a plan that moved on, with scenario_changed, and writes nothing", async () => {
		const home = await projectionHome()
		const before = await stored(home)
		await apply(home, ["base", "--set", "economy.inflation=100"])
		const moved = await stored(home)
		const res = await apply(home, [
			"base",
			"--set",
			"flows.rent.amount=2600000",
			"--if-hash",
			before.contentHash,
		])
		expect(res.code).toBe(5)
		expect(errorOf(res)).toMatchObject({
			code: "scenario_changed",
			path: "--if-hash",
			details: { expectedHash: before.contentHash, storedHash: moved.contentHash },
		})
		expect((await stored(home)).row).toEqual(moved.row)
	})

	it("refuses a dry run over a moved plan the same way", async () => {
		const home = await projectionHome()
		const before = await stored(home)
		await apply(home, ["base", "--set", "economy.inflation=100"])
		const moved = await stored(home)
		const res = await apply(home, [
			"base",
			"--set",
			"flows.rent.amount=2600000",
			"--if-hash",
			before.contentHash,
			"--dry-run",
		])
		expect(res.code).toBe(5)
		expect(errorOf(res).code).toBe("scenario_changed")
		expect((await stored(home)).row).toEqual(moved.row)
	})

	it("reports a stale hash before a --set it would otherwise refuse", async () => {
		const home = await projectionHome()
		const before = await stored(home)
		await apply(home, ["base", "--set", "economy.inflation=100"])
		const res = await apply(home, [
			"base",
			"--set",
			"flows.rnet.amount=1",
			"--if-hash",
			before.contentHash,
		])
		expect(res.code).toBe(5)
		expect(errorOf(res)).toMatchObject({ code: "scenario_changed", path: "--if-hash" })
	})

	it("refuses a hash for a plan that is not stored, with storedHash null", async () => {
		const home = scenarioHome()
		const res = await apply(home, ["ghost", "--set", "flows.rent.amount=1", "--if-hash", STALE])
		expect(res.code).toBe(5)
		expect(errorOf(res)).toMatchObject({
			code: "scenario_changed",
			details: { storedHash: null },
		})
	})

	it("names a plan that is not stored, with no hash, as not_found at the name", async () => {
		const home = scenarioHome()
		const res = await apply(home, ["ghost", "--set", "flows.rent.amount=1"])
		expect(res.code).toBe(4)
		expect(errorOf(res)).toMatchObject({
			code: "not_found",
			path: "name",
			details: { resource: "scenario" },
		})
	})

	it("refuses a malformed hash as invalid input at --if-hash", async () => {
		const home = await projectionHome()
		const res = await apply(home, ["base", "--set", "flows.rent.amount=1", "--if-hash", "abc"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--if-hash" })
	})
})
