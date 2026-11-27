import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { BASE_SALARY_END, DEMO_HOUSEHOLD } from "./scenario"

/**
 * `separate`, the Demo's third Scenario: the same couple as `base`, each with a salary of their own, filing separately so
 * the Tax page has two Returns to switch between (cli ADR-0075). The partner's salary is invented like every Demo figure.
 */
export const PARTNER_SALARY_FLOW: Record<string, unknown> = {
	id: "partner-salary",
	displayLabel: "Partner's salary",
	kind: "income",
	earned: true,
	frequency: "monthly",
	start: "2026-11-01",
	end: BASE_SALARY_END,
	amount: 4_200_000,
	growth: "inflation",
}

/**
 * The household of `separate`: the people and anchors of `base`, a version 2 household whose Owners give each salary to
 * the person who earns it. The tax rules write each Flow's Filer label from its Owner.
 */
export const DEMO_SEPARATE_HOUSEHOLD = {
	...DEMO_HOUSEHOLD,
	schemaVersion: 2,
	owners: [
		{ path: "flows.salary", person: "me" },
		{ path: "flows.partner-salary", person: "partner" },
	],
}

/** How the generator runs one `traj` write, from the ledger's own runner, so this module holds the plan's data only. */
export type DemoWrite = (argv: string[]) => Promise<string>

/**
 * Makes `separate` from `base`: forks it, adds the partner's salary, gives each salary its Owner, and files the pair
 * separately with a child each and the partner's parents. Called before `base` gains its home, so both plans start alike.
 */
export async function applySeparateScenario(
	place: { scratch: string },
	traj: DemoWrite,
): Promise<void> {
	await traj(["scenario", "fork", "base", "separate"])
	const shown = JSON.parse(await traj(["scenario", "show", "separate"])) as {
		scenario: { document: { flows: unknown[] } }
	}
	const file = join(place.scratch, "separate.json")
	const document = {
		...shown.scenario.document,
		flows: [...shown.scenario.document.flows, PARTNER_SALARY_FLOW],
	}
	await writeFile(file, JSON.stringify(document, null, "\t"))
	await traj(["scenario", "apply", "separate", "--file", file])
	const household = join(place.scratch, "separate-household.json")
	await writeFile(household, JSON.stringify(DEMO_SEPARATE_HOUSEHOLD, null, "\t"))
	await traj(["scenario", "household", "separate", "--file", household])
	await traj([
		"scenario",
		"tax",
		"separate",
		"--tax",
		"th-2026",
		"--filing-status",
		"married_separate",
		"--children",
		"me=1",
		"--children",
		"partner=1",
		"--parents",
		"partner=2",
		"--life-insurance",
		"me=15000",
		"--life-insurance",
		"partner=12000",
		"--label",
		"salary=income.section40_1",
		"--label",
		"partner-salary=income.section40_1",
	])
}
