import { describe, expect, it } from "bun:test"
import { HOUSEHOLD, seedBase, setHousehold, shown } from "./scenario-household-support"
import { applyScenario, resultOf, scenario, scenarioHome } from "./scenario-test-support"
import { capture } from "./test-support"

/** The Owners of a household (cli ADR-0076): who owns each Flow, the holder, the partner, or both. */

const OWNED = {
	...HOUSEHOLD,
	schemaVersion: 2,
	owners: [
		{ path: "flows.salary", person: "me" },
		{ path: "flows.bonus", person: "partner" },
	],
}

describe("scenario household, version 2", () => {
	it("stores owners beside the anchors and prints them in show, as JSON and as text", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const res = await setHousehold(home, OWNED)
		expect(res.code).toBe(0)
		expect(resultOf(res).scenario.household).toEqual(OWNED)
		expect((await shown(home)).household).toEqual(OWNED)
		const human = await capture(["scenario", "show", "base"], { TRAJ_HOME: home })
		expect(human.code).toBe(0)
		expect(human.out).toContain("owners:")
		expect(human.out).toContain("path: flows.salary")
		expect(human.out).toContain("person: partner")
	})

	it("writes the same dates as the version 1 household with the same anchors", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const version1 = resultOf(await setHousehold(home, HOUSEHOLD)).scenario
		const version2 = resultOf(await setHousehold(home, OWNED)).scenario
		expect(version2.document).toEqual(version1.document)
		expect(version2.contentHash).toBe(version1.contentHash)
	})

	it("accepts shared, and an empty list of owners", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const shared = { ...OWNED, owners: [{ path: "flows.salary", person: "shared" }] }
		expect(resultOf(await setHousehold(home, shared)).scenario.household).toEqual(shared)
		const none = { ...OWNED, owners: [] }
		expect(resultOf(await setHousehold(home, none)).scenario.household).toEqual(none)
	})

	it("owns an Account by its id", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const account = { ...OWNED, owners: [{ path: "accounts.cash", person: "shared" }] }
		expect((await setHousehold(home, account)).code).toBe(0)
	})

	it("keeps a version 1 household's bytes: no owners, and the same row after a rewrite", async () => {
		const home = scenarioHome()
		await seedBase(home)
		expect(resultOf(await setHousehold(home, HOUSEHOLD)).scenario.household).toEqual(HOUSEHOLD)
		const again = resultOf(await setHousehold(home, HOUSEHOLD))
		expect(again.status).toBe("unchanged")
		expect((await shown(home)).household).not.toHaveProperty("owners")
	})

	it("keeps owners through apply and fork, which re-resolve the stored household", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, OWNED)
		const edited = resultOf(
			await scenario(home, ["apply", "base", "--set", "flows.bonus.amount=6000"]),
		)
		expect(edited.scenario.version).toBeGreaterThan(2)
		expect((await shown(home)).household).toEqual(OWNED)
		expect((await scenario(home, ["fork", "base", "copy"])).code).toBe(0)
		expect((await shown(home, "copy")).household).toEqual(OWNED)
	})
})

describe("a Scenario applied after its household", () => {
	it("is unaffected by owners: the document hash is the version 1 plan's", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, OWNED)
		const applied = await applyScenario(home, "base", (await shown(home)).document)
		expect(resultOf(applied).status).toBe("unchanged")
	})
})
