import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { isAppError } from "../../errors"
import { printedRow } from "../../scenario/decimal"
import { decimalFlag } from "../../scenario/decimal-schema"
import { scenarioNotFound } from "../../scenario/errors"
import { isTaxed, scenarioWithHousehold, taxOf } from "../../scenario/shown"
import { taxAllowancesOf } from "../../scenario/tax/shown-allowances"
import { householdOf, view } from "../../scenario/view"
import { householdHash } from "../../store/canonical"
import { withStore } from "../../with-store"

export const show: Leaf = defineCommand({
	name: "show",
	summary: "Show one Scenario with its document, household and owners",
	note: "The --decimal form ships in 0.8.0, and so do the stored tax profile, the notes, the main mark, the tax allowances and the household with its householdHash.",
	positionals: ["scenario"],
	input: z.strictObject({
		scenario: z.string().describe("The Scenario's exact name or its id."),
		decimal: decimalFlag,
	}),
	output: z.strictObject({
		scenario: scenarioWithHousehold,
	}),
	examples: [
		{ command: "traj scenario show base", description: "Show a Scenario by name." },
		{
			command: "traj scenario show base --json",
			description:
				"Print the Scenario as JSON; pipe it to jq to pick out the document, or its household, whose owners say who owns each Flow or Account.",
		},
		{
			command: "traj scenario show base --decimal",
			description: "Show money as decimal strings, ready to edit and apply with --decimal.",
		},
	],
	errorCodes: ["not_found", "unsupported_currency"],
	run: (input, ctx) =>
		withStore(ctx, (store) => {
			const row = store.getScenario(input.scenario)
			if (isAppError(row)) return row
			if (row === null) return scenarioNotFound(input.scenario)
			const plain = view(row)
			const shown = printedRow(plain, input.decimal === true)
			if (isAppError(shown)) return shown
			const household = householdOf(row)
			if (isAppError(household)) return household
			const tax = taxOf(row)
			const taxAllowances = taxAllowancesOf(tax, plain.document)
			return ok({
				scenario: {
					...shown,
					household,
					householdHash: householdHash(row.document, row.household),
					tax,
					taxed: isTaxed(shown.document),
					...(taxAllowances === undefined ? {} : { taxAllowances }),
					notes: row.notes,
					main: row.main,
				},
			})
		}),
})
