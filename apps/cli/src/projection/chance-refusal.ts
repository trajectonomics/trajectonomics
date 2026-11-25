import type { ProjectionProblem } from "@trajectonomics/core/sim"
import { type AppError, fail } from "../errors"
import { refusal } from "./engine"

/** The engine's own input paths, named as the caller spells them (ADR-0013). */
const INPUT_ROOTS: ReadonlySet<string> = new Set(["options", "selection", "model"])

/** The flag each engine option is stated by, so a refusal names the spelling the caller typed. */
const OPTION_FLAGS: Readonly<Record<string, string>> = {
	paths: "--paths",
	seed: "--seed",
	index: "--index",
}

/** The sentence for an input the engine refuses, by its code, where the code alone says what is wrong. */
const MESSAGES: Readonly<Record<string, string>> = {
	INVALID_PATH_COUNT: "The path count must be a whole number from 1 to 10,000.",
	INVALID_SEED: "The seed must be exactly 16 lower-case hex digits.",
	INVALID_BUCKETS: "The bucket count must be a power of two from 16 to 1024.",
	INVALID_PATH_INDEX: "The path index must be a whole number below the path count.",
	UNKNOWN_ACCOUNT: "The Return model names an Account the Scenario does not declare.",
	RETURN_WEIGHT_TOTAL:
		"The bucket weights of the Return model must add up to 4294967296 (2^32), the whole of the probability.",
	DUPLICATE_ID: "The Return model names the same Account more than once.",
	RATE_OUT_OF_RANGE:
		"A return in the Return model must be from -9999 to 10000 basis points: 100 is 1% over the month.",
	INVALID_WEIGHT:
		"A bucket weight in the Return model must be a whole number from 0 to 4294967296 (2^32).",
}

/** The fields of the Return model a problem is about, from the engine's path (`model`, ...). */
function modelField(problem: ProjectionProblem): readonly (string | number)[] {
	return "path" in problem && problem.path[0] === "model" ? problem.path.slice(1) : []
}

/** The sentence for one refused input: the code's own, or what a code that means two things means here. */
function messageOf(problem: ProjectionProblem): string {
	const field = modelField(problem)
	if (problem.code === "WRONG_TYPE" && field[0] === "buckets" && field[2] === "returnsBps") {
		return "Each bucket of the Return model needs one return per Account, in the order of accounts: this bucket's returnsBps is not as long as accounts."
	}
	if (problem.code === "TOO_MANY_ENTRIES" && field[0] === "accounts") {
		return "The Return model names more than 64 Accounts."
	}
	if (problem.code === "TOO_MANY_ENTRIES" && field[0] === "buckets") {
		return "The Return model has more than 1,024 buckets."
	}
	return MESSAGES[problem.code] ?? `The engine refused this input (${problem.code}).`
}

/** What to do about `flag`, for a problem in the option it states. */
const FLAG_HINTS: Readonly<Record<string, string>> = {
	"--paths": "Give --paths a whole number from 1 to 10,000.",
	"--seed": "Give --seed sixteen lower-case hex digits, such as 0123456789abcdef.",
}

/** The hint after a Return-model problem: the Return model's shape is published, so it is not guessed. */
const MODEL_HINT =
	"details lists every problem; the Return model's shape is in traj schema projection chance."

/**
 * The hint by which input failed: a bad `--paths` or `--seed` says what that flag takes,
 * `--index` its range, and only a problem in the Return model points at the model's shape.
 */
function hintOf(problem: ProjectionProblem, inputPath: string, paths?: number): string {
	if (problem.code === "INVALID_PATH_INDEX" && paths !== undefined) {
		return `--index counts the run's paths from 0: with --paths ${paths} it is 0..${paths - 1}.`
	}
	return FLAG_HINTS[inputPath] ?? MODEL_HINT
}

/**
 * An engine path as the caller's input names it. `options.paths` is the `--paths` flag; the model
 * is the `--return-model` document, so its paths sit under `document`.
 */
function inputPathOf(path: readonly (string | number)[]): string {
	const [root, ...rest] = path
	if (root === "options" || root === "selection") return OPTION_FLAGS[String(rest[0])] ?? "options"
	return ["document", ...rest.map(String)].join(".")
}

/**
 * A refusal of the caller's own input (the path count, the seed or the Return model) is
 * `invalid_input` at that input. Anything else the engine refuses is the Projection's refusal.
 */
export function chanceRefusal(problems: readonly ProjectionProblem[], paths?: number): AppError {
	const first = problems[0]
	if (first === undefined || !("path" in first) || !INPUT_ROOTS.has(String(first.path[0]))) {
		return refusal(problems)
	}
	const path = inputPathOf(first.path)
	return fail("invalid_input", {
		path,
		message: messageOf(first),
		hint: hintOf(first, path, paths),
		details: problems.map((problem) =>
			"path" in problem
				? { code: problem.code, path: inputPathOf(problem.path) }
				: { code: problem.code },
		),
	})
}
