import { isAppError } from "../errors"
import { toDecimalForm } from "./decimal"
import { acceptedScenarioSchemaVersion } from "./document"
import { FULL_ESTATE } from "./shape/estate-fixture"
import { scenarioExample } from "./shape/example"

/*
 * The documents the decimal form's tests share (cli ADR-0047, ADR-0063): the worked example with
 * every money field and every rule rate carrying a value, and the helpers that read it back.
 */

export type Doc = Record<string, unknown>

export function isDoc(value: unknown): value is Doc {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * The worked example, with a capped surplus step and a level loan, so every money field carries a
 * value. The loan account gains its compounding period, which a level contribution needs.
 */
export function worked(): Doc {
	const version = acceptedScenarioSchemaVersion()
	if (version === undefined) throw new Error("the pinned sim-core accepts no version")
	const example = scenarioExample(version)
	const cashflow = example["cashflow"] as Doc
	const accounts = (example["accounts"] as Doc[]).map((account) =>
		account["id"] === "loan" ? { ...account, compounding: "monthly" } : account,
	)
	const levelLoan: Doc = {
		id: "car-loan",
		kind: "contribution",
		target: "loan",
		frequency: "monthly",
		start: "2026-01-31",
		level: { principal: 123_456, payments: 12, rounding: "halfUp" },
	}
	// The example's own rule is a guardrails one; this `currentRate` one carries the steps and bounds.
	const bounded: Doc = {
		id: "bounded-spending",
		kind: "expense",
		frequency: "monthly",
		start: "2026-01-01",
		rule: {
			kind: "currentRate",
			portfolio: ["cash", "index"],
			rateBps: 450,
			rounding: "halfUp",
			steps: [
				{ from: "2040-01-01", bps: 500 },
				{ from: "2050-01-01", bps: 625 },
			],
			floor: { amount: 120_000, growth: "inflation" },
			ceiling: { amount: 9_000_050, growth: { bps: 0 } },
		},
	}
	// A transfer's amount is a Flow's own: the decimal form converts it as any other.
	const roll: Doc = {
		id: "roll",
		kind: "transfer",
		source: "index",
		target: "pension",
		frequency: "monthly",
		start: "2026-02-01",
		amount: 123_457,
		growth: { bps: 0 },
	}
	return {
		...example,
		accounts,
		flows: [...(example["flows"] as Doc[]), levelLoan, bounded, roll],
		// Every routing form, so each money field of a step and an entry carries a value (cli ADR-0070).
		cashflow: {
			...cashflow,
			surplus: [
				{ account: "cash", upTo: 250_000 },
				{ account: "index", share: 3_000, upTo: { amount: 1_000_050, growth: "inflation" } },
				{ account: "home" },
			],
			withdraw: [
				{ account: "cash", downTo: 50_025 },
				{ account: "index", downTo: { amount: 120_075, growth: { bps: 100 } } },
				"cash",
			],
		},
		estate: FULL_ESTATE,
	}
}

/** The worked example with its first Flow's amount replaced: the only field these cases vary. */
export function withAmount(base: Doc, amount: unknown): Doc {
	const flows = base["flows"] as Doc[]
	return { ...base, flows: [{ ...flows[0], amount }, ...flows.slice(1)] }
}

export function decimalOk(doc: Doc): Doc {
	const decimal = toDecimalForm(doc)
	if (isAppError(decimal)) throw new Error(decimal.body.message)
	return decimal
}
