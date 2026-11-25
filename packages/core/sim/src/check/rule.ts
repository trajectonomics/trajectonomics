import { ROUNDINGS, RULE_KINDS } from "../vocab"
import type { Check, Emit, Path } from "./codes"
import { isValidDate } from "./date"
import type { FlowContext } from "./flow-shape"
import { amount, boundedInt, date, growth, oneOf, str } from "./scalars"
import { checkShape, isRecord, list, opt, req, type Shape } from "./shape"

const share: Check = boundedInt(1, 10_000, "RATE_OUT_OF_RANGE")
const move: Check = boundedInt(0, 10_000, "RATE_OUT_OF_RANGE")

const bound: Check = (value, path, emit) =>
	void checkShape(value, path, { amount: req(amount), growth: req(growth) }, emit)
const band: Check = (value, path, emit) =>
	void checkShape(value, path, { bps: req(move), adjustBps: req(move) }, emit)
const step: Check = (value, path, emit) =>
	void checkShape(value, path, { from: req(date), bps: req(share) }, emit)

/** One Account of a rule's `portfolio`: declared, an asset, and not Illiquid. */
function portfolioAccount(context: FlowContext): Check {
	return (value, path, emit) => {
		if (typeof value !== "string") return str(value, path, emit)
		const kind = context.accounts?.get(value)
		if (context.accounts !== undefined && kind === undefined) emit("UNKNOWN_ACCOUNT", path)
		else if (kind === "liability") emit("RULE_PORTFOLIO_LIABILITY", path)
		else if (context.illiquid.has(value)) emit("RULE_PORTFOLIO_ILLIQUID", path)
	}
}

/** A non-empty list of distinct Account ids; an empty one is a missing key. */
function portfolio(context: FlowContext): Check {
	return (value, path, emit) => {
		list(portfolioAccount(context))(value, path, emit)
		if (!Array.isArray(value)) return
		if (value.length === 0) emit("MISSING_KEY", path)
		const seen = new Set<unknown>()
		for (let index = 0; index < value.length; index++) {
			if (seen.has(value[index])) emit("DUPLICATE_ID", [...path, index])
			seen.add(value[index])
		}
	}
}

/** The keys a rule of `kind` takes; an invalid kind takes every optional key. */
function shapeOf(kind: unknown, context: FlowContext): Shape {
	const common: Shape = {
		kind: req(oneOf(RULE_KINDS, "INVALID_KIND")),
		portfolio: req(portfolio(context)),
		rateBps: req(share),
		rounding: req(oneOf(ROUNDINGS, "INVALID_ROUNDING")),
	}
	const current = { steps: opt(list(step)), floor: opt(bound), ceiling: opt(bound) }
	const guard = { upper: opt(band), lower: opt(band) }
	if (kind === "initialRate") return common
	if (kind === "currentRate") return { ...common, ...current }
	return kind === "guardrails" ? { ...common, ...guard } : { ...common, ...current, ...guard }
}

/** `steps` must start after the last: a repeat or an earlier date is `STEPS_NOT_ASCENDING`. */
function checkSteps(steps: unknown, path: Path, emit: Emit): void {
	if (!Array.isArray(steps)) return
	if (steps.length === 0) emit("MISSING_KEY", path)
	let previous: string | undefined
	for (let index = 0; index < steps.length; index++) {
		const from: unknown = isRecord(steps[index]) ? steps[index]["from"] : undefined
		if (!isValidDate(from)) continue
		if (previous !== undefined && from <= previous) {
			emit("STEPS_NOT_ASCENDING", [...path, index, "from"])
		}
		previous = from
	}
}

/** A fixed floor above a fixed ceiling is refused; growth that later crosses them is not (ADR 0023). */
function checkBounds(rule: Readonly<Record<string, unknown>>, path: Path, emit: Emit): void {
	const floor = rule["floor"]
	const ceiling = rule["ceiling"]
	if (!isRecord(floor) || !isRecord(ceiling)) return
	if (typeof floor["amount"] === "number" && typeof ceiling["amount"] === "number") {
		if (floor["amount"] > ceiling["amount"]) emit("RULE_FLOOR_ABOVE_CEILING", [...path, "floor"])
	}
}

/** A Flow's `rule`: its keys per kind, a portfolio of liquid assets, and the kind's own limits. */
export function spendingRule(context: FlowContext): Check {
	return (value, path, emit) => {
		const kind = isRecord(value) ? value["kind"] : undefined
		const rule = checkShape(value, path, shapeOf(kind, context), emit)
		if (rule === undefined) return
		checkSteps(rule["steps"], [...path, "steps"], emit)
		checkBounds(rule, path, emit)
		const open = !Object.hasOwn(rule, "upper") && !Object.hasOwn(rule, "lower")
		if (kind === "guardrails" && open) emit("MISSING_KEY", [...path, "upper"])
	}
}
