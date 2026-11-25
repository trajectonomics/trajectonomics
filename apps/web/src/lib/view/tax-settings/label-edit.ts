/**
 * The Edit that gives an income Flow its tax label: the plan's document with that one Flow's `label` set, saved as an
 * `apply-plan` Edit that names the hash the page read ([web ADR 0008](../../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)),
 * which is what `scenario tax --label` writes onto the Flow. `traj` checks the label against the Flow's kind. Pure.
 */
import type { ErrorBody, ScenarioDocument } from "../../contract"
import type { EditInput } from "../../edit/edit"
import { INCOME_LABEL_IDS, type TaxLabels } from "../../edit/tax-labels"
import type { Problems, Shown } from "../plan-items/problems"
import { shownProblems } from "../plan-items/problems"
import { INCOME_LABELS } from "./label-choices"

/** What the label form holds: the Flow and the label chosen. */
export interface LabelDraft {
	flow: string
	label: string
}

/** The document with one Flow's tax label set; every other part is as it was. */
export function withFlowLabel(
	plan: ScenarioDocument,
	flow: string,
	label: string,
): ScenarioDocument {
	return { ...plan, flows: plan.flows.map((it) => (it.id === flow ? { ...it, label } : it)) }
}

/** The Edit a draft makes, or the problems at its fields. A label outside the list is refused here and by `traj`. */
export function labelEdit(
	target: { name: string; contentHash: string; plan: ScenarioDocument },
	draft: LabelDraft,
): { ok: true; edit: EditInput } | { ok: false; problems: Problems } {
	const problems: Record<string, string> = {}
	if (!target.plan.flows.some((flow) => flow.id === draft.flow && flow.kind === "income")) {
		problems["flow"] = "Choose an income Flow."
	}
	if (!INCOME_LABELS.some((choice) => choice.value === draft.label)) {
		problems["label"] = "Choose a tax label."
	}
	if (Object.keys(problems).length > 0) return { ok: false, problems }
	const { name, contentHash, plan } = target
	const edit = {
		kind: "apply-plan",
		name,
		contentHash,
		document: withFlowLabel(plan, draft.flow, draft.label),
	} satisfies EditInput
	return { ok: true, edit }
}

/** What the label form shows: its own problems, and a refusal at the field its path ends in (`...flows.<id>.label`). */
export function labelShown(
	problems: Problems,
	refusal: ErrorBody | null,
	message: string | null,
): Shown {
	return shownProblems(problems, refusal, message, ["label"])
}

/** The key of the problem at one Flow's label in the whole form. */
export const labelKey = (flow: string): string => `label:${flow}`

/**
 * The labels a whole write carries: each Flow that has none needs one of the income labels, because `scenario tax --tax`
 * refuses a plan with an unlabelled income Flow. `chosen` maps a Flow to the label the person picked.
 */
export function chosenLabels(
	flows: readonly string[],
	chosen: Readonly<Record<string, string>>,
): { ok: true; labels: TaxLabels } | { ok: false; problems: Problems } {
	const labels: TaxLabels = []
	const problems: Record<string, string> = {}
	for (const flow of flows) {
		const label = INCOME_LABEL_IDS.find((id) => id === chosen[flow])
		if (label === undefined) problems[labelKey(flow)] = "Choose a tax label."
		else labels.push({ flow, label })
	}
	return Object.keys(problems).length > 0 ? { ok: false, problems } : { ok: true, labels }
}
