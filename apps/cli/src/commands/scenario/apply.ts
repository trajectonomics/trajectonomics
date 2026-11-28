import { z } from "zod"
import { defineCommand, type Leaf } from "../../command"
import { runApply } from "../../scenario/apply-command"
import { APPLY_EXAMPLES } from "../../scenario/apply-examples"
import { DOCUMENT } from "../../scenario/apply-forms"
import { whatIfResult } from "../../scenario/apply-what-if"
import { applyResult } from "../../scenario/apply-write"
import { decimalFlag } from "../../scenario/decimal-schema"
import { fromHistoryFlag, monthsFlag } from "../../scenario/history-flags"
import { IF_HASH } from "../../scenario/if-hash"
import { addFlag, setFlag, withoutFlag } from "../../scenario/override-flags"
import { LEDGER_READ_CODES } from "../../store"

export const apply: Leaf = defineCommand({
	name: "apply",
	summary: "Create or update a Scenario from a JSON document, or apply a what-if to its plan",
	description:
		"Three forms. --file stores a JSON document as the Scenario. --template prints a document to start from. --set, --without and --add, with no --file, apply the same Overrides projection run applies to the stored Scenario and store the result, so a what-if that projects is the one that is saved (--add puts a new item on a list); an apply that leaves the plan unchanged writes nothing.",
	positionals: ["name"],
	input: z.strictObject({
		name: z
			.string()
			.min(1)
			.optional()
			.describe("The Scenario's name; exact, case-sensitive and not shaped like a UUID."),
		file: z
			.string()
			.min(1)
			.optional()
			.describe(
				"The JSON document's path, or - for stdin; its schema is `traj schema scenario apply`, and --template prints one to start from.",
			),
		template: z
			.boolean()
			.optional()
			.describe(
				"Print a document to start from: a minimal one, which opens no data directory, or one pre-filled with --as-of.",
			),
		asOf: z
			.string()
			.min(1)
			.optional()
			.describe(
				"With --template, pre-fill the document from the Baseline at this date, as YYYY-MM-DD.",
			),
		fromHistory: fromHistoryFlag,
		months: monthsFlag,
		dryRun: z.boolean().optional().describe("Report the row and roll the write back."),
		decimal: decimalFlag,
		ifHash: IF_HASH,
		set: setFlag.describe(
			`${setFlag.description ?? ""} Applied to the stored plan, the Set is saved.`,
		),
		without: withoutFlag.describe(
			"Take one list item out by its id, such as flows.gym, before any --set. Applied to the stored plan, the removal is saved.",
		),
		add: addFlag.describe(
			'Add one new list item, as list=json, such as flows=\'{"id":"extra","kind":"expense",...}\', after any --without and before any --set. Applied to the stored plan, the item is saved.',
		),
	}),
	document: DOCUMENT,
	note: "The --decimal form ships in 0.8.0, and so do --if-hash, the what-if form with --set and --without, --add, and the droppedAnchors it reports.",
	output: z.union([z.string(), applyResult, whatIfResult]),
	examples: APPLY_EXAMPLES,
	errorCodes: [
		"database_busy",
		"invalid_input",
		"INVALID_DATE",
		"INVALID_AMOUNT",
		"NEGATIVE_AMOUNT",
		"AMOUNT_OVERFLOW",
		"unsupported_currency",
		"scenario_changed",
		"scenario_name_taken",
		"not_found",
		...LEDGER_READ_CODES,
	],
	run: (input, document, ctx) => runApply(input, document, ctx),
})
