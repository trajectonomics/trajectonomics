import type { Emit, Path } from "./codes"
import { NOT_ALLOWED } from "./flow-fields"
import type { FlowContext } from "./flow-shape"
import type { LoanIndex } from "./loan-index"
import { accountRef } from "./refs"
import { bool } from "./scalars"
import { opt, req, type Shape } from "./shape"

/** The keys a transfer Flow takes beyond the ones every Flow shares: its two Accounts and `realise` (ADR 0031). */
export function transferShape(shared: Shape, context: FlowContext): Shape {
	return {
		...shared,
		source: req(accountRef(context.accounts)),
		target: req(accountRef(context.accounts)),
		realise: opt(bool),
		funding: NOT_ALLOWED,
		label: NOT_ALLOWED,
		prepayments: NOT_ALLOWED,
		cappedPrepayment: NOT_ALLOWED,
		level: NOT_ALLOWED,
	}
}

/**
 * The Accounts a transfer may name: its source is an asset that is not Illiquid (a sale is a Planned
 * withdrawal), never a liability (borrowing is one), and it never names the same Account twice. Its target
 * may be an Illiquid asset or a liability, which the transfer pays down.
 */
export function checkTransferFlow(
	flow: Readonly<Record<string, unknown>>,
	path: Path,
	index: LoanIndex,
	emit: Emit,
): void {
	if (flow["kind"] !== "transfer") return
	const { source, target } = flow
	const rule = typeof source === "string" ? index.get(source) : undefined
	if (rule?.kind === "liability") emit("TRANSFER_FROM_LIABILITY", [...path, "source"])
	else if (rule?.kind === "asset" && rule.liquid === false) {
		emit("TRANSFER_FROM_ILLIQUID", [...path, "source"])
	}
	if (typeof source === "string" && source === target) {
		emit("TRANSFER_SAME_ACCOUNT", [...path, "target"])
	}
}
