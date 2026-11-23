import { isLevelInput, levelPayment, MAX_LEVEL_PAYMENTS, PERIODS_PER_YEAR } from "../loan/level"
import type { CompoundingPeriod, Frequency, Rounding } from "../types"
import { ROUNDINGS } from "../vocab"
import type { Emit, Path } from "./codes"
import type { LoanIndex } from "./loan-index"
import { amount, boundedInt, oneOf } from "./scalars"
import { checkShape, type Field, opt, req } from "./shape"

/** A `level` key is validated with its Flow, once the target and frequency are known. */
export const levelField: Field = opt(() => {})

const paymentCount = boundedInt(1, MAX_LEVEL_PAYMENTS, "LEVEL_PAYMENTS_OUT_OF_RANGE")

const LEVEL_SHAPE = {
	principal: req(amount),
	payments: req(paymentCount),
	rounding: req(oneOf(ROUNDINGS, "INVALID_ROUNDING")),
}

/** The Flow frequency that pays one Compounding period; `semiannual` has none. */
const FREQUENCY_OF: Partial<Record<CompoundingPeriod, Frequency>> = {
	monthly: "monthly",
	quarterly: "quarterly",
	annual: "annual",
}

function isRounding(value: unknown): value is Rounding {
	return typeof value === "string" && ROUNDINGS.some((rounding) => rounding === value)
}

function isPeriod(value: unknown): value is CompoundingPeriod {
	return typeof value === "string" && Object.hasOwn(PERIODS_PER_YEAR, value)
}

/** The rate and compounding of a liability target, or `undefined` after reporting why not. */
function nominalTarget(
	path: Path,
	target: unknown,
	index: LoanIndex,
	emit: Emit,
): { readonly rate: unknown; readonly period: CompoundingPeriod } | undefined {
	const rule = typeof target === "string" ? index.get(target) : undefined
	if (rule === undefined) return undefined
	if (rule.kind !== "liability") {
		emit("LEVEL_TARGET_NOT_LIABILITY", [...path, "target"])
		return undefined
	}
	if (!isPeriod(rule.compounding)) {
		emit("LEVEL_TARGET_NOT_NOMINAL", [...path, "target"])
		return undefined
	}
	return { rate: rule.rate, period: rule.compounding }
}

/** Whether the loan prices: every field typed as the calculation needs, and a payment that overflows. */
function overflows(
	level: Readonly<Record<string, unknown>>,
	rate: unknown,
	period: CompoundingPeriod,
): boolean {
	const { principal, payments, rounding } = level
	if (typeof principal !== "number" || typeof payments !== "number" || typeof rate !== "number") {
		return false
	}
	if (!isRounding(rounding)) return false
	const input = { principal, rate, periodsPerYear: PERIODS_PER_YEAR[period], payments, rounding }
	return isLevelInput(input) && levelPayment(input) === undefined
}

/** Checks a `level` Contribution: its loan fields, its nominal liability target and its frequency. */
export function checkLevelLoan(
	flow: Readonly<Record<string, unknown>>,
	path: Path,
	index: LoanIndex,
	emit: Emit,
): void {
	const level = checkShape(flow["level"], [...path, "level"], LEVEL_SHAPE, emit)
	const target = nominalTarget(path, flow["target"], index, emit)
	if (level === undefined || target === undefined) return
	if (flow["frequency"] !== FREQUENCY_OF[target.period]) {
		emit("LEVEL_FREQUENCY_MISMATCH", [...path, "frequency"])
	}
	if (overflows(level, target.rate, target.period))
		emit("LEVEL_PAYMENT_OVERFLOW", [...path, "level"])
}
