import { z } from "zod"
import { UUID_SHAPED } from "../../account/name"
import { defineCommand, type Leaf } from "../../command"
import { missingFieldError } from "../../document"
import { APPLY_EXAMPLES } from "../../scenario/apply-examples"
import { DOCUMENT, exclusive, REQUIRED_NAME } from "../../scenario/apply-forms"
import { applyWhatIfFlags, whatIfResult } from "../../scenario/apply-what-if"
import { applyResult, writeApplied } from "../../scenario/apply-write"
import { decimalFlag } from "../../scenario/decimal-schema"
import { invalidScenarioName } from "../../scenario/errors"
import { IF_HASH } from "../../scenario/if-hash"
import { addFlag, setFlag, withoutFlag } from "../../scenario/override-flags"
import { printTemplate } from "../../scenario/template"
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
		dryRun: z.boolean().optional().describe("Report the row and roll the write back."),
		decimal: decimalFlag,
		ifHash: IF_HASH,
		set: setFlag,
		without: withoutFlag.describe(
			"Take one list item out by its id, such as flows.gym, before any --set. Applied to the stored plan, the removal is saved.",
		),
		add: addFlag.describe(
			'Add one new list item, as list=json, such as flows=\'{"id":"extra","kind":"expense",...}\', after any --without and before any --set. Applied to the stored plan, the item is saved.',
		),
	}),
	document: DOCUMENT,
	note: "The --decimal form ships in 0.8.0, and so do --if-hash and the what-if form with --set and --without. --add ships in 0.8.0 as well.",
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
		"not_found",
		...LEDGER_READ_CODES,
	],
	run: (input, document, ctx) => {
		const wrong = exclusive(input)
		if (wrong !== undefined) return wrong
		if (input.template === true) return printTemplate(ctx, input.asOf)
		if (input.file === undefined) return applyWhatIfFlags(ctx, input)
		// The document form checks this before it reads the document; the guard keeps `name` a string.
		const name = input.name
		if (name === undefined) return missingFieldError(REQUIRED_NAME)
		if (UUID_SHAPED.test(name)) return invalidScenarioName()
		return writeApplied(ctx, {
			name,
			document,
			decimal: input.decimal === true,
			dryRun: input.dryRun === true,
			ifHash: input.ifHash,
		})
	},
})
