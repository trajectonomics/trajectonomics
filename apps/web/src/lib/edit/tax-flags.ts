/**
 * The flags `traj scenario tax` takes for a tax profile, as an Edit carries them
 * ([web ADR 0015](../../../docs/adr/0015-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)). Each value is
 * the text the person typed, shaped so that `traj` can read it and never as a flag: only digits, with a point for an amount.
 * `traj` parses and checks every value, so nothing here is a rate or a limit. Pure.
 */
import { z } from "zod"

/** The filing statuses `traj scenario tax --filing-status` takes (the core's own enum, as `traj schema` lists them). */
export const FILING_STATUSES = [
	"single",
	"married_no_income_spouse",
	"married_separate",
	"married_joint",
	"married_separate_40_1_joint_rest",
] as const

/** The profile's counts, in the order their flags are written. */
export const COUNT_KEYS = ["children", "childrenAtHigherRate", "parents", "disabledCare"] as const

/** The profile's amounts in baht, in the order their flags are written. */
export const AMOUNT_KEYS = [
	"socialSecurity",
	"lifeInsurance",
	"healthInsurance",
	"parentHealthInsurance",
	"spouseLifeInsurance",
	"mortgageInterest",
	"donation2x",
	"donation1x",
] as const

/** A key of the profile that is a count of people. */
export type CountKey = (typeof COUNT_KEYS)[number]
/** A key of the profile that is an amount. */
export type AmountKey = (typeof AMOUNT_KEYS)[number]

/** A count as `traj` reads it: whole digits. */
export const COUNT_SHAPE = /^\d{1,3}$/
/** An amount as `traj` reads it: digits with an optional decimal part, never a sign. */
export const AMOUNT_SHAPE = /^\d{1,15}(\.\d{1,2})?$/

const count = z.string().regex(COUNT_SHAPE)
const amount = z.string().regex(AMOUNT_SHAPE)

/** The profile flags an Edit may carry. Each is optional: a merge names only what changes, a whole write what it states. */
export const taxFlags = z.strictObject({
	filingStatus: z.enum(FILING_STATUSES).optional(),
	children: count.optional(),
	childrenAtHigherRate: count.optional(),
	parents: count.optional(),
	disabledCare: count.optional(),
	socialSecurity: amount.optional(),
	lifeInsurance: amount.optional(),
	healthInsurance: amount.optional(),
	parentHealthInsurance: amount.optional(),
	spouseLifeInsurance: amount.optional(),
	mortgageInterest: amount.optional(),
	donation2x: amount.optional(),
	donation1x: amount.optional(),
})

/** The profile flags of one Edit. */
export type TaxFlags = z.infer<typeof taxFlags>

/** The keys in the order their flags are written: the filing status, the counts, then the amounts. */
export const TAX_FLAG_KEYS = ["filingStatus", ...COUNT_KEYS, ...AMOUNT_KEYS] as const

/** The flag a key is: its camelCase name in kebab case, as `traj scenario tax --help` spells it. */
export function flagOf(key: string): string {
	return `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
}

/** The argv tokens of the flags an Edit carries, each pair in the fixed order of `TAX_FLAG_KEYS`. */
export function taxTokens(flags: TaxFlags): string[] {
	return TAX_FLAG_KEYS.flatMap((key) => {
		const value = flags[key]
		return value === undefined ? [] : [flagOf(key), value]
	})
}
