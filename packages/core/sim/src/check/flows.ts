import type { Check, Emit, Path } from "./codes"
import { isValidDate } from "./date"
import { checkAccountReads } from "./flow-accounts"
import { NOT_ALLOWED } from "./flow-fields"
import { checkFlowGraph } from "./flow-graph"
import { type FlowContext, flowShape } from "./flow-shape"
import { checkLoanFlow } from "./loans"
import { checkShape, checkUnique, isRecord, list, type Shape } from "./shape"

export type { FlowContext }

/** ISO dates compare correctly as strings once validated. */
function checkDates(flow: Readonly<Record<string, unknown>>, path: Path, emit: Emit): void {
	const { start, end, frequency } = flow
	if (!isValidDate(start) || !isValidDate(end)) return
	if (end < start) emit("END_BEFORE_START", [...path, "end"])
	else if (frequency === "once" && end !== start) emit("ONCE_FLOW_END_MISMATCH", [...path, "end"])
}

const AMOUNT_FORMS = ["amount", "derive", "level"] as const

/** `growth` belongs to a fixed `amount` only; a derived or loan amount takes none. */
function checkGrowth(
	flow: Readonly<Record<string, unknown>>,
	path: Path,
	forms: readonly string[],
	emit: Emit,
): void {
	const hasGrowth = Object.hasOwn(flow, "growth")
	if (forms.includes("amount") && !hasGrowth) emit("MISSING_KEY", [...path, "growth"])
	if (!forms.includes("amount") && forms.length > 0 && hasGrowth) {
		emit("FIELD_NOT_ALLOWED", [...path, "growth"])
	}
}

/** The amount forms the Flow's kind refuses outright: `checkShape` has already reported each one. */
function refusedForms(shape: Shape): ReadonlySet<string> {
	return new Set(AMOUNT_FORMS.filter((key) => shape[key] === NOT_ALLOWED))
}

/**
 * Exactly one of `amount` (which needs `growth`), `derive` and `level`. A form the kind refuses is
 * reported once, by its shape, so it is not reported again here.
 */
function checkAmount(
	flow: Readonly<Record<string, unknown>>,
	path: Path,
	refused: ReadonlySet<string>,
	emit: Emit,
): void {
	const forms = AMOUNT_FORMS.filter((key) => Object.hasOwn(flow, key))
	if (forms.length === 0) emit("MISSING_KEY", [...path, "amount"])
	for (const form of forms.slice(1)) {
		if (!refused.has(form)) emit("FIELD_NOT_ALLOWED", [...path, form])
	}
	checkGrowth(flow, path, forms, emit)
}

function flowCheck(context: FlowContext): Check {
	return (value, path, emit) => {
		const kind = isRecord(value) ? value["kind"] : undefined
		const shape = flowShape(kind, context)
		const flow = checkShape(value, path, shape, emit)
		if (!flow) return
		checkDates(flow, path, emit)
		checkAmount(flow, path, refusedForms(shape), emit)
		checkLoanFlow(flow, path, context.loans, emit)
	}
}

export function checkFlows(value: unknown, path: Path, context: FlowContext, emit: Emit): void {
	list(flowCheck(context))(value, path, emit)
	checkUnique(value, path, "id", emit)
	checkFlowGraph(value, path, emit)
	checkAccountReads(value, path, context.accounts, emit)
}
