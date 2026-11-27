import { growthYears } from "../calendar/arith"
import type { Path } from "../check/codes"
import { isSafeInteger } from "../engine/overflow"
import { type Inflation, inflateBy } from "../money/inflation"
import type { ConstMeasure, DateString, Derive, DeriveMeasure } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { mulValue } from "./mul"
import { dependencyOrder } from "./order"
import { scaleValue } from "./scale"
import { constantValue } from "./step"

export type DeriveOutcome =
	| { readonly ok: true; readonly amount: bigint }
	| { readonly ok: false; readonly problem: ProjectionProblem }

export interface DeriveContext {
	readonly date: DateString
	readonly inflation: Inflation
	/** Path of the Flow's `derive`, reported on a negative result. */
	readonly path: Path
	/** The planned gross amount a Flow lands on this date, before Prepayment and any cap. */
	readonly read: (flowId: string) => bigint
	/** An Account's value on this date, read before the date's Flows land. */
	readonly readAccount: (accountId: string) => bigint
}

function lesser(a: bigint, b: bigint): bigint {
	if (a < b) return a
	return b
}

function greater(a: bigint, b: bigint): bigint {
	if (a > b) return a
	return b
}

function binary(measure: DeriveMeasure, get: (id: string) => bigint): bigint | undefined {
	const op = measure.op
	if (op === "add") return get(measure.a) + get(measure.b)
	if (op === "sub") return get(measure.a) - get(measure.b)
	if (op === "min") return lesser(get(measure.a), get(measure.b))
	if (op === "max") return greater(get(measure.a), get(measure.b))
	return undefined
}

/** A constant: a dated step or no growth reads as a Levy constant; growth follows the run's inflation. */
function constantOf(measure: ConstMeasure, context: DeriveContext): bigint {
	const { value, asOf, growth, steps } = measure
	if (steps !== undefined || growth === undefined || asOf === undefined) {
		return constantValue(measure, { date: context.date, inflation: 0 })
	}
	const rate: Inflation = growth === "inflation" ? context.inflation : growth.bps
	const grown = inflateBy(
		BigInt(Math.abs(value)),
		rate,
		growthYears(asOf, context.date),
		context.date,
	)
	return value < 0 ? -grown : grown
}

/** One Derived-amount Measure; a `flow` read and an operand read are both checked for overflow. */
function measureValue(
	measure: DeriveMeasure,
	get: (id: string) => bigint,
	context: DeriveContext,
): bigint {
	const held = binary(measure, get)
	if (held !== undefined) return held
	switch (measure.op) {
		case "const":
			return constantOf(measure, context)
		case "scale":
			return scaleValue(get(measure.of), BigInt(measure.num), BigInt(measure.den), measure.rounding)
		case "mul":
			return mulValue(get(measure.a), get(measure.b), BigInt(measure.den), measure.rounding)
		case "pick":
			return get(measure.a) > get(measure.b) ? get(measure.then) : get(measure.else)
		case "flow":
			return context.read(measure.flow)
		case "account":
			return context.readAccount(measure.account)
		default:
			// `tally` in a Derived amount: `check()` rejects it, so this is unreachable.
			return 0n
	}
}

/**
 * Evaluates a Derived amount in exact BigInt arithmetic. `derive` must have passed `check()`.
 * A value that is not a safe integer yields `VALUE_OVERFLOW` at `context.date`; a negative
 * result yields `NEGATIVE_AMOUNT` at the Flow's `derive` path, dated.
 */
export function evaluateDerive(derive: Derive, context: DeriveContext): DeriveOutcome {
	const exact = new Map<string, bigint>()
	const get = (id: string): bigint => {
		const value = exact.get(id)
		if (value === undefined) throw new RangeError(`Measure ${id} is not evaluated before use`)
		return value
	}
	const order = dependencyOrder(derive.measures)
	for (let index = 0; index < order.length; index++) {
		const measure = order[index]
		if (measure === undefined) continue
		const value = measureValue(measure, get, context)
		if (!isSafeInteger(value)) {
			return { ok: false, problem: { code: "VALUE_OVERFLOW", date: context.date } }
		}
		exact.set(measure.id, value)
	}
	const amount = get(derive.result)
	if (amount < 0n) {
		return {
			ok: false,
			problem: { code: "NEGATIVE_AMOUNT", path: context.path, date: context.date },
		}
	}
	return { ok: true, amount }
}
