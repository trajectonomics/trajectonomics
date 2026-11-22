import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { isAppError } from "../../errors"
import { printedRow } from "../../scenario/decimal"
import { decimalFlag } from "../../scenario/decimal-schema"
import { scenarioNotFound } from "../../scenario/errors"
import { scenarioView, view } from "../../scenario/view"
import { withStore } from "../../with-store"

export const show: Leaf = defineCommand({
	name: "show",
	summary: "Show one Scenario with its document",
	note: "The --decimal form ships in 0.8.0.",
	positionals: ["scenario"],
	input: z.strictObject({
		scenario: z.string().describe("The Scenario's exact name or its id."),
		decimal: decimalFlag,
	}),
	output: z.strictObject({
		scenario: scenarioView,
	}),
	examples: [
		{ command: "traj scenario show base", description: "Show a Scenario by name." },
		{
			command: "traj scenario show base --json",
			description: "Print the Scenario as JSON; pipe it to jq to pick out the document.",
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
			const shown = printedRow(view(row), input.decimal === true)
			return isAppError(shown) ? shown : ok({ scenario: shown })
		}),
})
