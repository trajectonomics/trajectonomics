/**
 * The Flows a plan's tax cannot read yet. `scenario tax` refuses a plan whose income Flow carries no tax label, and this page
 * does not set labels, so it names those Flows and the command that does ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)).
 * A label that is present counts as set: the closed list of labels is `traj`'s, and a wrong one is refused by `traj`. Pure.
 */
import type { ScenarioDocument } from "../../contract"

/** The ids of the plan's income Flows. */
export function incomeFlows(plan: ScenarioDocument): string[] {
	return plan.flows.filter((flow) => flow.kind === "income").map((flow) => flow.id)
}

/** The ids of the plan's income Flows that carry no tax label. */
export function unlabelledIncome(plan: ScenarioDocument): string[] {
	return plan.flows
		.filter((flow) => flow.kind === "income" && (flow.label ?? "") === "")
		.map((flow) => flow.id)
}

/**
 * The command that gives a Flow its tax label: with a stored profile a merge keeps it, and without one the whole profile
 * is stated again. `<flow>` and `<label>` are the person's to fill in; `traj scenario tax --help` lists the labels.
 */
export function labelCommand(name: string, stored: boolean): string {
	const mode = stored ? "--merge" : "--tax th-2026"
	return `traj scenario tax ${name} ${mode} --label <flow>=<label>`
}
