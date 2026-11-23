import { z } from "zod"
import type { Leaf } from "../command"
import { defineCommand } from "../command"
import { isAppError } from "../errors"
import { readCarryIn } from "../projection/carryin"
import { withCarryInSide } from "../projection/carryin-apply"
import { independenceOf } from "../projection/fi"
import { FI_HORIZON, FI_METHOD } from "../projection/fi-method"
import { fiView } from "../projection/fi-view"
import {
	asOfFlag,
	carryInFlag,
	carryInFlagDocument,
	fiHorizonFlag,
	PROJECTION_ERROR_CODES,
	scenarioFlag,
	setFlag,
} from "../projection/flags"
import { withProjection } from "../projection/leaf"
import { decimalFlag, withoutFlag } from "../scenario/override-flags"

export const fi: Leaf = defineCommand({
	name: "fi",
	summary: "Report the financial independence date under a Scenario",
	note: "Each person's age at the FI date ships in 0.8.0.",
	description: `${FI_METHOD} ${FI_HORIZON}`,
	positionals: [],
	input: z.strictObject({
		asOf: asOfFlag,
		horizon: fiHorizonFlag,
		scenario: scenarioFlag,
		set: setFlag,
		without: withoutFlag,
		decimal: decimalFlag,
		carryIn: carryInFlag,
	}),
	flagDocuments: [carryInFlagDocument],
	output: fiView,
	examples: [
		{
			command: "traj fi --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --json",
			description: "The survival FI date, with the 25x figure as a labelled reference.",
		},
		{
			command:
				"traj fi --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --set flows.salary.amount=9000000",
			description: "The same date under one changed assumption.",
		},
	],
	errorCodes: PROJECTION_ERROR_CODES,
	run: async (input, ctx) => {
		const records = input.carryIn === undefined ? [] : await readCarryIn(input.carryIn, ctx.stdin)
		if (isAppError(records)) return records
		return withProjection(input, ctx, (prepare) => {
			const prepared = prepare({
				scenario: input.scenario,
				scenarioPath: "scenario",
				sets: input.set ?? [],
				without: input.without ?? [],
				decimal: input.decimal,
			})
			if (isAppError(prepared)) return prepared
			const placed = withCarryInSide({ prepared, records, asOf: input.asOf })
			if (isAppError(placed)) return placed
			return independenceOf(placed)
		})
	},
})
