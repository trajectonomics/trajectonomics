import type { ProjectionProblem, SettlementPeriod } from "@trajectonomics/core/sim"
import { type AppError, fail } from "../errors"
import { type AllowanceRequest, MAX_STEPS } from "./allowances-input"
import { refusal } from "./engine"

/** The flag each engine option is stated by, so a refusal names the spelling the caller typed. */
const OPTION_FLAGS: Readonly<Record<string, { path: string; flag: string }>> = {
	labels: { path: "labels", flag: "--labels" },
	step: { path: "step", flag: "--step" },
	grain: { path: "step", flag: "--step" },
	budget: { path: "budget", flag: "--budget" },
	minSavingBps: { path: "minSaving", flag: "--min-saving" },
}

/** The first label no Levy reads, as a refusal that lists the labels the Levies do read. */
export function unreadLabels(
	read: readonly (readonly string[])[],
	labels: readonly string[],
): AppError | undefined {
	const known = [...new Set(read.flat())]
	const unread = labels.find((label) => !known.includes(label))
	if (unread === undefined) return undefined
	return fail("invalid_input", {
		path: "labels",
		message: `--labels: "${unread}" is not a contribution label the Scenario's Levy reads.`,
		hint:
			known.length === 0
				? 'The Scenario\'s Levy reads no contribution label. Run "traj scenario tax <name> --tax th-2026 --label <flow>=<label>" to charge a Levy that does.'
				: `The Levy reads: ${known.join(", ")}.`,
		details: { label: unread, allowed: known },
	})
}

/** Where the engine's refusal happened, so a sentence can name the year and what was asked. */
type Where = {
	levy: string
	period: Pick<SettlementPeriod, "from" | "to">
	request: AllowanceRequest
}

/**
 * What `contributionSavings` refuses, as the caller's input where a person can cause it and as an
 * internal error where only a wrong call can (cli ADR-0061). A refusal of the engine's arithmetic
 * (an overflow, an unsafe tally) is the Projection's own.
 */
export function allowancesRefusal(problem: ProjectionProblem, where: Where): AppError {
	const year = `${where.period.from} to ${where.period.to}`
	if (problem.code === "TOO_MANY_STEPS") {
		return fail("invalid_input", {
			path: "step",
			message: `--step: the tax year ${year} of Levy "${where.levy}" needs more than ${MAX_STEPS} steps to fill the allowances.`,
			hint: `Raise --step so each year needs at most ${MAX_STEPS} steps over every label: a larger step reads the same caps in fewer, coarser steps.`,
			details: {
				code: problem.code,
				levy: where.levy,
				from: where.period.from,
				maxSteps: MAX_STEPS,
			},
		})
	}
	if (problem.code === "UNKNOWN_FUNDED_LABEL") {
		return fail("invalid_input", {
			path: "labels",
			message: `--labels: a label is not one the Levy "${where.levy}" reads.`,
			hint: "Name only labels the Scenario's Levy reads as contributions.",
			details: { code: problem.code, levy: where.levy },
		})
	}
	if (problem.code === "INVALID_OPTION") {
		const key = "path" in problem ? String(problem.path[0]) : ""
		const option = OPTION_FLAGS[key]
		return fail("invalid_input", {
			path: option?.path ?? "labels",
			message: `${option?.flag ?? "The flags"}: the engine did not accept this value; --labels, --step, --budget and --min-saving must be a list of labels, an amount larger than one unit, an amount of zero or more, and a percent from 0 to 100.`,
			hint: "Check --labels, --step, --budget and --min-saving against traj schema projection allowances.",
			details: {
				code: problem.code,
				...("path" in problem ? { path: problem.path.join(".") } : {}),
			},
		})
	}
	if (problem.code === "PERIOD_DUE_MISMATCH") {
		return fail("internal", {
			message: `The Levy "${where.levy}" did not reproduce the tax its own period ${year} reported.`,
			details: { code: problem.code, levy: where.levy, from: where.period.from },
		})
	}
	return refusal([problem])
}
