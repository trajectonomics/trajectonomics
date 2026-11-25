import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand } from "../../command"
import { MAX_PATHS, MIN_PATHS, SEED_PATTERN } from "../../dashboard/flags"
import { fail, isAppError } from "../../errors"
import { readCarryIn } from "../../projection/carryin"
import { withCarryInSide } from "../../projection/carryin-apply"
import { chanceOf } from "../../projection/chance"
import { CHANCE_EXAMPLES } from "../../projection/chance-examples"
import { chanceHint } from "../../projection/chance-hint"
import { returnModelFlagDocument } from "../../projection/chance-model"
import { outcomesFlag } from "../../projection/chance-outcomes-view"
import { bucketsFlag, modelSourceOf, returnModelFlag } from "../../projection/chance-plan"
import { chanceView } from "../../projection/chance-view"
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

/** The method in the words a help page prints: what runs, and what the result does not say. */
const CHANCE_METHOD =
	"Runs the Scenario through the Market paths of one Return model, each drawn from a seed, and reports the share of paths that never run out before the Horizon. The Bands are the net-worth Percentiles across paths at each annual roll-up; for a Scenario with a spending rule, spendingBands add what the rule paid in each roll-up and lowestYearSpending the least a path paid in a whole year, a path that ran out counting 0. With --outcomes the result also lists what each Market path came to (closing and lowest net worth, the roll-up it was lowest in, when it ran out) and names the paths worth opening first, and `traj projection path --index N` replays one of them year by year (cli ADR-0069). The figures are nominal, and the CLI ships no Return model: the caller states one, as a file, or as `plan`, which builds it from the Scenario's own Accounts (each asset's `rate` and `volatility`, cli ADR-0068)."

export const chance: Leaf = defineCommand({
	name: "chance",
	summary: "Report the chance a Scenario holds to its Horizon, over seeded Market paths",
	description: CHANCE_METHOD,
	note: "Chance of success ships in 0.8.0.",
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
		returnModel: returnModelFlag,
		buckets: bucketsFlag,
		paths: z
			.number()
			.int()
			.meta({ minimum: MIN_PATHS, maximum: MAX_PATHS })
			.describe("The number of Market paths to run, from 1 to 10,000. There is no default."),
		seed: z
			.string()
			.meta({ pattern: SEED_PATTERN.source })
			.describe("Sixteen lower-case hex digits. The same seed and model give the same paths."),
		outcomes: outcomesFlag,
	}),
	flagDocuments: [returnModelFlagDocument, carryInFlagDocument],
	output: chanceView,
	render: chanceHint,
	examples: CHANCE_EXAMPLES,
	errorCodes: PROJECTION_ERROR_CODES,
	run: async (input, ctx) => {
		// Standard input can be read once, so only one of the two documents may come from it.
		if (input.returnModel === "-" && input.carryIn === "-") {
			return fail("invalid_input", {
				path: "--carry-in",
				message: "--carry-in: standard input already holds the Return model",
				hint: "Read one of the two documents from a file: --return-model PATH or --carry-in PATH.",
			})
		}
		const source = await modelSourceOf(input, ctx.stdin)
		if (isAppError(source)) return source
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
			return chanceOf(placed, source, {
				seed: input.seed,
				paths: input.paths,
				outcomes: input.outcomes,
			})
		})
	},
})
