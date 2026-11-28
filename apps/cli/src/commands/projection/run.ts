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
	reportingFlags,
	scenarioFlag,
	setFlag,
} from "../../projection/flags"
import { withProjection } from "../../projection/leaf"
import { projectionHint } from "../../projection/render"
import { reportingOptionsOf } from "../../projection/reporting-input"
import { projectionOf } from "../../projection/run"
import { RUN_EXAMPLES } from "../../projection/run-examples"
import { projectionRunView } from "../../projection/run-view"
import { addFlag, decimalFlag, withoutFlag } from "../../scenario/override-flags"

export const run: Leaf = defineCommand({
	name: "run",
	summary: "Project the Baseline through a Scenario, year by year",
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
		...reportingFlags,
	}),
	flagDocuments: [carryInFlagDocument],
	output: projectionRunView,
	render: projectionHint,
	examples: RUN_EXAMPLES,
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
			const reporting = reportingOptionsOf(input, placed.timeline)
			if (isAppError(reporting)) return reporting
			return projectionOf(placed, { ...input, reporting })
		})
	},
})
