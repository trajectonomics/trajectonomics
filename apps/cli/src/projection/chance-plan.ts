import { planReturnModel, type ReturnModel, type Scenario } from "@trajectonomics/core/sim"
import { z } from "zod"
import { type AppError, fail, isAppError } from "../errors"
import { readReturnModel } from "./chance-model"
import type { PlanModelView } from "./chance-plan-view"

/*
 * `--return-model plan` builds the Return model from the Scenario's own Accounts: each asset's
 * `rate` and `volatility` (sim ADR 0029, cli ADR-0068). The CLI adds no figure of its own: the engine
 * builds the model, and this says which Accounts went in and refuses a plan that gives it nothing to build.
 */

/** The reserved word that stands where a file path or `-` stands. */
export const PLAN_RETURN_MODEL = "plan"

/** The bucket count of a plan model when `--buckets` is not given. */
export const DEFAULT_BUCKETS = 256

/** A model built from the plan, the view that echoes its inputs and what the engine clamped. */
export type PlanModel = { model: ReturnModel; view: PlanModelView; notes: string[] }

/** The sizes the engine takes, in the words a refusal prints. */
const BUCKET_SIZES = "16, 32, 64, 128, 256, 512 or 1024"

/** The way out of a plan with no volatility: the field, and the command that writes a document. */
const NO_VOLATILITY_HINT =
	"Give an asset Account a `volatility` in basis points (the standard deviation of its yearly return, so 15% is 1500): write it into the Scenario with traj scenario apply (traj scenario apply --template prints a document to start from), or test it as a what-if with --set accounts.<id>.volatility=1500. Or give projection chance a Return model file with --return-model."

/**
 * The Return model the plan implies at `buckets`, or the refusal: a bucket count the engine does not
 * take, or a plan with no asset Account that has a `volatility` above 0, where every Market path would
 * be the same path. `by` names the flag the refusal points at.
 */
export function planModelOf(
	scenario: Scenario,
	buckets: number,
	by: { path: string; label: string } = { path: "--return-model", label: "--return-model plan" },
): PlanModel | AppError {
	const built = planReturnModel(scenario, { buckets })
	if (!built.ok) {
		return fail("invalid_input", {
			path: "--buckets",
			message: `--buckets: the bucket count must be a power of two from 16 to 1024: ${BUCKET_SIZES}.`,
			hint: `Leave --buckets out for ${DEFAULT_BUCKETS}.`,
			details: built.problems.map((problem) => ({ code: problem.code, path: "--buckets" })),
		})
	}
	if (built.model.accounts.length === 0) {
		return fail("invalid_input", {
			path: by.path,
			message: `${by.label}: no Account of the Scenario has a volatility, so every Market path would be the same path.`,
			hint: NO_VOLATILITY_HINT,
		})
	}
	const accounts = built.model.accounts.flatMap((id) => {
		const account = scenario.accounts.find((entry) => entry.id === id)
		return account?.kind === "asset" && account.volatility !== undefined
			? [{ id, rate: account.rate, volatility: account.volatility }]
			: []
	})
	const notes = built.notes.map(
		(note) =>
			`The plan's Return model clamped ${note.clamped} of its ${buckets} buckets of the Account "${note.account}" to the range a Return model states, from -9999 to 10000 basis points a month.`,
	)
	return { model: built.model, view: { source: "plan", buckets, accounts }, notes }
}

/** `--return-model`: a file, `-`, or the reserved word `plan`. */
export const returnModelFlag: z.ZodString = z
	.string()
	.describe(
		"The Return model JSON file the Market paths draw from, in the sim format, or `-` for standard input, or the word `plan`: build the model from the Scenario's own Accounts, each asset's `rate` and `volatility` (a file named plan is written ./plan). `traj projection model` prints what `plan` builds.",
	)

/** `--buckets`: the size of a plan model. */
export const bucketsFlag: z.ZodOptional<z.ZodNumber> = z
	.number()
	.int()
	.optional()
	.describe(
		`Only with --return-model plan: the buckets the model is built in, a power of two from 16 to 1024. The default is ${DEFAULT_BUCKETS}.`,
	)

/** Where the Market paths' model comes from: a file the caller states, or the plan's own Accounts. */
export type ModelSource = { kind: "file"; model: ReturnModel } | { kind: "plan"; buckets: number }

/** Reads `--return-model` and `--buckets` before the Store opens: a file is read now, `plan` is built later. */
export async function modelSourceOf(
	input: { returnModel: string; buckets?: number | undefined },
	stdin: () => Promise<string>,
): Promise<ModelSource | AppError> {
	if (input.returnModel === PLAN_RETURN_MODEL) {
		return { kind: "plan", buckets: input.buckets ?? DEFAULT_BUCKETS }
	}
	if (input.buckets !== undefined) {
		return fail("invalid_input", {
			path: "--buckets",
			message: "--buckets: only --return-model plan builds a model, so a file has no bucket count.",
			hint: "Pass --return-model plan, or leave --buckets out.",
		})
	}
	const model = await readReturnModel(input.returnModel, stdin)
	return isAppError(model) ? model : { kind: "file", model }
}
