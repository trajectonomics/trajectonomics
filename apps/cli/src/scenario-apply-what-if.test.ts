// `scenario apply <name> --set/--without`: a what-if applied to the stored plan it came from (cli ADR-0057).
// Its Overrides are the ones `projection run` applies, so the stored hash is the one it echoes.
import { describe, expect, it } from "bun:test"
import { baseFlags, projection, projectionHome } from "./projection/testing"
import { echoed } from "./projection-what-if-support"
import { applyScenario, errorOf } from "./scenario-test-support"
import { apply, bodyOf, derivedScenario, stored } from "./scenario-what-if-support"

describe("scenario apply --set, in place", () => {
	it("stores the hash that projection run echoes for the same Overrides", async () => {
		const home = await projectionHome()
		const flags = ["--set", "flows.rent.amount=2600000"]
		const projected = echoed(await projection(home, ["run", ...baseFlags(), ...flags]))
		const res = await apply(home, ["base", ...flags])
		expect(res.code).toBe(0)
		const body = bodyOf(res)
		expect(body).toMatchObject({ dryRun: false, status: "updated" })
		expect(body.scenario.contentHash).toBe(projected.scenario.effectiveContentHash)
		expect((await stored(home)).contentHash).toBe(projected.scenario.effectiveContentHash)
		expect(body.overrides).toEqual([{ path: "flows.rent.amount", value: 2600000 }])
		expect(body.removals).toEqual([])
	})

	it("applies a removal and a Set together, and the hash matches projection run", async () => {
		const home = await projectionHome()
		const flags = ["--without", "flows.rent", "--set", "flows.salary.amount=9000000"]
		const projected = echoed(await projection(home, ["run", ...baseFlags(), ...flags]))
		const res = await apply(home, ["base", ...flags])
		expect(res.code).toBe(0)
		const body = bodyOf(res)
		expect(body.scenario.contentHash).toBe(projected.scenario.effectiveContentHash)
		expect(body.removals).toEqual(["flows.rent"])
		expect(body.overrides).toEqual([{ path: "flows.salary.amount", value: 9000000 }])
		const flows = (body.scenario.document as { flows: { id: string }[] }).flows
		expect(flows.map((flow) => flow.id)).not.toContain("rent")
	})

	it("converts a decimal Set exactly, and matches projection run --decimal", async () => {
		const home = await projectionHome()
		const flags = ["--set", 'flows.rent.amount="25000.50"', "--decimal"]
		const projected = echoed(await projection(home, ["run", ...baseFlags(), ...flags]))
		const res = await apply(home, ["base", ...flags])
		expect(res.code).toBe(0)
		const body = bodyOf(res)
		expect(body.scenario.contentHash).toBe(projected.scenario.effectiveContentHash)
		// The echo keeps the value as given; the stored document holds the minor units.
		expect(body.overrides).toEqual([{ path: "flows.rent.amount", value: "25000.50" }])
		// The printed row is in decimal form under --decimal; `scenario show` reads the stored minor units.
		const shownRent = (await stored(home)).row["document"] as {
			flows: { id: string; amount: number }[]
		}
		expect(shownRent.flows.find((flow) => flow.id === "rent")?.amount).toBe(2_500_050)
	})

	it("refuses a Set on a removed item at the --set, with the message projection run gives", async () => {
		const home = await projectionHome()
		const flags = ["--without", "flows.rent", "--set", "flows.rent.amount=1"]
		const projected = errorOf(await projection(home, ["run", ...baseFlags(), ...flags]))
		const res = await apply(home, ["base", ...flags])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--set",
			details: { index: 0, segment: "rent" },
		})
		expect(errorOf(res).message).toBe(projected.message)
	})

	it("refuses a path that is not a list item, at the --without, with the hint", async () => {
		const home = await projectionHome()
		const res = await apply(home, ["base", "--without", "economy.inflation"])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({
			code: "invalid_input",
			path: "--without",
			details: { index: 0, path: "economy.inflation" },
		})
		expect(error.hint).toContain("--without takes a list item")
	})

	it("names the nearest id for an unknown path, and writes nothing", async () => {
		const home = await projectionHome()
		const before = await stored(home)
		const res = await apply(home, ["base", "--set", "flows.rnet.amount=1"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			path: "--set",
			details: { segment: "rnet", suggestion: "flows.rent.amount" },
		})
		expect(await stored(home)).toEqual(before)
	})

	it("refuses a removal the plan cannot take, at the --without, as projection run does", async () => {
		const home = await projectionHome()
		await applyScenario(home, "derived", derivedScenario())
		const res = await apply(home, ["derived", "--without", "flows.invest"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--without",
			details: { index: 0, path: "flows.invest" },
		})
		expect((await stored(home, "derived")).version).toBe(1)
	})

	it("refuses a Set the plan cannot take, at the --set that caused it", async () => {
		const home = await projectionHome()
		const res = await apply(home, ["base", "--set", "flows.rent.amount=-1"])
		expect(res.code).toBe(2)
		expect(errorOf(res).path).toBe("--set")
	})
})

describe("scenario apply --set, writes nothing unless the plan changes", () => {
	it("reports a Set that leaves the plan as it is as unchanged, exits 0, and adds no version", async () => {
		const home = await projectionHome()
		const before = await stored(home)
		const res = await apply(home, ["base", "--set", "flows.rent.amount=2500000"])
		expect(res.code).toBe(0)
		expect(bodyOf(res)).toMatchObject({ status: "unchanged", dryRun: false })
		expect((await stored(home)).row).toEqual(before.row)
	})

	it("reports a dry run as dryRun, and rolls the write back", async () => {
		const home = await projectionHome()
		const before = await stored(home)
		const res = await apply(home, ["base", "--set", "flows.rent.amount=2600000", "--dry-run"])
		expect(res.code).toBe(0)
		expect(bodyOf(res)).toMatchObject({ dryRun: true, status: "updated" })
		expect((await stored(home)).row).toEqual(before.row)
	})
})
