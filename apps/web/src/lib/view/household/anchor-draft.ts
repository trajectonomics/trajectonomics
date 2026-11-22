/**
 * The text of the anchor form, and the anchor it saves: one Flow's start or end, pinned to a person's
 * age, life end or joining. Shape checks only; `traj` decides whether the anchor is valid.
 */
import type { HouseholdAnchor } from "../../contract"
import type { Problems } from "../plan-items/problems"
import { flowDatePath } from "./model"

const WHOLE_TEXT = /^\d{1,15}$/

/** The text of the anchor form. Each select starts empty, so no item, person or date is chosen for the person. */
export interface AnchorDraft {
	readonly flow: string
	/** "start" or "end". */
	readonly edge: string
	readonly person: string
	/** "age", "lifeEnd" or "joins". */
	readonly when: string
	readonly age: string
}

/** The draft of a new anchor: nothing chosen yet, and the age as the default way to pin a date. */
export function anchorDraftOf(): AnchorDraft {
	return { flow: "", edge: "", person: "", when: "age", age: "" }
}

/** The result of an anchor form: the anchor to save, or the problems the form shows at its fields. */
export type AnchorResult = { ok: true; anchor: HouseholdAnchor } | { ok: false; problems: Problems }

/** "start" or "end" as the edge the text names, or null. */
function edgeOf(text: string): "start" | "end" | null {
	return text === "start" || text === "end" ? text : null
}

/** The problems an anchor draft has at its fields. */
function anchorProblems(draft: AnchorDraft): Map<string, string> {
	const problems = new Map<string, string>()
	if (draft.flow === "") problems.set("flow", "Choose the item whose date is pinned.")
	if (edgeOf(draft.edge) === null) problems.set("edge", "Choose the start or the end of the item.")
	if (draft.person === "") problems.set("person", "Choose the person whose age pins the date.")
	if (draft.when === "age" && !WHOLE_TEXT.test(draft.age.trim())) {
		problems.set("age", "Enter the age in whole years.")
	}
	return problems
}

/** The anchor's target: the age in whole years, or the person's life end or joining. */
function targetOf(draft: AnchorDraft, path: string): HouseholdAnchor {
	if (draft.when === "age") return { path, person: draft.person, age: Number(draft.age.trim()) }
	const at = draft.when === "lifeEnd" ? "lifeEnd" : "joins"
	return { path, person: draft.person, at }
}

/** The anchor a draft names: its path is the Flow's date, and its target is the chosen person's age, life end or joining. */
export function anchorFromDraft(draft: AnchorDraft): AnchorResult {
	const problems = anchorProblems(draft)
	const edge = edgeOf(draft.edge)
	if (problems.size > 0 || edge === null) {
		return { ok: false, problems: Object.fromEntries(problems) }
	}
	return { ok: true, anchor: targetOf(draft, flowDatePath(draft.flow, edge)) }
}
