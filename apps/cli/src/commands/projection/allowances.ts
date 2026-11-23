import { TH_LEVY_CONTRIBUTION_LABELS } from "@trajectonomics/core/tax/th"
import { z } from "zod"
import { BASELINE_CURRENCY } from "../../baseline/kind"
import type { Leaf } from "../../command"
import { defineCommand } from "../../command"
import { isAppError } from "../../errors"
import { allowancesOf } from "../../projection/allowances"
import { ALLOWANCES_EXAMPLES, ALLOWANCES_METHOD } from "../../projection/allowances-help"
import { allowanceBlocks, allowancesShown } from "../../projection/allowances-human"
import { requestOf } from "../../projection/allowances-input"
import { allowancesView } from "../../projection/allowances-view"
import { readCarryIn } from "../../projection/carryin"
import { withCarryInSide } from "../../projection/carryin-apply"
import {
	asOfFlag,
	carryInFlag,
	carryInFlagDocument,
	horizonFlag,
	PROJECTION_ERROR_CODES,
	scenarioFlag,
} from "../../projection/flags"
import { withProjection } from "../../projection/leaf"
import { addFlag, decimalFlag, setFlag, withoutFlag } from "../../scenario/override-flags"

export const allowances: Leaf = defineCommand({
	name: "allowances",
	summary: "Report how much more each tax allowance could take, and the tax it would save",
	description: ALLOWANCES_METHOD,
	note: "The tax allowance read ships in 0.8.0.",
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
		labels: z
			.string()
			.describe(
				`The contribution Tally labels to fill, separated by commas, in the order they should fill; each must be one the Scenario's Levy reads as a funded contribution. The Levy \`scenario tax\` writes reads: ${TH_LEVY_CONTRIBUTION_LABELS.join(", ")}.`,
			),
		step: z
			.string()
			.describe(
				'The size of one step, as a decimal string of the Currency\'s major unit, such as "1000" or "1000.00". It must be larger than one major unit. There is no default.',
			),
		budget: z
			.string()
			.optional()
			.describe(
				"The most the extra contributions may add up to in each tax year, in major units. Without it only the caps and the taxable income bound them.",
			),
		minSaving: z
			.string()
			.optional()
			.describe(
				"The least share of a step a step must save to be taken, as a percent from 0 to 100 with at most two decimals, such as 5 or 12.5.",
			),
	}),
	flagDocuments: [carryInFlagDocument],
	output: allowancesView,
	render: { display: allowancesShown, blocks: allowanceBlocks },
	examples: [...ALLOWANCES_EXAMPLES],
	errorCodes: PROJECTION_ERROR_CODES,
	run: async (input, ctx) => {
		const request = requestOf(input, BASELINE_CURRENCY)
		if (isAppError(request)) return request
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
			return allowancesOf(placed, request)
		})
	},
})
