import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand } from "../../command"
import { isAppError } from "../../errors"
import { readCarryIn } from "../../projection/carryin"
import { withCarryInSide } from "../../projection/carryin-apply"
import { FI_METHOD } from "../../projection/fi-method"
import {
	asOfFlag,
	carryInFlag,
	carryInFlagDocument,
	horizonFlag,
	outputFlags,
	PROJECTION_ERROR_CODES,
	scenarioFlag,
	setFlag,
} from "../../projection/flags"
import { withProjection } from "../../projection/leaf"
import { projectionHint } from "../../projection/render"
import { projectionOf } from "../../projection/run"
import { projectionRunView } from "../../projection/run-view"
import { addFlag, decimalFlag, withoutFlag } from "../../scenario/override-flags"

export const run: Leaf = defineCommand({
	name: "run",
	summary: "Project the Baseline through a Scenario, year by year",
	note: "Each person's age on the rows, and the --breakdown cash flow, --liabilities statements and --accounts values, ships in 0.8.0.",
	description: FI_METHOD,
	positionals: [],
	input: z.strictObject({
		asOf: asOfFlag,
		horizon: horizonFlag,
		scenario: scenarioFlag,
		set: setFlag,
		without: withoutFlag,
		add: addFlag,
		decimal: decimalFlag,
		carryIn: carryInFlag,
		...outputFlags,
	}),
	flagDocuments: [carryInFlagDocument],
	output: projectionRunView,
	render: projectionHint,
	examples: [
		{
			command: "traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --json",
			description: "The annual roll-up of one Scenario.",
		},
		{
			command:
				"traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --set flows.salary.amount=9000000 --monthly",
			description: "Try a raise without forking, and read the monthly rows.",
		},
		{
			command:
				"traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --breakdown --json",
			description:
				"The annual roll-up with each year's cash flow by source, tax, category and Account.",
		},
		{
			command:
				"traj projection run --scenario car-loan --as-of 2026-03-31 --horizon 2027-03-30 --liabilities --json",
			description:
				"The annual roll-up of a Scenario that borrows, with each loan's month by month and its paid-off date.",
		},
		{
			command:
				"traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --accounts --json",
			description:
				"The annual roll-up with each Account's value, nominal and real, on the row at each year's end.",
		},
		{
			command:
				"traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --without flows.invest --json",
			description: "The annual roll-up with one Stream taken out, and nothing saved.",
		},
		{
			command: `traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --add 'flows={"id":"extra","kind":"expense","amount":"1000.00","frequency":"monthly","start":"2026-04-01","growth":{"bps":0}}' --decimal --json`,
			description: "The annual roll-up with one new Flow added, and nothing saved.",
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
				add: input.add ?? [],
				decimal: input.decimal,
			})
			if (isAppError(prepared)) return prepared
			const placed = withCarryInSide({ prepared, records, asOf: input.asOf })
			if (isAppError(placed)) return placed
			return projectionOf(placed, input)
		})
	},
})
