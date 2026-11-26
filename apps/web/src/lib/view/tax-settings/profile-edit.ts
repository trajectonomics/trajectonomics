/**
 * The Edit a tax form's draft makes ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)):
 * a merge into the stored profile, or the profile set whole, which also labels the income Flows that have none. Pure.
 */
import type { EditInput } from "../../edit/edit"
import type { Problems } from "../plan-items/problems"
import type { TaxDraft } from "./draft"
import { mergeFlags, wholeFlags } from "./flags"
import { chosenLabels } from "./label-edit"

/** What a form sends: the plan, the hash it read, and the draft the form opened with (null when no profile was stored). */
export interface TaxTarget {
	readonly name: string
	readonly contentHash: string
	readonly origin: TaxDraft | null
	/** The income Flows with no tax label: a whole write names a label for each. */
	readonly unlabelled?: readonly string[]
}

type Made = { ok: true; edit: EditInput } | { ok: false; problems: Problems }

/** The whole write: the chosen filing status, each item filled, and a label for each Flow that has none. */
function wholeEdit(
	target: TaxTarget,
	draft: TaxDraft,
	chosen: Readonly<Record<string, string>>,
): Made {
	const result = wholeFlags(draft)
	const named = chosenLabels(target.unlabelled ?? [], chosen)
	if (!result.ok || !named.ok) {
		return {
			ok: false,
			problems: { ...(result.ok ? {} : result.problems), ...(named.ok ? {} : named.problems) },
		}
	}
	const { filingStatus } = result.flags
	if (filingStatus === undefined) {
		return { ok: false, problems: { filingStatus: "Choose a filing status." } }
	}
	const flags = { ...result.flags, filingStatus }
	const { name, contentHash } = target
	return { ok: true, edit: { kind: "set-tax", name, contentHash, flags, labels: named.labels } }
}

/** The Edit a draft makes, to merge into the stored profile or to set the profile whole, or the problems at its fields. */
export function taxEdit(
	target: TaxTarget,
	draft: TaxDraft,
	whole: boolean,
	chosen: Readonly<Record<string, string>> = {},
): Made {
	if (whole || target.origin === null) return wholeEdit(target, draft, chosen)
	const result = mergeFlags(target.origin, draft)
	if (!result.ok) return result
	const { name, contentHash } = target
	return { ok: true, edit: { kind: "merge-tax", name, contentHash, flags: result.flags } }
}
