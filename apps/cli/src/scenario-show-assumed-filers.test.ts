// The unlabelled-income hint on a plan whose Levy reads Filer labels (cli ADR-0083, ADR-0075).
import { describe, expect, it } from "bun:test"
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

async function shown(home: string): Promise<Shown> {
	const res = await scenario(home, ["show", "base"])
	expect(res.code).toBe(0)
	return resultOf(res).scenario as Shown
}

/** The stored plan without `flowId`'s tax label, so the Flow is one nobody labelled. */
async function unlabel(home: string, flowId: string): Promise<void> {
	const document = (await shown(home)).document
	const flows = document.flows.map((flow) => {
		if (flow["id"] !== flowId) return flow
		const { label: _label, ...unlabelled } = flow
		return unlabelled
	})
	expect((await applyScenario(home, "base", { ...document, flows })).code).toBe(0)
}

/** The argv of the command a hint prints, split where a shell would. */
function argvOf(command: string): string[] {
	return [...command.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)].map(
		(match) => match[1] ?? match[2] ?? match[3] ?? "",
	)
}

/** The first item of the kind, or undefined when the plan assumes none. */
function itemOf(read: Shown, kind: string): AssumedItem | undefined {
	return read.assumed.find((item) => item.kind === kind)
}

/** Runs the hint's command against the plan, which must succeed and leave no unlabelled income. */
async function runHint(home: string, item: AssumedItem | undefined): Promise<void> {
	const command = item?.hint?.match(/^Run "(traj .+)" for a salary/)?.[1] ?? ""
	const argv = argvOf(command)
	expect(argv[0]).toBe("traj")
	expect((await capture([...argv.slice(1), "--json"], { TRAJ_HOME: home })).code).toBe(0)
	expect(itemOf(await shown(home), "unlabelled-income")).toBeUndefined()
}

describe("the unlabelled-income hint on a household with a partner", () => {
	for (const status of ["married_joint", "married_separate"]) {
		it(`gives the Flow's Owner's suffix under ${status}, and the hint clears the item`, async () => {
			const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
			expect((await taxCouple(home, status)).code).toBe(0)
			await unlabel(home, "salary")
			const item = itemOf(await shown(home), "unlabelled-income")
			expect(item?.path).toBe("flows.salary.label")
			expect(item?.hint).toContain('flows.salary.label="income.section40_1@me"')
			await runHint(home, item)
			const salary = (await shown(home)).document.flows.find((flow) => flow["id"] === "salary")
			expect(salary?.["label"]).toBe("income.section40_1@me")
		})
	}

	it("names the household's people when the Flow has no Owner", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		expect((await taxCouple(home, "married_joint")).code).toBe(0)
		const owners = (COUPLE_OWNERS ?? []).filter((owner) => owner.path !== "flows.salary")
		expect((await setHousehold(home, coupleHousehold(owners))).code).toBe(0)
		await unlabel(home, "salary")
		const item = itemOf(await shown(home), "unlabelled-income")
		expect(item?.hint).toContain('flows.salary.label="income.section40_1@<person>"')
		expect(item?.hint).toContain(
			"with the Filer suffix of whoever earns it (@<person>: one of me, partner)",
		)
	})
})
