import type { ProjectionProblem } from "@trajectonomics/core/sim"
import { version as cliVersion } from "../../package.json"
import type { AppError } from "../errors"
import { fail } from "../errors"
import { refusalOf } from "../scenario/document"
import { REFUSALS, sentenceFor } from "./refusal-table"

/**
 * The engine's package and the exact version this build runs on (ADR-0030). The engine
 * (`packages/core`) is not published on its own: it ships bundled inside this CLI, so the
 * installable package that pins it is `@trajectonomics/cli` at the CLI's own version.
 */
export const SIM_PACKAGE = "@trajectonomics/cli"

/** The engine version: the version of the CLI that bundles it. */
export const SIM_VERSION: string = cliVersion

/** One engine problem as the envelope's detail row: the core's code, path, date and account. */
type ProblemDetail = { code: string; path?: string; date?: string; account?: string }

/** The engine's own path, dot-separated the way the envelope spells one. */
export function problemPath(problem: ProjectionProblem): string | undefined {
	if (!("path" in problem)) return undefined
	return problem.path.join(".")
}

function detailOf(problem: ProjectionProblem): ProblemDetail {
	const detail: ProblemDetail = { code: problem.code }
	const path = problemPath(problem)
	if (path !== undefined) detail.path = path
	if ("date" in problem) detail.date = problem.date
	if ("account" in problem && problem.account !== undefined) detail.account = problem.account
	return detail
}

/** A Timeline the engine refuses is the caller's flag, not a refused document (ADR-0030). */
function timelineFailure(problems: readonly ProjectionProblem[]): AppError | null {
	const timeline = problems.find((problem) => "path" in problem && problem.path[0] === "timeline")
	if (timeline === undefined || !("path" in timeline)) return null
	const last = timeline.path.at(-1)
	if (last === "start" || last === "horizon") {
		const flag = last === "start" ? "as-of" : "horizon"
		return fail("invalid_input", {
			path: last === "start" ? "asOf" : "horizon",
			message: `--${flag}: ${timeline.code}`,
			hint: "The Timeline starts at --as-of and ends at --horizon.",
			// Every problem the engine reported, in its order, so a sibling problem is not lost.
			details: problems.map(detailOf),
		})
	}
	return fail("invalid_input", {
		path: `timeline.${String(last ?? "")}`,
		message: `timeline: ${timeline.code}`,
		hint: "The CLI builds the Timeline from --as-of and --horizon.",
		details: problems.map(detailOf),
	})
}

/** The sentence for any refusal the CLI cannot narrow to one cause (ADR-0030). */
const AGREE_HINT =
	"The Baseline, the Scenario and the Timeline must agree; details lists every problem."

/**
 * The words for one problem: the table's sentence, or for a code the document check answers (a
 * Scenario stored before a newer rule and run without `--set` is not re-checked) the document's own
 * sentence with the allowed values (ADR-0052).
 */
function wordsFor(problem: ProjectionProblem): { message: string; hint?: string } | undefined {
	const table = sentenceFor(problem)
	if (table !== undefined) return table
	const entry = REFUSALS[problem.code]
	if (entry === undefined || !("elsewhere" in entry) || entry.elsewhere !== "document")
		return undefined
	if (!("path" in problem) || problem.path[0] !== "scenario") return undefined
	const { message, hint } = refusalOf(
		{ code: problem.code, segments: problem.path.slice(1) },
		"document",
	)
	return { message, hint }
}

/**
 * What the engine refuses becomes `projection_refused` at exit 3, with the engine's codes and
 * paths in `details` in its own order and the first at `path` (ADR-0013, ADR-0030).
 */
export function refusal(problems: readonly ProjectionProblem[]): AppError {
	const timeline = timelineFailure(problems)
	if (timeline !== null) return timeline
	// The first problem with words says what went wrong, and `path` is where that one is.
	const found = problems.map((problem) => ({ problem, said: wordsFor(problem) }))
	const chosen = found.find((entry) => entry.said !== undefined) ?? found[0]
	const path = chosen === undefined ? undefined : problemPath(chosen.problem)
	const said = chosen?.said
	return fail("projection_refused", {
		...(path === undefined ? {} : { path }),
		...(said === undefined ? {} : { message: said.message }),
		details: problems.map(detailOf),
		hint: said?.hint ?? AGREE_HINT,
	})
}
