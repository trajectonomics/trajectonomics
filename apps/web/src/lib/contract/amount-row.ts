import { z } from "zod"
import { accountRef } from "./account-ref"
import { accountType } from "./account-type"
import { money } from "./money"

/** One account's amount in a balance, a net worth, or a profit and loss report. */
export const amountRow = z.strictObject({
	account: accountRef,
	type: accountType,
	amount: money,
	currency: z.string(),
})
export type AmountRow = z.infer<typeof amountRow>

/** A currency's total in a report. */
export const currencyTotal = z.strictObject({ currency: z.string(), amount: money })
export type CurrencyTotal = z.infer<typeof currencyTotal>
