import { z } from "zod"
import { valueDocument, valueTemplate } from "../../account/value/document"
import { templateRefusal, valueMany, valueOne } from "../../account/value/run"
import { valueResult, valuesResult } from "../../account/value/schema"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { LEDGER_READ_CODES } from "../../store"

export const value: Leaf = defineCommand({
	name: "value",
	summary: "Record what an account is worth on a date, and write the difference",
	description:
		"Three forms. ACCOUNT --value --date --against states one value. --file states many from a JSON document, applied in date order, then account id order, in one write that is all or nothing. --template prints a document to start from. The difference is a Transaction posted against an income or equity account of your choosing, and a value that equals the account's Balance writes nothing.",
	positionals: ["account"],
	input: z.strictObject({
		account: z
			.string()
			.min(1)
			.optional()
			.describe("The asset or liability to value, by exact name or id; required for one value."),
		value: z
			.string()
			.optional()
			.describe(
				"What the account is worth on --date, as a decimal in its currency: an asset's value, or what a liability still owes.",
			),
		date: z
			.string()
			.optional()
			.describe(
				"The YYYY-MM-DD date the value is stated for; the Balance is read at the end of that day.",
			),
		against: z
			.string()
			.min(1)
			.optional()
			.describe(
				"The income or equity Leaf Account, in the same currency, that takes the difference.",
			),
		file: z
			.string()
			.min(1)
			.optional()
			.describe(
				"A JSON document of values, or - for stdin; its schema is `traj schema account value`, and --template prints one.",
			),
		template: z
			.boolean()
			.optional()
			.describe("Print a document to start from; opens no data directory."),
		dryRun: z.boolean().optional().describe("Report the valuation and roll the write back."),
	}),
	document: {
		flag: "file",
		schema: valueDocument,
		allowed: ["dryRun"],
		hint: 'Run "traj account value --template" to print a document, or "traj account value <account> --value <amount> --date <date> --against <account>" to state one value.',
	},
	output: z.union([z.string(), valueResult, valuesResult]),
	examples: [
		{
			command:
				'traj account value Investment --value 480000.00 --date 2026-03-31 --against "Market gains"',
			description: "Record what an account is worth on a date, and write the difference.",
		},
		{
			command:
				'traj account value Investment --value 500000.00 --date 2026-04-30 --against "Market gains" --dry-run',
			description: "Preview a value and the difference it would write, then roll it back.",
		},
		{
			command: "traj account value --file values.json --dry-run",
			description: "Preview a document of values without writing anything.",
		},
		{
			command: "traj account value --template",
			description: "Print a document of values to start from.",
		},
	],
	errorCodes: [
		"AMOUNT_OVERFLOW",
		"INVALID_AMOUNT",
		"INVALID_DATE",
		"NON_LEAF_ACCOUNT",
		"UNKNOWN_ACCOUNT",
		"account_archived",
		"database_busy",
		"invalid_input",
		"valuation_account_invalid",
		"valuation_against_invalid",
		...LEDGER_READ_CODES,
	],
	run: (input, document, ctx) => {
		if (input.template === true) return templateRefusal(input) ?? ok(valueTemplate)
		if (input.file !== undefined) {
			return valueMany(ctx, input.file, document, input.dryRun === true)
		}
		return valueOne(ctx, input)
	},
})
