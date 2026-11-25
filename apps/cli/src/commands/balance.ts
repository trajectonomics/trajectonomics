import { z } from "zod"
import type { Leaf } from "../command"
import { defineCommand } from "../command"
import { type BalanceResult, balanceOf } from "../report/balance"
import { recordNoteBlocks, recordStartShape } from "../report/record"
import { totalDisplay, totalRefusal } from "../report/total-view"
import { reportRow, totalView, trialBalanceView } from "../report/view"
import { withLedger } from "../report/with-ledger"
import { LEDGER_READ_CODES } from "../store"

const resultSchema: z.ZodType<BalanceResult> = z.strictObject({
	asOf: z.string().describe("The date the balances are stated at, as YYYY-MM-DD."),
	...recordStartShape,
	rows: z.array(reportRow).describe("One row per Leaf Account, in `account list` order."),
	netWorth: z
		.array(totalView)
		.nullable()
		.describe(
			"Assets minus liabilities, one entry per currency; null when the accounts' sum leaves the safe range, and `netWorthError` says so. Every row is still stated.",
		),
	netWorthError: totalRefusal
		.optional()
		.describe("Why `netWorth` is null, present only then. The call still exits 0."),
	trialBalance: trialBalanceView
		.optional()
		.describe(
			"The Trial Balance, present only when --trial-balance is given. When a column's sum leaves the safe range its `totals` is null and `totalsError` says so; every row is still stated.",
		),
	hint: z
		.string()
		.optional()
		.describe(
			"The command that fills the empty answer, present only when the Ledger is why it is empty.",
		),
})

export const balance: Leaf = defineCommand({
	name: "balance",
	summary: "Show every account's balance and net worth at a date",
	positionals: [],
	input: z.strictObject({
		asOf: z.string().describe("The date the balances are stated at, as YYYY-MM-DD."),
		trialBalance: z
			.boolean()
			.optional()
			.describe("Add the Trial Balance and assert its debit and credit totals agree."),
	}),
	output: resultSchema,
	render: {
		blocks: recordNoteBlocks,
		display: totalDisplay(
			{ total: "netWorth", error: "netWorthError" },
			{ total: "totals", error: "totalsError", within: "trialBalance" },
		),
	},
	examples: [
		{
			command: "traj balance --as-of 2026-03-31 --json",
			description: "Every account's balance and net worth at one date.",
		},
		{
			command: "traj balance --as-of 2026-03-31 --trial-balance",
			description: "Add the trial balance and check that debits equal credits.",
		},
	],
	errorCodes: ["INVALID_DATE", "AMOUNT_OVERFLOW", ...LEDGER_READ_CODES],
	run: (input, ctx) => withLedger(ctx, (ledger) => balanceOf(ledger, input)),
})
