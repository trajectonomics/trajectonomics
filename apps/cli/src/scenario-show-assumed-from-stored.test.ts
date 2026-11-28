// The unlabelled-income hint when the Levy does not tally the Flow's Owner's suffix (cli ADR-0083).
import { describe, expect, it } from "bun:test"
import type { Household } from "./scenario/household/model"
import { setHousehold } from "./scenario-household-support"
import {
	COUPLE_OWNERS,
	COUPLE_PLAN,
	couple,
	coupleHousehold,
	taxCouple,
} from "./scenario-tax-filers-support"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"
import { capture } from "./test-support"

type AssumedItem = { kind: string; path: string; hint: string | null }

type Shown = { document: { flows: Record<string, unknown>[] }; assumed: AssumedItem[] }

/** What `scenario show` states for the plan `base`. */
async function shown(home: string): Promise<Shown> {
	const res = await scenario(home, ["show", "base"])
	expect(res.code).toBe(0)
	return resultOf(res).scenario as Shown
}

/** The argv of the command a hint prints, split where a shell would. */
function argvOf(command: string): string[] {
	return [...command.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)].map(
		(match) => match[1] ?? match[2] ?? match[3] ?? "",
	)
}

/** The first unlabelled-income item, or undefined when the plan assumes none. */
function itemOf(read: Shown): AssumedItem | undefined {
	return read.assumed.find((item) => item.kind === "unlabelled-income")
}

/** The couple plan taxed as `status` with only the holder's salary bearing a label. */
async function taxedOnMe(status: string): Promise<string> {
	const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
	const plan = (await shown(home)).document
	const flows = plan.flows.filter((flow) => flow["id"] !== "partner-salary")
	expect((await applyScenario(home, "base", { ...plan, flows })).code).toBe(0)
	expect((await taxCouple(home, status, ["--label", "salary=income.section40_1"])).code).toBe(0)
	return home
}

/** A copy of the couple plan's partner salary under `id`, with no tax label. */
function salaryFlow(id: string): Record<string, unknown> {
	const flows = COUPLE_PLAN["flows"] as Record<string, unknown>[]
	const { label: _label, ...rest } = flows.find((flow) => flow["id"] === "partner-salary") ?? {}
	return { ...rest, id }
}

/** The plan with `flows` added and their Owners set, after the write so every path exists. */
async function addOwned(
	home: string,
	flows: Record<string, unknown>[],
	owners: Household["owners"],
): Promise<void> {
	const plan = (await shown(home)).document
	expect(
		(await applyScenario(home, "base", { ...plan, flows: [...plan.flows, ...flows] })).code,
	).toBe(0)
	expect((await setHousehold(home, coupleHousehold(owners))).code).toBe(0)
}

/** Runs the hint's command against the plan, which must succeed and leave no unlabelled income. */
async function runHint(home: string, item: AssumedItem | undefined): Promise<void> {
	const command = item?.hint?.match(/^Run "(traj .+?)" (?:for a salary|to write)/)?.[1] ?? ""
	const argv = argvOf(command)
	expect(argv[0]).toBe("traj")
	expect((await capture([...argv.slice(1), "--json"], { TRAJ_HOME: home })).code).toBe(0)
	expect(itemOf(await shown(home))).toBeUndefined()
}

describe("the unlabelled-income hint when a Levy does not read the Owner's suffix", () => {
	for (const status of ["married_joint", "married_separate"]) {
		it(`writes the label through --from-stored under ${status}, and the hint clears the item`, async () => {
			const home = await taxedOnMe(status)
			await addOwned(home, [salaryFlow("partner-salary")], COUPLE_OWNERS)
			const item = itemOf(await shown(home))
			expect(item?.hint).toContain("--from-stored")
			expect(item?.hint).toContain("partner-salary=income.section40_1")
			await runHint(home, item)
		})
	}

	it("carries one --label for every unlabelled income Flow, and clears them all", async () => {
		const home = await taxedOnMe("married_joint")
		const owners = [...(COUPLE_OWNERS ?? []), { path: "flows.bonus", person: "partner" }]
		await addOwned(home, [salaryFlow("partner-salary"), salaryFlow("bonus")], owners)
		const item = itemOf(await shown(home))
		expect(item?.hint).toContain("partner-salary=income.section40_1")
		expect(item?.hint).toContain("bonus=income.section40_1")
		await runHint(home, item)
		expect((await shown(home)).assumed.some((it) => it.kind === "unlabelled-income")).toBe(false)
	})

	it("runs the --label form when the Flow id contains =", async () => {
		const home = await taxedOnMe("married_joint")
		const kept = (COUPLE_OWNERS ?? []).filter((owner) => owner.path !== "flows.partner-salary")
		const owners = [...kept, { path: "flows.bonus=extra", person: "partner" }]
		await addOwned(home, [salaryFlow("bonus=extra")], owners)
		const item = itemOf(await shown(home))
		expect(item?.hint).toContain("--label")
		expect(item?.hint).toContain("bonus=extra=income.section40_1")
		await runHint(home, item)
		const labelled = (await shown(home)).document.flows.find((flow) => flow["id"] === "bonus=extra")
		expect(labelled?.["label"]).toBe("income.section40_1@partner")
	})
})
