import type { ScenarioDocument, ScenarioFlow } from "../../contract"
import type { FlowKind } from "./flows"

/** A sentence with its command set apart, so a component puts the command in `<code>`. */
export interface NoteParts {
	readonly before: string
	readonly command: string
	readonly after: string
}

/** The command that sets a Flow's tax label on the plan's stored profile, as `traj scenario tax --label` takes it. */
export function taxLabelCommand(plan: string, flow: string): string {
	return `traj scenario tax ${plan} --from-stored --label ${flow}=<label>`
}

/**
 * Why a new income Flow in a taxed plan needs a tax label, or null when the form needs no notice. A Levy counts only the
 * income whose label it knows, and the form cannot set one, so a new income would be untaxed without a word. `flow` is the
 * id the form holds, or empty before the person types one.
 */
export function newIncomeTaxNote(
	plan: string,
	doc: ScenarioDocument,
	kind: FlowKind,
	existing: ScenarioFlow | undefined,
	flow: string,
): NoteParts | null {
	if (kind !== "income" || existing !== undefined || (doc.levies?.length ?? 0) === 0) return null
	const id = flow.trim() === "" ? "<flow>" : flow.trim()
	return {
		before:
			"This plan's tax only counts income it knows by its label, so a new income without one is not taxed. Set its label with ",
		command: taxLabelCommand(plan, id),
		after:
			". A salary's label is income.section40_1; a plan with no stored tax profile takes --tax th-2026 instead of --from-stored.",
	}
}
