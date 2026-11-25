/**
 * The Flows a plan's tax cannot read yet. `scenario tax` refuses a plan whose income Flow carries no tax label, so the page
 * names those Flows and its label form sets them ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)).
 * A label `traj` does not know counts as none, as it does in `traj` (`unlabelledIncome` in `apps/cli/src/scenario/tax/labels.ts`):
 * the Levy would tally such a Flow as nothing. Pure.
 */
import type { ScenarioDocument } from "../../contract"
import { bareLabelOf, INCOME_LABEL_IDS } from "../../edit/tax-labels"

/** The ids of the plan's income Flows. */
export function incomeFlows(plan: ScenarioDocument): string[] {
	return plan.flows.filter((flow) => flow.kind === "income").map((flow) => flow.id)
}

/** The ids of the plan's income Flows that carry no tax label, or one `traj` does not know. */
export function unlabelledIncome(plan: ScenarioDocument): string[] {
	return plan.flows
		.filter(
			(flow) =>
				flow.kind === "income" &&
				!(INCOME_LABEL_IDS as readonly string[]).includes(bareLabelOf(flow.label ?? "")),
		)
		.map((flow) => flow.id)
}
