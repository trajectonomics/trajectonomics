/**
 * The Edit that gives an income Flow its tax label: the plan's document with that one Flow's `label` set, saved as an
 * `apply-plan` Edit that names the hash the page read ([web ADR 0008](../../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)),
 * which is what `scenario tax --label` writes onto the Flow. `traj` checks the label against the Flow's kind. Pure.
 */
import type { ErrorBody, HouseholdDocument, ScenarioDocument } from "../../contract"
import type { EditInput } from "../../edit/edit"
import { INCOME_LABEL_IDS, type TaxLabels } from "../../edit/tax-labels"
import { flowOwner } from "../household/owner"
import type { Problems, Shown } from "../plan-items/problems"
import { shownProblems } from "../plan-items/problems"
import { namedRefusal } from "../plan-items/refusal"
import { readsFilerLabels } from "./filer-label"
import { INCOME_LABELS } from "./label-choices"

/** What the form says where the plan's tax needs to know whose an income is, and the household does not say. */
export const OWNER_FIRST =
	"This plan's tax needs to know whose income this is. Set its Owner on the Income page, then label it."

/** What the label form holds: the Flow and the label chosen. */
export interface LabelDraft {
	flow: string
	label: string
}

/** The label form's state a refusal is matched against: the selected `flow` may have moved on from the `sent` one. */
export interface LabelFormState {
	flow: string
	sent: string
}

/** The document with one Flow's tax label set; every other part is as it was. */
export function withFlowLabel(
	plan: ScenarioDocument,
	flow: string,
	label: string,
): ScenarioDocument {
	return { ...plan, flows: plan.flows.map((it) => (it.id === flow ? { ...it, label } : it)) }
}

/** The plan a label is saved into, with the household that says whose each Flow is. */
export interface LabelTarget {
	name: string
	contentHash: string
	plan: ScenarioDocument
	household: HouseholdDocument | null
}

/**
 * The Edit a draft makes, or the problems at its fields. A label outside the list is refused here and by `traj`. Where the
 * plan's tax reads each person's income, the label names the Flow's Owner (`income.section40_1@me`).
 */
export function labelEdit(
	target: LabelTarget,
	draft: LabelDraft,
): { ok: true; edit: EditInput } | { ok: false; problems: Problems } {
	const problems: Record<string, string> = {}
	if (!target.plan.flows.some((flow) => flow.id === draft.flow && flow.kind === "income")) {
		problems["flow"] = "Choose an income Flow."
	}
	if (!INCOME_LABELS.some((choice) => choice.value === draft.label)) {
		problems["label"] = "Choose a tax label."
	}
	const { name, contentHash, plan, household } = target
	const filed = readsFilerLabels(plan)
	const owner = filed ? flowOwner(household, draft.flow) : ""
	if (filed && problems["flow"] === undefined && owner === "") problems["flow"] = OWNER_FIRST
	if (Object.keys(problems).length > 0) return { ok: false, problems }
	const label = filed ? `${draft.label}@${owner}` : draft.label
	const edit = {
		kind: "apply-plan",
		name,
		contentHash,
		document: withFlowLabel(plan, draft.flow, label),
	} satisfies EditInput
	return { ok: true, edit }
}

/**
 * What the label form shows: its own problems, and a refusal at the field its path names. The refusal is matched to the
 * Flow the save sent, which `state.sent` holds, so changing the select afterwards keeps it where it was. `flows` are the
 * ids of the document the Edit sent, in order, because `traj` may name the Flow by its position (`flows.2.label`).
 */
export function labelShown(
	problems: Problems,
	refusal: ErrorBody | null,
	message: string | null,
	state: LabelFormState,
	flows: readonly string[],
): Shown {
	const named = namedRefusal(refusal, flows)
	return shownProblems(problems, named, message, ["label"], ["flows", state.sent])
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
