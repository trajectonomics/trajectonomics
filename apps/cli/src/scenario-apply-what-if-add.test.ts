// `scenario apply <name> --add` and `scenario fork --add`: an addition a projection read is the one that is saved
// (cli ADR-0057, ADR-0062).
import { describe, expect, it } from "bun:test"
import { AS_OF, baseFlags, projection, projectionHome } from "./projection/testing"
import { echoed } from "./projection-what-if-support"
import { resultOf, rowOf, scenario } from "./scenario-test-support"
import { apply, bodyOf, STALE, stored } from "./scenario-what-if-support"
import { capture } from "./test-support"

const EXTRA = {
	id: "extra",
	kind: "expense",
	amount: 100000,
	frequency: "monthly",
	start: AS_OF,
	growth: { bps: 0 },
}
const ADD = ["--add", `flows=${JSON.stringify(EXTRA)}`]

type Doc = { flows: { id: string; amount?: number }[] }

describe("scenario apply --add", () => {
	it("stores the hash that projection run echoes for the same addition, and echoes it", async () => {
		const home = await projectionHome()
		const projected = echoed(await projection(home, ["run", ...baseFlags(), ...ADD]))
		const res = await apply(home, ["base", ...ADD])
		expect(res.code).toBe(0)
		const body = bodyOf(res) as ReturnType<typeof bodyOf> & {
			additions?: { path: string; value: unknown }[]
		}
		expect(body.status).toBe("updated")
		expect(body.scenario.contentHash).toBe(projected.scenario.effectiveContentHash)
		expect(body.additions).toEqual([{ path: "flows.extra", value: EXTRA }])
		expect((body.scenario.document as Doc).flows.map((flow) => flow.id)).toContain("extra")
		expect((await stored(home)).contentHash).toBe(projected.scenario.effectiveContentHash)
	})

	it("refuses an id the stored plan already holds, and writes nothing", async () => {
		const home = await projectionHome()
		const before = await stored(home)
		const res = await apply(home, [
			"base",
			"--add",
			`flows=${JSON.stringify({ ...EXTRA, id: "rent" })}`,
		])
		expect(res.code).toBe(2)
		expect(JSON.parse(res.err).error).toMatchObject({
			path: "--add",
			details: { path: "flows.rent" },
		})
		expect((await stored(home)).row).toEqual(before.row)
	})

	it("refuses the same addition a second time, because the item now exists", async () => {
		const home = await projectionHome()
		expect((await apply(home, ["base", ...ADD])).code).toBe(0)
		expect((await apply(home, ["base", ...ADD])).code).toBe(2)
	})

	it("writes only over the plan its caller read, with --if-hash", async () => {
		const home = await projectionHome()
		const before = await stored(home)
		const stale = await apply(home, ["base", ...ADD, "--if-hash", STALE])
		expect(stale.code).toBe(5)
		expect(JSON.parse(stale.err).error).toMatchObject({ code: "scenario_changed" })
		const fresh = await apply(home, ["base", ...ADD, "--if-hash", before.contentHash])
		expect(fresh.code).toBe(0)
	})

	it("rolls back under --dry-run", async () => {
		const home = await projectionHome()
		const before = await stored(home)
		const res = await apply(home, ["base", ...ADD, "--dry-run"])
		expect(res.code).toBe(0)
		expect(bodyOf(res).dryRun).toBe(true)
		expect((await stored(home)).contentHash).toBe(before.contentHash)
	})

	it("stores a decimal item in minor units, and matches projection run --decimal", async () => {
		const home = await projectionHome()
		const flags = ["--add", `flows=${JSON.stringify({ ...EXTRA, amount: "1000.50" })}`, "--decimal"]
		const projected = echoed(await projection(home, ["run", ...baseFlags(), ...flags]))
		const res = await apply(home, ["base", ...flags])
		expect(res.code).toBe(0)
		expect(bodyOf(res).scenario.contentHash).toBe(projected.scenario.effectiveContentHash)
		const document = (await stored(home)).row["document"] as Doc
		expect(document.flows.find((flow) => flow.id === "extra")?.amount).toBe(100050)
	})

	it("refuses --add beside --file, at --file, with the hint that names the what-if form", async () => {
		const home = await projectionHome()
		const res = await capture(["scenario", "apply", "base", "--file", "-", ...ADD, "--json"], {
			TRAJ_HOME: home,
		})
		expect(res.code).toBe(2)
		expect(JSON.parse(res.err).error).toMatchObject({ path: "--file" })
	})
})

describe("scenario fork --add", () => {
	it("persists the addition in the fork and leaves the source as it was", async () => {
		const home = await projectionHome()
		const before = await stored(home)
		const res = await scenario(home, ["fork", "base", "more", ...ADD])
		expect(res.code).toBe(0)
		const data = resultOf(res)
		expect(data.additions).toEqual([{ path: "flows.extra", value: EXTRA }])
		expect((rowOf(data).document as Doc).flows.map((flow) => flow.id)).toContain("extra")
		expect((await stored(home)).contentHash).toBe(before.contentHash)
	})

	it("states no additions when none was given", async () => {
		const home = await projectionHome()
		const res = await scenario(home, ["fork", "base", "same"])
		expect(Object.hasOwn(resultOf(res), "additions")).toBe(false)
	})
})
