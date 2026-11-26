/**
 * The re-read a tax Edit makes before it writes a flat claim (issue #665): `scenario household` leaves
 * `contentHash` unchanged (cli ADR-0055), so a page read before a holder swap still names the old hash
 * and would write a bare value to the new holder. The read is the `scenario show` leaf, and only a
 * swapped profile refuses. Pure.
 */
import { z } from "zod"
import { type ErrorBody, householdDocument, taxProfile } from "../contract"
import { personNames } from "../view/item-names"
import { isFlatClaim } from "../view/tax-settings/claims"
import { flatClaimant, flatClaimRefusal } from "../view/tax-settings/flat-claims"
import type { Edit } from "./edit"

/** What the guard reads of `scenario show --json`: the household and the stored profile, nothing else. */
export const taxSwapShow = z.strictObject({
	scenario: z.looseObject({
		household: householdDocument.nullable(),
		tax: taxProfile.nullable().optional(),
	}),
})

/** The fields the guard reads of a fresh `scenario show`. */
export type TaxSwapShown = z.infer<typeof taxSwapShow>["scenario"]

/** The tax Edits that can carry a bare value for a flat claim: a merge, or a whole save. */
export type FlatClaimEdit = Extract<Edit, { kind: "merge-tax" | "set-tax" }>

/** Whether an Edit carries a flat claim, whose bare value a holder swap leaves recorded under someone else. */
export function carriesFlatClaim(edit: Edit): edit is FlatClaimEdit {
	if (edit.kind !== "merge-tax" && edit.kind !== "set-tax") return false
	return Object.keys(edit.flags).some((key) => isFlatClaim(key))
}

/** The fresh read's argv: the name after `--`, as every read of one plan takes it. */
export function taxSwapRead(name: string): { argv: string[] } {
	return { argv: ["scenario", "show", "--json", "--", name] }
}

/** The refusal when the fresh read still records the flat claims under someone else, or null. */
export function taxSwapRefusal(shown: TaxSwapShown, name: string): ErrorBody | null {
	const profile = shown.tax ?? null
	if (profile === null) return null
	const claimant = flatClaimant(profile, shown.household, personNames(shown.household))
	if (claimant === null) return null
	return {
		code: "tax_claims_recorded_elsewhere",
		exitCode: 1,
		message: flatClaimRefusal(claimant, name),
	}
}
