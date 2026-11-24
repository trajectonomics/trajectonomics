import type { ProjectionProblem } from "@trajectonomics/core/sim"
import { type AppError, fail } from "../errors"
import { refusal } from "./engine"

/** The engine's own input paths, named as the caller spells them (ADR-0013). */
const INPUT_ROOTS: ReadonlySet<string> = new Set(["options", "selection", "model"])

/** The sentence for an input the engine refuses, by its code. */
const MESSAGES: Readonly<Record<string, string>> = {
	INVALID_PATH_COUNT: "The path count must be a whole number from 1 to 10,000.",
	INVALID_SEED: "The seed must be exactly 16 lower-case hex digits.",
	INVALID_BUCKETS: "The bucket count must be a power of two from 16 to 1024.",
	INVALID_PATH_INDEX: "The path index must be a whole number below the path count.",
	UNKNOWN_ACCOUNT: "The Return model names an Account the Scenario does not declare.",
}

/** The flag each engine option is stated by, so a refusal names the spelling the caller typed. */
const OPTION_FLAGS: Readonly<Record<string, string>> = {
	paths: "--paths",
	seed: "--seed",
	buckets: "--buckets",
	index: "--index",
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
	const message = MESSAGES[first.code] ?? `The engine refused this input (${first.code}).`
	return fail("invalid_input", {
		path: inputPathOf(first.path),
		message,
		hint:
			first.code === "INVALID_PATH_INDEX" && paths !== undefined
				? `--index counts the run's paths from 0: with --paths ${paths} it is 0..${paths - 1}.`
				: "details lists every problem; the Return model's shape is in traj schema projection chance.",
		details: problems.map((problem) =>
			"path" in problem
				? { code: problem.code, path: inputPathOf(problem.path) }
				: { code: problem.code },
		),
	})
}
