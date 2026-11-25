import type { ThFilingStatus } from "@trajectonomics/core/tax/th"
import type { TaxAllowances } from "./allowances"
import { ALLOWANCE_FLAGS } from "./allowances"
import { labelSetsSentence } from "./labels"

export type { ThFilingStatus }

/** The tax the CLI can apply today; a second jurisdiction adds a value, not a flag (ADR-0032). */
export type TaxJurisdiction = "th-2026"

/**
 * The flags that ask for tax; without `tax` the others are refused rather than ignored. Each profile
 * value is written `[<person>=]<value>`, a bare value naming the holder (cli ADR-0075). The allowance
 * fields are the shared `TaxAllowances` keys, so a new deduction has one list to join.
 */
export type TaxFlags = {
	tax?: TaxJurisdiction | undefined
	filingStatus?: ThFilingStatus | undefined
	children?: string[] | undefined
	childrenAtHigherRate?: string[] | undefined
	/** `scenario tax --none` removes the Levy and its stored profile instead of writing one. */
	none?: boolean | undefined
	/** `scenario tax --merge` changes the flags given and keeps the rest of the stored profile. */
	merge?: boolean | undefined
	/** `scenario tax --from-stored` writes the Levy again from the stored profile. */
	fromStored?: boolean | undefined
} & { readonly [K in keyof TaxAllowances]?: string[] | undefined }

/** One Return's claims: the counts and allowances that Return states (cli ADR-0075). */
export type ReturnClaims = {
	children: number
	childrenAtHigherRate: number
	allowances: TaxAllowances
}

/** What the caller asked the CLI to write, with every default resolved. */
export type TaxRequest = {
	jurisdiction: TaxJurisdiction
	filingStatus: ThFilingStatus
	children: number
	childrenAtHigherRate: number
	allowances: TaxAllowances
	/** One claim set per Return, for `married_separate` with Filers; absent otherwise. */
	returns?: Record<string, ReturnClaims>
	/** The profile fields a person-qualified flag stated; absent when the caller stated none. */
	persons?: string[]
}

/** A filing status a caller may name; the values are tax-core's own enum. */
export const FILING_STATUSES: readonly [ThFilingStatus, ...ThFilingStatus[]] = [
	"single",
	"married_no_income_spouse",
	"married_separate",
	"married_joint",
	"married_separate_40_1_joint_rest",
]

/**
 * The `--label` flag's one description, so usage and `traj schema` publish the same closed sets
 * (ADR-0010). Both lists are `@trajectonomics/core/tax`'s own exports: a pin bump that changes them
 * changes what this says, and no label is restated here (ADR-0032).
 */
export function labelFlagDescription(): string {
	return [
		"Classify one Flow for tax as <flow>=<label>, such as salary=income.section40_1; needs --tax.",
		"A label replaces that Flow's label and adds to the labels the other Flows already carry; --none clears them all.",
		labelSetsSentence(),
	].join(" ")
}

/** The profile flags, in the order a refusal names them. */
export function profileFields(): readonly string[] {
	return ["children", "childrenAtHigherRate", ...ALLOWANCE_FLAGS]
}

/** Whether a profile flag that changes the Levy was given, `--tax` itself aside. */
export function changesProfile(flags: TaxFlags): boolean {
	if (flags.filingStatus !== undefined) return true
	return profileFields().some((field) => flags[field as keyof TaxFlags] !== undefined)
}

/** Whether any flag that writes a Levy was given. */
export function writesLevy(flags: TaxFlags): boolean {
	return flags.tax !== undefined || changesProfile(flags)
}

/** The caller's spelling of one field, so a refusal names the flag rather than the schema key. */
export function flagOf(field: string): string {
	return `--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
}
