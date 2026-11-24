/** The form's text for what an employer adds to a salary. Nothing is pre-filled: the Account, the share and the rounding are the person's. */

import { parseBps } from "../../format/bps"
import { percentText } from "../withdrawals/check"
import { type EmployerShare, employerIdOf } from "./employer"
import type { EmployerInput } from "./employer-flow"
import type { Problems } from "./problems"

export interface EmployerDraft {
	/** The Account the employer pays into; empty until chosen. */
	account: string
	/** The share of the salary in per cent, as typed. */
	share: string
	rounding: string
}

/** The draft of a salary's employer share, or an empty one when there is none. */
export function employerDraftOf(share: EmployerShare | null): EmployerDraft {
	return {
		account: share?.account ?? "",
		share: share?.percent ?? "",
		rounding: share?.rounding ?? "",
	}
}

/** Whether the person typed or chose anything in the employer section. */
export function employerUsed(draft: EmployerDraft): boolean {
	return draft.account !== "" || draft.share.trim() !== "" || draft.rounding !== ""
}

/**
 * The input an employer draft states, or its problems at its fields. A section left empty is none (null input, no
 * problems); one filled in part is a problem at each field still empty. `traj` refuses the rest (a liability or an illiquid asset
 * as the target, a label on an employer share) at the field its path names.
 */
export function employerInputOf(
	draft: EmployerDraft,
	targets: readonly string[],
): { input: EmployerInput | null; problems: Problems } {
	if (!employerUsed(draft)) return { input: null, problems: {} }
	const problems: Record<string, string> = {}
	if (draft.account === "" || !targets.includes(draft.account)) {
		problems["employerAccount"] = "Choose the account your employer pays into."
	}
	const bps = percentText(draft.share) === null ? null : parseBps(draft.share)
	if (bps === null) {
		problems["employerShare"] =
			"Enter the share as a percent with at most two places, such as 5 or 7.5."
	}
	if (draft.rounding === "") problems["employerRounding"] = "Choose how the share rounds."
	if (Object.keys(problems).length > 0 || bps === null) return { input: null, problems }
	return { input: { account: draft.account, bps, rounding: draft.rounding }, problems }
}

/** The problem when the id the employer's Flow takes is already another item of the plan. */
export function employerIdTaken(salaryId: string): string {
	return `An item named ${employerIdOf(salaryId)} already exists in this plan and was not made by this form. Rename or remove it first.`
}
