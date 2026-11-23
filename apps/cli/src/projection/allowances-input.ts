import { type AppError, fail, isAppError } from "../errors"
import { formatMinorUnits, parseMinorUnits } from "../store"
import { labelsOf } from "./allowances-labels"

/**
 * The most steps one tax year may take over every label (cli ADR-0061). The engine counts a step
 * before it knows whether the step is dropped for going past a cap, so a year whose answer is
 * more than this many steps is refused, and the refusal tells the caller to raise `--step`.
 */
export const MAX_STEPS = 2000

/** What the caller asked `projection allowances` for, in the engine's own units. */
export type AllowanceRequest = {
	labels: string[]
	/** One step, in minor units: the caller's, with no default. */
	step: number
	/** One major unit in minor units: the engine's grain, which a step must be larger than. */
	grain: number
	budget?: number
	minSavingBps?: number
}

/** The four flags as the parser hands them over: text, so the CLI converts each one exactly. */
export type AllowanceFlags = {
	labels: string
	step: string
	budget?: string | undefined
	minSaving?: string | undefined
}

/** `--min-saving` is a percent with at most two decimals: 5 is 500 basis points, 12.5 is 1250. */
const PERCENT = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,2}))?$/

/** A percent as basis points, by string handling: the digits of the whole part, then two of the fraction. */
function basisPointsOf(text: string): number | AppError {
	const match = PERCENT.exec(text)
	if (match === null) {
		return fail("invalid_input", {
			path: "minSaving",
			message: `--min-saving: "${text}" is not a percent with at most two decimals, such as 5 or 12.5.`,
			hint: "Give the least share of a step a step must save, as a percent from 0 to 100.",
		})
	}
	const [, whole = "0", fraction = ""] = match
	const bps = Number(`${whole}${fraction.padEnd(2, "0")}`)
	if (bps > 10_000) {
		return fail("invalid_input", {
			path: "minSaving",
			message: `--min-saving: ${text} is more than 100 percent, and no step saves more than itself.`,
			hint: "Give a percent from 0 to 100.",
		})
	}
	return bps
}

/** An amount flag the CLI cannot read, in the leaf's own sentence and with a hint (cli ADR-0061). */
function unreadable(flag: string, path: string, text: string, error: AppError): AppError {
	const places = error.body.code === "INVALID_AMOUNT"
	return fail("invalid_input", {
		path,
		message: `${flag}: "${text}" is not an amount in major units${places ? " with no more decimal places than the Currency has" : ""}.`,
		hint: "Give a plain decimal in major units, such as 1000 or 1000.50, with no thousands separator.",
	})
}

/** The step, which must be larger than one major unit: the engine's grain cannot tell a cap's end from a flat step otherwise. */
function stepOf(text: string, currency: string, grain: number): number | AppError {
	const step = parseMinorUnits(text, currency, "step")
	if (isAppError(step)) return unreadable("--step", "step", text, step)
	if (step <= grain) {
		return fail("invalid_input", {
			path: "step",
			message: `--step: ${text} is not larger than one major unit (${formatMinorUnits(grain, currency)} ${currency}).`,
			hint: "A step of one unit or less cannot tell where an allowance's cap ends. Give a larger amount in major units, such as 1000.",
		})
	}
	return step
}

function budgetOf(text: string, currency: string): number | AppError {
	const budget = parseMinorUnits(text, currency, "budget")
	if (isAppError(budget)) return unreadable("--budget", "budget", text, budget)
	if (budget < 0) {
		return fail("invalid_input", {
			path: "budget",
			message: `--budget: ${text} is below zero.`,
			hint: "Give the most the extra contributions may add up to in a tax year, in major units.",
		})
	}
	return budget
}

/**
 * The caller's flags as the engine's options, before the store opens (ADR-0029). Every amount is
 * converted from its decimal string by the CLI's exact pair, never through a float (cli ADR-0047).
 */
export function requestOf(flags: AllowanceFlags, currency: string): AllowanceRequest | AppError {
	const labels = labelsOf(flags.labels)
	if (isAppError(labels)) return labels
	const grain = parseMinorUnits("1", currency, "step")
	if (isAppError(grain)) return grain
	const step = stepOf(flags.step, currency, grain)
	if (isAppError(step)) return step
	const request: AllowanceRequest = { labels, step, grain }
	if (flags.budget !== undefined) {
		const budget = budgetOf(flags.budget, currency)
		if (isAppError(budget)) return budget
		request.budget = budget
	}
	if (flags.minSaving !== undefined) {
		const bps = basisPointsOf(flags.minSaving)
		if (isAppError(bps)) return bps
		request.minSavingBps = bps
	}
	return request
}
