// The fallback hint's #860 follow-ups: an Ownerless Flow, a plan with no stored profile, and an id
// that starts with "-" (cli ADR-0083).
import { describe, expect, it } from "bun:test"
import {
	commandOf,
	meOnly,
	read,
	runAsPrinted,
	unlabelled,
} from "./scenario-show-assumed-followups-support"
import { COUPLE_OWNERS, coupleHousehold } from "./scenario-tax-filers-support"
import { applyScenario, documentFile } from "./scenario-test-support"

describe("the unlabelled-income hint's follow-ups", () => {
	it("names the Owner to give an Ownerless Flow first, and the route then clears both", async () => {
		const home = await meOnly(["partner-salary", "bonus"])
		const item = unlabelled(await read(home)).find(
			(entry) => entry.path === "flows.partner-salary.label",
		)
		expect(item?.hint).toContain("Give flows.bonus an Owner first")
		expect(item?.hint).toContain('"traj scenario household base --file <path>"')
		const file = documentFile(
			coupleHousehold([...(COUPLE_OWNERS ?? []), { path: "flows.bonus", person: "partner" }]),
		)
		const household = item?.hint?.match(/run "(traj .+?)"/)?.[1] ?? ""
		expect((await runAsPrinted(home, household.replace("<path>", file))).code).toBe(0)
		const next = unlabelled(await read(home))[0]
		expect(next?.hint).toContain("--from-stored --label 'partner-salary=income.section40_1'")
		expect((await runAsPrinted(home, commandOf(next?.hint ?? null))).code).toBe(0)
		expect(unlabelled(await read(home))).toEqual([])
	}, 30_000)

	it("states the tax whole when the plan keeps no stored profile, and that form clears the item", async () => {
		const home = await meOnly(["partner-salary"])
		const before = await read(home)
		const levies = before.document.levies.map((levy) => ({
			...levy,
			settlement: { ...(levy["settlement"] as Record<string, unknown>), month: 5 },
		}))
		expect(
			(
				await applyScenario(home, "base", {
					...before.document,
					levies,
				})
			).code,
		).toBe(0)
		expect((await read(home)).tax).toBeNull()
		const item = unlabelled(await read(home))[0]
		expect(item?.hint).toContain("--tax th-2026 --filing-status married_joint")
		expect(item?.hint).not.toContain("--from-stored")
		expect((await runAsPrinted(home, commandOf(item?.hint ?? null))).code).toBe(0)
		expect(unlabelled(await read(home))).toEqual([])
	}, 30_000)

	it("prints --label=<value> for an id that starts with -, and that form clears the item", async () => {
		const owners = [...(COUPLE_OWNERS ?? [])].filter(
			(owner) => owner.path !== "flows.partner-salary",
		)
		const home = await meOnly(["-lead"], [...owners, { path: "flows.-lead", person: "partner" }])
		const item = unlabelled(await read(home))[0]
		expect(item?.path).toBe("flows.-lead.label")
		expect(item?.hint).toContain("--label='-lead=income.section40_1'")
		expect((await runAsPrinted(home, commandOf(item?.hint ?? null))).code).toBe(0)
		expect(unlabelled(await read(home))).toEqual([])
	}, 30_000)
})
