/**
 * The Flows a plan's tax cannot read yet. `scenario tax` refuses a plan whose income Flow carries no tax label, so the page
 * names those Flows and its label form sets them ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)).
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
