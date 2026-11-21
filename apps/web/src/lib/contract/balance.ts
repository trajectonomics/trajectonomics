import { z } from "zod"
import { accountRef } from "./account-ref"
import { amountRow, currencyTotal } from "./amount-row"
import { dateString } from "./date"
import { money } from "./money"

/** `traj balance --as-of --trial-balance --json`: every balance, net worth and the trial balance. */
export const balance = z.strictObject({
	asOf: dateString,
	rows: z.array(amountRow),
	netWorth: z.array(currencyTotal),
	trialBalance: z
		.strictObject({
			rows: z.array(
				z.strictObject({ account: accountRef, debit: money, credit: money, currency: z.string() }),
			),
			totals: z.array(z.strictObject({ currency: z.string(), debit: money, credit: money })),
		})
		.optional(),
	hint: z.string().optional(),
})
export type Balance = z.infer<typeof balance>
