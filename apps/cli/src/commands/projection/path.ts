import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand } from "../../command"
import { MAX_PATHS, MIN_PATHS, SEED_PATTERN } from "../../dashboard/flags"
import { fail, isAppError } from "../../errors"
import { readCarryIn } from "../../projection/carryin"
import { withCarryInSide } from "../../projection/carryin-apply"
import { returnModelFlagDocument } from "../../projection/chance-model"
import { bucketsFlag, modelSourceOf, returnModelFlag } from "../../projection/chance-plan"
import {
	asOfFlag,
	carryInFlag,
	carryInFlagDocument,
	horizonFlag,
	outputFlags,
	PROJECTION_ERROR_CODES,
	scenarioFlag,
} from "../../projection/flags"
import { withProjection } from "../../projection/leaf"
import { pathOf } from "../../projection/path"
import { PATH_EXAMPLES } from "../../projection/path-examples"
import { pathHint } from "../../projection/path-human"
import { projectionPathView } from "../../projection/path-view"
import { addFlag, decimalFlag, setFlag, withoutFlag } from "../../scenario/override-flags"

/** The method in the words a help page prints: which path, and what the result adds to a run's. */
const PATH_METHOD =
	"Replays one Market path of a chance of success: the Projection of path --index of the run that --return-model, --paths and --seed define, the path `traj projection chance --outcomes` lists as outcomes[index]. The result is `traj projection run`'s (the annual roll-up, the tax years, and with the same opt-in flags the monthly rows, the cash flow, the loans, each Account's value, what each spending rule paid and the estate) plus returns: each Account's market return over each annual roll-up, in basis points, and the run it is a path of. The figures are nominal. Pass the flags you gave projection chance, and an index from 0 to --paths - 1; a path is named by its index under the seed, so the same flags always replay the same path (cli ADR-0069)."

export const path: Leaf = defineCommand({
	name: "path",
	summary: "Replay one seeded Market path of a chance of success, year by year",
	description: PATH_METHOD,
	note: "Replaying a Market path ships in 0.8.0.",
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
			.describe(
				"The number of Market paths the run drew, from 1 to 10,000: the count you gave projection chance. There is no default.",
			),
		seed: z
			.string()
			.meta({ pattern: SEED_PATTERN.source })
			.describe("Sixteen lower-case hex digits: the seed you gave projection chance."),
		index: z
			.number()
			.int()
			.describe(
				"Which Market path to replay, from 0 to --paths - 1: the index projection chance --outcomes lists.",
			),
		...outputFlags,
	}),
	flagDocuments: [returnModelFlagDocument, carryInFlagDocument],
	output: projectionPathView,
	render: pathHint,
	examples: PATH_EXAMPLES,
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
			return pathOf(
				placed,
				source,
				{ seed: input.seed, paths: input.paths, index: input.index },
				input,
			)
		})
	},
})
