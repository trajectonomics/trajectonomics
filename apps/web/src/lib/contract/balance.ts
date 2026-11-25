import { z } from "zod"
import { accountRef } from "./account-ref"
import { amountRow, currencyTotal } from "./amount-row"
import { dateString } from "./date"
import { money } from "./money"
import { errorBody } from "./read"

/** `traj balance --as-of --trial-balance --json`: every balance, net worth and the trial balance. */
export const balance = z.strictObject({
	asOf: dateString,
	// Optional: a traj that predates the pair (cli#95) does not print them.
	firstTransactionDate: dateString.nullable().optional(),
	noTransactionsBefore: z.boolean().optional(),
	rows: z.array(amountRow),
	// Null when the accounts' sum leaves the safe range (cli ADR 0079): every row is still stated, and `netWorthError` says why.
	netWorth: z.array(currencyTotal).nullable(),
	netWorthError: errorBody.optional(),
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
