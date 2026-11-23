// `--if-hash`: a write names the contentHash its caller read, and is refused over a plan that has moved on
// (cli ADR-0055). Each refusal writes nothing, dry or real.
import { describe, expect, it } from "bun:test"
import { HOUSEHOLD, seedBase, setHousehold, shown } from "./scenario-household-support"
import {
	applyScenario,
	errorOf,
	resultOf,
	rowOf,
	scenario,
	scenarioHome,
} from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

const STALE = "jcs1:sha256:0000000000000000000000000000000000000000000000000000000000000000"

describe("scenario apply --if-hash", () => {
	it("refuses a write over a plan whose contentHash moved on, with its own code, and writes nothing", async () => {
		const home = scenarioHome()
		const before = await seedBase(home)
		// Another process changes the plan: the page's copy is now stale.
		const other = { ...SCENARIO_DOCUMENT, economy: { inflation: 100 } }
		await applyScenario(home, "base", other)
		const stored = await shown(home)
		const res = await applyScenario(home, "base", SCENARIO_DOCUMENT, [
			"--if-hash",
			before.contentHash,
		])

		expect(res.code).toBe(5)
		const error = errorOf(res)
		expect(error).toMatchObject({
			code: "scenario_changed",
			exitCode: 5,
			path: "--if-hash",
			details: {
				expectedHash: before.contentHash,
				storedHash: stored.contentHash,
			},
		})
		expect(error.hint).toContain(stored.contentHash)
		expect(error.hint).toContain("traj scenario show base")
		expect(await shown(home)).toEqual(stored)
	})

	it("refuses a dry run over a moved plan the same way, and rolls nothing forward", async () => {
		const home = scenarioHome()
		const before = await seedBase(home)
		await applyScenario(home, "base", {
			...SCENARIO_DOCUMENT,
			economy: { inflation: 100 },
		})
		const stored = await shown(home)
		const res = await applyScenario(home, "base", SCENARIO_DOCUMENT, [
			"--if-hash",
			before.contentHash,
			"--dry-run",
		])
		expect(res.code).toBe(5)
		expect(errorOf(res).code).toBe("scenario_changed")
		expect(await shown(home)).toEqual(stored)
	})

	it("refuses a hash for a plan that is not stored, and names no stored hash", async () => {
		const home = scenarioHome()
		const res = await applyScenario(home, "ghost", SCENARIO_DOCUMENT, ["--if-hash", STALE])
		expect(res.code).toBe(5)
		const error = errorOf(res)
		expect(error).toMatchObject({
			code: "scenario_changed",
			details: { storedHash: null },
		})
		expect(error.hint).toContain("traj scenario list")
		const list = resultOf(await scenario(home, ["list"]))
		expect(list.scenarios).toEqual([])
	})

	it("writes when the stored contentHash is the one the caller read", async () => {
		const home = scenarioHome()
		const before = await seedBase(home)
		const changed = { ...SCENARIO_DOCUMENT, economy: { inflation: 100 } }
		const res = await applyScenario(home, "base", changed, ["--if-hash", before.contentHash])
		expect(res.code).toBe(0)
		const data = resultOf(res)
		expect(data.status).toBe("updated")
		const row = rowOf(data)
		expect(row.version).toBe(2)
		expect(row.document).toMatchObject({ economy: { inflation: 100 } })
	})

	it("reports an unchanged plan as unchanged when the hash matches, and writes nothing", async () => {
		const home = scenarioHome()
		const before = await seedBase(home)
		const res = await applyScenario(home, "base", SCENARIO_DOCUMENT, [
			"--if-hash",
			before.contentHash,
		])
		expect(res.code).toBe(0)
		expect(resultOf(res).status).toBe("unchanged")
	})

	it("without the flag, a moved plan is written over as before", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await applyScenario(home, "base", {
			...SCENARIO_DOCUMENT,
			economy: { inflation: 100 },
		})
		const res = await applyScenario(home, "base", SCENARIO_DOCUMENT)
		expect(res.code).toBe(0)
		expect(resultOf(res).status).toBe("updated")
	})

	it("is refused with --template, which writes nothing", async () => {
		const res = await capture(["scenario", "apply", "--template", "--if-hash", STALE, "--json"], {
			TRAJ_HOME: scenarioHome(),
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--if-hash",
		})
	})
})

describe("scenario household --if-hash", () => {
	it("refuses a household over a plan that moved on, and writes nothing", async () => {
		const home = scenarioHome()
		const before = await seedBase(home)
		await applyScenario(home, "base", {
			...SCENARIO_DOCUMENT,
			economy: { inflation: 100 },
		})
		const stored = await shown(home)
		const res = await scenario(
			home,
			["household", "base", "--file", "-", "--if-hash", before.contentHash],
			JSON.stringify(HOUSEHOLD),
		)
		expect(res.code).toBe(5)
		expect(errorOf(res)).toMatchObject({
			code: "scenario_changed",
			details: { storedHash: stored.contentHash },
		})
		const after = await shown(home)
		expect(after.household).toBeNull()
		expect(after).toEqual(stored)
	})

	it("refuses a dry run of a household over a moved plan, and writes nothing", async () => {
		const home = scenarioHome()
		const before = await seedBase(home)
		await applyScenario(home, "base", {
			...SCENARIO_DOCUMENT,
			economy: { inflation: 100 },
		})
		const stored = await shown(home)
		const res = await scenario(
			home,
			["household", "base", "--file", "-", "--if-hash", before.contentHash, "--dry-run"],
			JSON.stringify(HOUSEHOLD),
		)
		expect(res.code).toBe(5)
		expect(errorOf(res).code).toBe("scenario_changed")
		expect(await shown(home)).toEqual(stored)
	})

	it("writes a household when the stored contentHash is the one the caller read", async () => {
		const home = scenarioHome()
		const before = await seedBase(home)
		const res = await scenario(
			home,
			["household", "base", "--file", "-", "--if-hash", before.contentHash],
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
			written.contentHash,
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
			written.contentHash,
		])
		expect(stale.code).toBe(5)
		expect(errorOf(stale).code).toBe("scenario_changed")
	})
})
