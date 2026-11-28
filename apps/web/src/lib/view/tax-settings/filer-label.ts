/**
 * The labels of a plan whose tax is worked out for each person (cli ADR-0075). Such a Levy reads `<label>@<person>`, and
 * `traj scenario apply` refuses the bare label, so a label the Dashboard writes there carries the Flow's Owner. Pure.
 */
import { z } from "zod"
import type { ScenarioDocument } from "../../contract"
import { bareLabelOf } from "../../edit/tax-labels"

/** The part of a Levy that states which labels it counts. */
const levy = z.object({ measures: z.array(z.object({ label: z.string().optional() })) })

/** Whether the plan's Levies count labels that name a person, by their own measures. */
export function readsFilerLabels(plan: ScenarioDocument): boolean {
	return (plan.levies ?? []).some((one) => {
		const read = levy.safeParse(one)
		if (!read.success) return false
		return read.data.measures.some(
			({ label }) => label !== undefined && bareLabelOf(label) !== label,
		)
	})
}

/** The plan with a Flow's label moved to its new Owner. A bare label, no label and no Owner leave the plan as it is. */
export function withOwnerLabel(
	plan: ScenarioDocument,
	flowId: string,
	owner: string,
): ScenarioDocument {
	const flows = plan.flows.map((flow) => {
		const label = flow.label
		if (flow.id !== flowId || owner === "" || label === undefined) return flow
		const bare = bareLabelOf(label)
		return bare === label ? flow : { ...flow, label: `${bare}@${owner}` }
	})
	return { ...plan, flows }
}
