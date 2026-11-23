import type { ErrorCode, ProjectionProblem } from "@trajectonomics/core/sim"
import type { Said } from "./refusal-said"

/**
 * The sentence for a rate outside the range its field allows (`RATE_OUT_OF_RANGE`). One code covers
 * every rate and share in the document, each with its own range, so the sentence is chosen by the path
 * the engine blames and says which field it is and what it accepts. The document check alone finds it,
 * so `scenario apply`, the Store and `--set` state it too (scenarioDocumentError), as well as
 * `projection run` on a stored row (cli ADR-0065). A path with no entry here (a threshold or a span
 * return the CLI builds from a flag) gets the general sentence.
 */

type Segments = readonly string[]

/** A rate's unit, repeated in every hint: the document states rates in basis points, never as a fraction. */
const UNIT = "Write it in basis points, a whole number: 2% is 200 and 100% is 10000."

type Entry = { message: string; hint: string }

const GROWTH: Entry = {
	message:
		"A growth rate must be above -100% a year, so the amount is never taken to zero or below, and this one is not.",
	hint: 'Write growth as {"bps": <integer>} of -9999 or more (-99.99%); {"bps": 0} is a fixed amount, and "inflation" follows inflation.',
}

const INFLATION: Entry = {
	message: "The inflation rate must be above -100% a year, and this one is not.",
	hint: "Write inflation in basis points of -9999 or more: 2% is 200.",
}

const ACCOUNT_RATE: Entry = {
	message:
		"An Account's rate is below what its kind allows: a rate with a compounding period is nominal and cannot be negative, and an effective annual rate must be above -100%.",
	hint: `${UNIT} A negative rate is only for an Account with no "compounding", and no lower than -9999.`,
}

const SHARE_HINT = `${UNIT} Under --decimal a share is a percent from "0" to "100", with at most two decimal places.`

const COST: Entry = {
	message:
		"The share of an estate cost must be from 0% to 100% of what it is taken from, and this one is not.",
	hint: SHARE_HINT,
}

const GIFT: Entry = {
	message:
		"The share of an estate gift must be from 0% to 100% of the net estate, and this one is not.",
	hint: SHARE_HINT,
}

const RULE_RATE: Entry = {
	message:
		"A spending rule's rate must be from 0.01% to 100% of its portfolio a year (1 to 10000 basis points), and this one is not.",
	hint: `${UNIT} A rule that pays nothing is a Flow with an amount of 0.`,
}

const RULE_BAND: Entry = {
	message:
		"A guardrail's band must be from 0% to 100%, in its trigger and in its adjustment, and this one is not.",
	hint: `${UNIT} A band of 0 never triggers.`,
}

const PREPAYMENTS: Entry = {
	message:
		"The Levy prepayments of an income Flow ask for more than 100% of its gross, or one share is outside 0% to 100%.",
	hint: `${UNIT} Lower the shares so that the plain prepayments and the capped one add up to 10000 or less.`,
}

const GENERAL: Entry = {
	message: "A rate or share is outside the range its field allows.",
	hint: `${UNIT} A share runs from 0 to 10000, and a rate that is not a share is above -10000.`,
}

/** The path segments after `scenario`, as strings, or an empty list for a problem without one. */
function segmentsOf(problem: ProjectionProblem): Segments {
	if (!("path" in problem) || problem.path[0] !== "scenario") return []
	return problem.path.slice(1).map(String)
}

function estateEntry(segments: Segments): Entry {
	if (segments.includes("growth")) return GROWTH
	return segments[1] === "gifts" ? GIFT : COST
}

function ruleEntry(segments: Segments): Entry {
	if (segments.includes("growth")) return GROWTH
	return segments.includes("upper") || segments.includes("lower") ? RULE_BAND : RULE_RATE
}

function flowEntry(segments: Segments): Entry {
	const field = segments[2]
	if (field === "rule") return ruleEntry(segments)
	if (field === "prepayments" || field === "cappedPrepayment") return PREPAYMENTS
	return segments.includes("growth") ? GROWTH : GENERAL
}

/** The entry for the field a `RATE_OUT_OF_RANGE` blames, by where it sits in the Scenario. */
export function rateEntry(problem: ProjectionProblem): Entry {
	const segments = segmentsOf(problem)
	switch (segments[0]) {
		case "estate":
			return estateEntry(segments)
		case "flows":
			return flowEntry(segments)
		case "accounts":
			return segments[2] === "rate" ? ACCOUNT_RATE : GENERAL
		case "economy":
			return INFLATION
		default:
			return GENERAL
	}
}

export const SAID_RATE: Readonly<Partial<Record<ErrorCode, Said>>> = {
	RATE_OUT_OF_RANGE: {
		message: (problem) => rateEntry(problem).message,
		hint: (problem) => rateEntry(problem).hint,
	},
}
