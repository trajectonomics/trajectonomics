import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { DEMO_ESTATE } from "./estate"
import { HOME_ACCOUNTS, HOME_FLOWS } from "./home"
import {
	baseScenarioDocument,
	DEMO_HOUSEHOLD,
	DEMO_TAX,
	type DemoAccountIds,
	RETIRE_EARLY_SALARY_END,
} from "./scenario"
import { applySeparateScenario, type DemoWrite } from "./separate"
import { demoSpendingFlows } from "./spending"

/** Where a Scenario is written: the scratch directory its JSON files go in. */
type Place = { scratch: string }

/** Writes one document from `data` and applies it under `name`, as the Demo's own `traj` runner. */
async function writeDocument(
	place: Place,
	traj: DemoWrite,
	name: string,
	file: string,
	data: unknown,
): Promise<void> {
	const path = join(place.scratch, file)
	await writeFile(path, JSON.stringify(data, null, "\t"))
	await traj(["scenario", "apply", name, "--file", path])
}

/** Applies `base`, adds the Thai Levy to it, then forks `retire-early` and `separate` from it. */
export async function applyScenarios(
	place: Place,
	traj: DemoWrite,
	ids: DemoAccountIds,
): Promise<void> {
	await writeDocument(place, traj, "base", "base.json", baseScenarioDocument(ids))
	const household = join(place.scratch, "household.json")
	await writeFile(household, JSON.stringify(DEMO_HOUSEHOLD, null, "\t"))
	await traj(["scenario", "household", "base", "--file", household])
	await traj(["scenario", "tax", "base", "--tax", DEMO_TAX.tax, "--label", DEMO_TAX.label])
	await traj([
		"scenario",
		"fork",
		"base",
		"retire-early",
		"--set",
		`flows.salary.end="${RETIRE_EARLY_SALARY_END}"`,
	])
	await applySeparateScenario(place, traj)
	await addHome(place, traj, "base", demoSpendingFlows(ids))
}

/** Puts the condo, the spending rule (cli ADR 0063) and the estate block (cli ADR 0064) into `base`, read back and applied; `retire-early` has none. */
async function addHome(
	place: Place,
	traj: DemoWrite,
	name: string,
	extra: unknown[],
): Promise<void> {
	const shown = JSON.parse(await traj(["scenario", "show", name])) as {
		scenario: { document: { accounts: unknown[]; flows: unknown[] } }
	}
	const { document } = shown.scenario
	const withHome = {
		...document,
		accounts: [...document.accounts, ...HOME_ACCOUNTS],
		flows: [...document.flows, ...HOME_FLOWS, ...extra],
		estate: DEMO_ESTATE,
	}
	await writeDocument(place, traj, name, "base-with-home.json", withHome)
}
