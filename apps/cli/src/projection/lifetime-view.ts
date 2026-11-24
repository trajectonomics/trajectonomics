import type { Projection } from "@trajectonomics/core/sim"
import { z } from "zod"
import { moneyField, moneyOf } from "./money"

/*
 * What a Projection states over the whole horizon (sim ADR-0027, ADR-0028, cli ADR-0067): each fee and
 * payout Account's lifetime totals and the plan's fees. The engine sums them in the run that makes the
 * roll-ups, so nothing is added here: each figure is the engine's, in the CLI's money (ADR-0058).
 */

/** One Account's totals over the horizon; each figure is present only when the Account declares that item. */
export type AccountLifetimeView = {
	account: string
	lifetimeFees?: string | undefined
	lifetimePayouts?: string | undefined
}

export const accountLifetime: z.ZodType<AccountLifetimeView> = z.strictObject({
	account: z.string().describe("The Account's id, as the Scenario spells it."),
	lifetimeFees: moneyField(
		"What the Account was charged over the whole horizon, zero if never charged; present only when the Account carries a fee above 0 bps",
	).optional(),
	lifetimePayouts: moneyField(
		"What the Account paid out over the whole horizon, zero if it never paid; present only when the Account carries a payout above 0 bps",
	).optional(),
})

/** The fields `projection run` adds when the Scenario declares a fee or a payout above 0 bps. */
export type LifetimeFields = {
	lifetimeFees?: string
	accountLifetimes?: AccountLifetimeView[]
}

export const lifetimeFeesField: z.ZodType<string | undefined> = moneyField(
	"What every fee Account was charged over the whole horizon, all Accounts together; present only when an Account carries a fee above 0 bps",
).optional()

export const accountLifetimesField: z.ZodType<AccountLifetimeView[] | undefined> = z
	.array(accountLifetime)
	.describe(
		"Each fee or payout Account's totals over the whole horizon, in Scenario order, one entry per Account that carries a fee or a payout above 0 bps; present only then. The figures are the engine's: each is the sum of that Account's figures in the fees table and the payout lines, and lifetimeFees is the sum of the Accounts' lifetimeFees.",
	)
	.optional()

/** The totals the engine states, in the currency's money; no key when it states none (byte for byte as before). */
export function lifetimeFieldsOf(projection: Projection, currency: string): LifetimeFields {
	const money = moneyOf(currency)
	const { lifetimeFees, accountLifetimes } = projection
	return {
		...(lifetimeFees === undefined ? {} : { lifetimeFees: money(lifetimeFees) }),
		...(accountLifetimes === undefined
			? {}
			: {
					accountLifetimes: accountLifetimes.map((entry) => ({
						account: entry.account,
						...(entry.lifetimeFees === undefined
							? {}
							: { lifetimeFees: money(entry.lifetimeFees) }),
						...(entry.lifetimePayouts === undefined
							? {}
							: { lifetimePayouts: money(entry.lifetimePayouts) }),
					})),
				}),
	}
}
