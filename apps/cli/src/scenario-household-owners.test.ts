import { describe, expect, it } from "bun:test"
import { HOUSEHOLD, seedBase, setHousehold, shown } from "./scenario-household-support"
import { applyScenario, resultOf, scenario, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
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

describe("an Owner whose item the document no longer holds", () => {
	const WITHOUT_BONUS = { ...SCENARIO_DOCUMENT, flows: [SCENARIO_DOCUMENT.flows[0]] }

	it("is dropped by apply and named in droppedOwners, and the household writes back", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, OWNED)
		const applied = resultOf(await applyScenario(home, "base", WITHOUT_BONUS))
		expect(applied).toMatchObject({
			status: "updated",
			droppedAnchors: ["flows.bonus.end"],
			droppedOwners: ["flows.bonus"],
		})
		const kept = (await shown(home)).household
		expect(kept).toMatchObject({ owners: [{ path: "flows.salary", person: "me" }] })
		const back = await setHousehold(home, kept)
		expect(back.code).toBe(0)
		expect(resultOf(back).status).toBe("unchanged")
	})

	it("is dropped by fork --without and named in droppedOwners", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, OWNED)
		const forked = resultOf(
			await scenario(home, ["fork", "base", "copy", "--without", "flows.bonus"]),
		)
		expect(forked).toMatchObject({
			droppedAnchors: ["flows.bonus.end"],
			droppedOwners: ["flows.bonus"],
		})
		expect((await shown(home, "copy")).household).toMatchObject({
			owners: [{ path: "flows.salary", person: "me" }],
		})
		expect((await shown(home)).household).toEqual(OWNED)
	})

	it("leaves droppedOwners out when none is dropped, and a version 1 household without owners", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const applied = resultOf(await applyScenario(home, "base", WITHOUT_BONUS))
		expect(applied).not.toHaveProperty("droppedOwners")
		expect((await shown(home)).household).not.toHaveProperty("owners")
		const plain = resultOf(await scenario(home, ["fork", "base", "copy"]))
		expect(plain).not.toHaveProperty("droppedOwners")
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
