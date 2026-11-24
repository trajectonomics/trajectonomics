// Helpers of the tax cards' end-to-end tests: a plan with no tax, an income Flow with no tax label, and what `traj` reports.
import type { ScenarioDocument } from "../src/lib/contract"
import { PLAN, storedPlan, traj } from "./estate-ledger.test-support"

/** What `scenario tax --from-stored --dry-run` reports for a plan: its own classes, stated and not. */
export function reported(name: string): { stated: string[]; notStated: string[] } {
	const out = traj(["scenario", "tax", name, "--from-stored", "--dry-run", "--json"])
	return (JSON.parse(out) as { allowances: { stated: string[]; notStated: string[] } }).allowances
}

/** An income Flow of 100,000.00 a month, with no tax label. */
export const income = (id: string) => ({
	id,
	kind: "income",
	frequency: "monthly",
	start: "2026-01-01",
	amount: "100000.00",
	growth: { bps: 0 },
	earned: true,
})

/** The plan's document with no tax rules, no tax label and no income Flow of the tests: a plan with no tax. */
export function bare(name = PLAN): ScenarioDocument {
	const { levies: _levies, ...document } = storedPlan(name).document
	const flows = document.flows
		.filter((flow) => flow.id !== "salary" && flow.id !== "side-gig")
		.map(({ label: _label, ...flow }) => flow)
	return { ...document, flows }
}

/** Gives the plan a salary and taxes it, so the projection has tax years: a Levy reads a label some Flow carries. */
export function taxedSalary(name = PLAN, from = PLAN): void {
	const document = bare(from)
	const flows = [...document.flows, income("salary")]
	traj(["scenario", "apply", name, "--file", "-", "--decimal", "--json"], { ...document, flows })
	traj([
		"scenario",
		"tax",
		name,
		"--tax",
		"th-2026",
		"--filing-status",
		"single",
		"--label",
		"salary=income.section40_1",
		"--json",
	])
}
