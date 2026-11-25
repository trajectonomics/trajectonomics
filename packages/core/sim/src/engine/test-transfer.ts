/** TEST-ONLY builders for transfers between the plan's own Accounts (ADR 0031). */
import type { AccountId, Derive, MinorUnits, TransferFlow } from "../types"
import { WHOLE_VALUE } from "./test-assets"
import type { FlowOptions } from "./test-flows"

export interface TransferOptions extends FlowOptions {
	readonly realise?: boolean
}

function layout(id: string, source: AccountId, target: AccountId, options: TransferOptions) {
	return {
		id,
		kind: "transfer",
		source,
		target,
		frequency: options.frequency ?? "once",
		start: options.start ?? "2026-01-01",
		...(options.end === undefined ? {} : { end: options.end }),
		...(options.startAt === undefined ? {} : { startAt: options.startAt }),
		...(options.endAt === undefined ? {} : { endAt: options.endAt }),
		...(options.realise === undefined ? {} : { realise: options.realise }),
	} as const
}

/** A transfer of a stated amount, which does not grow unless `growth` says so. */
export function transfer(
	id: string,
	source: AccountId,
	target: AccountId,
	amount: MinorUnits,
	options: TransferOptions = {},
): TransferFlow {
	return { ...layout(id, source, target, options), amount, growth: options.growth ?? { bps: 0 } }
}

/** A transfer of a Derived amount. */
export function derivedTransfer(
	id: string,
	source: AccountId,
	target: AccountId,
	derive: Derive,
	options: TransferOptions = {},
): TransferFlow {
	return { ...layout(id, source, target, options), derive }
}

/** A transfer of everything `source` holds on each Landed date, read before anything lands (ADR 0020). */
export function transferAll(
	id: string,
	source: AccountId,
	target: AccountId,
	options: TransferOptions = {},
): TransferFlow {
	return derivedTransfer(id, source, target, WHOLE_VALUE(source), options)
}

/** A transfer of `num / den` of what `source` holds, rounded down. */
export function transferShare(
	id: string,
	source: AccountId,
	target: AccountId,
	share: { readonly num: number; readonly den: number },
	options: TransferOptions = {},
): TransferFlow {
	const derive: Derive = {
		measures: [
			{ id: "value", op: "account", account: source },
			{ id: "share", op: "scale", of: "value", ...share, rounding: "floor" },
		],
		result: "share",
	}
	return derivedTransfer(id, source, target, derive, options)
}
