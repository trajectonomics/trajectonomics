// `scenario household --if-hash`: a household write names the householdHash its caller read, which
// covers the document and the household, and is refused over either that moved on (cli ADR-0055).
import { describe, expect, it } from "bun:test"
import {
	HOLDER,
	HOUSEHOLD,
	PARTNER,
	type Shown,
	seedBase,
	setHousehold,
	shown,
} from "./scenario-household-support"
import { applyScenario, errorOf, resultOf, scenario, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"

/** The holder's life expectancy in a shown household. */
function holderLife(household: Shown["household"]): number | undefined {
	const people = household?.["people"] as { id: string; lifeExpectancy?: number }[] | undefined
	return people?.find((person) => person.id === "me")?.lifeExpectancy
}

describe("scenario household --if-hash", () => {
	it("refuses a household over a plan that moved on, and writes nothing", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const before = await shown(home)
		await applyScenario(home, "base", {
			...SCENARIO_DOCUMENT,
			economy: { inflation: 100 },
		})
		const stored = await shown(home)
		const res = await scenario(
			home,
			["household", "base", "--file", "-", "--if-hash", before.householdHash],
			JSON.stringify(HOUSEHOLD),
		)
		expect(res.code).toBe(5)
		expect(errorOf(res)).toMatchObject({
			code: "scenario_changed",
			details: { storedHash: stored.householdHash },
		})
		const after = await shown(home)
		expect(after.household).toBeNull()
		expect(after).toEqual(stored)
	})

	it("refuses a dry run of a household over a moved plan, and writes nothing", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const before = await shown(home)
		await applyScenario(home, "base", {
			...SCENARIO_DOCUMENT,
			economy: { inflation: 100 },
		})
		const stored = await shown(home)
		const res = await scenario(
			home,
			["household", "base", "--file", "-", "--if-hash", before.householdHash, "--dry-run"],
			JSON.stringify(HOUSEHOLD),
		)
		expect(res.code).toBe(5)
		expect(errorOf(res).code).toBe("scenario_changed")
		expect(await shown(home)).toEqual(stored)
	})

	it("writes a household when the stored householdHash is the one the caller read", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const before = await shown(home)
		const res = await scenario(
			home,
			["household", "base", "--file", "-", "--if-hash", before.householdHash],
			JSON.stringify(HOUSEHOLD),
		)
		expect(res.code).toBe(0)
		expect(resultOf(res).status).toBe("updated")
		expect((await shown(home)).household).toMatchObject({
			people: [{ id: "me" }, { id: "partner" }],
		})
	})

	it("removes a household over the hash the household wrote, and refuses once the plan moved", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const written = await shown(home)
		const ok = await scenario(home, [
			"household",
			"base",
			"--none",
			"--if-hash",
			written.householdHash,
		])
		expect(ok.code).toBe(0)
		expect((await shown(home)).household).toBeNull()

		await applyScenario(home, "base", {
			...SCENARIO_DOCUMENT,
			economy: { inflation: 100 },
		})
		const stale = await scenario(home, [
			"household",
			"base",
			"--none",
			"--if-hash",
			written.householdHash,
		])
		expect(stale.code).toBe(5)
		expect(errorOf(stale).code).toBe("scenario_changed")
	})

	it("refuses a stale household save whose change moved no anchored date (issue #313)", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const before = await shown(home)
		// A terminal raises the holder's life expectancy; the anchored salary still ends at 60.
		const raised = {
			...HOUSEHOLD,
			people: [{ ...HOLDER, lifeExpectancy: 95 }, PARTNER],
		}
		await setHousehold(home, raised)
		const stored = await shown(home)
		expect(stored.contentHash).toBe(before.contentHash)
		expect(stored.householdHash).not.toBe(before.householdHash)
		expect(holderLife(stored.household)).toBe(95)

		const res = await scenario(
			home,
			["household", "base", "--file", "-", "--if-hash", before.householdHash],
			JSON.stringify(HOUSEHOLD),
		)
		expect(res.code).toBe(5)
		expect(errorOf(res)).toMatchObject({
			code: "scenario_changed",
			details: { expectedHash: before.householdHash, storedHash: stored.householdHash },
		})
		expect(await shown(home)).toEqual(stored)
	})

	it("without the flag, the same household save writes over the terminal's change as before", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const raised = {
			...HOUSEHOLD,
			people: [{ ...HOLDER, lifeExpectancy: 95 }, PARTNER],
		}
		await setHousehold(home, raised)
		const res = await scenario(
			home,
			["household", "base", "--file", "-"],
			JSON.stringify(HOUSEHOLD),
		)
		expect(res.code).toBe(0)
		expect(resultOf(res).status).toBe("updated")
		expect(holderLife((await shown(home)).household)).toBe(90)
	})

	it("refuses a stale remove-household over a household change that moved no anchored date", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const before = await shown(home)
		await setHousehold(home, {
			...HOUSEHOLD,
			people: [{ ...HOLDER, lifeExpectancy: 95 }, PARTNER],
		})
		const stored = await shown(home)
		const res = await scenario(home, [
			"household",
			"base",
			"--none",
			"--if-hash",
			before.householdHash,
		])
		expect(res.code).toBe(5)
		expect(errorOf(res).code).toBe("scenario_changed")
		expect(await shown(home)).toEqual(stored)
		expect(stored.household).not.toBeNull()
	})
})
