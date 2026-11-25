import type { Scenario } from "@trajectonomics/core/sim"
import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { type AppError, isAppError } from "../../errors"
import { returnModelDocument } from "../../projection/chance-model"
import { DEFAULT_BUCKETS, planModelOf } from "../../projection/chance-plan"
import { scenarioFlag } from "../../projection/flags"
import type { ScenarioDocument } from "../../scenario/document"
import { scenarioNotFound } from "../../scenario/errors"
import {
	addFlag,
	decimalFlag,
	decimalProblem,
	setFlag,
	withoutFlag,
} from "../../scenario/override-flags"
import { applyScenarioSets } from "../../scenario/set-apply"
import { withStore } from "../../with-store"

export const model: Leaf = defineCommand({
	name: "model",
	summary: "Print the Return model a Scenario implies, as JSON",
	note: "Printing the plan's Return model ships in 0.8.0.",
	description:
		"Builds the Return model `projection chance --return-model plan` draws its Market paths from (cli ADR-0068): every asset Account with a `volatility` above 0 moves with one shared market factor around its own `rate`, and every other Account keeps its rate. The result is the model itself, in the sim format, so `--json > model.json` saves it and `projection chance --return-model model.json` gives the same chance as `--return-model plan`. It reads no Ledger and takes no date.",
	positionals: [],
	input: z.strictObject({
		scenario: scenarioFlag,
		buckets: z
			.number()
			.int()
			.optional()
			.describe(
				`The buckets the model is built in, a power of two from 16 to 1024. The default is ${DEFAULT_BUCKETS}.`,
			),
		set: setFlag,
		without: withoutFlag,
		add: addFlag,
		decimal: decimalFlag,
	}),
	output: returnModelDocument,
	examples: [
		{
			command: "traj projection model --scenario volatile --json",
			description:
				"The Return model the plan implies, as JSON: save it to a file and pass it to `projection chance --return-model`.",
		},
		{
			command: "traj projection model --scenario volatile --buckets 64 --json",
			description: "The same model in 64 buckets, smaller to print.",
		},
	],
	errorCodes: ["invalid_input", "not_found"],
	run: (input, ctx) =>
		decimalProblem(input) ??
		withStore(ctx, (store) => {
			const row = store.getScenario(input.scenario)
			if (isAppError(row)) return row
			if (row === null) return scenarioNotFound(input.scenario, "scenario")
			const applied = applyScenarioSets(
				JSON.parse(row.document) as ScenarioDocument,
				input.set ?? [],
				{
					without: input.without,
					add: input.add,
					decimal: input.decimal,
				},
			)
			if (isAppError(applied)) return applied
			const built = planModelOf(
				applied.document as unknown as Scenario,
				input.buckets ?? DEFAULT_BUCKETS,
				{
					path: "scenario",
					label: "projection model",
					hintSuffix: "",
				},
			)
			return isAppError(built) ? (built satisfies AppError) : ok(built.model)
		}),
})
