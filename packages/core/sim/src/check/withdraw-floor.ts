import type { Emit, ErrorCode, Path } from "./codes"
import { isRecord } from "./shape"

/** A floor as the order check compares it: its amount, and the growth it rises by (a plain number grows by 0). */
interface Floor {
	readonly amount: number
	readonly growth: string
}

function floorOf(entry: unknown): Floor | undefined {
	if (!isRecord(entry)) return undefined
	const target = entry["downTo"]
	if (typeof target === "number") return { amount: target, growth: "0" }
	if (!isRecord(target) || typeof target["amount"] !== "number") return undefined
	return { amount: target["amount"], growth: JSON.stringify(target["growth"]) }
}

/** Whether `next` is provably lower than `earlier` on every date: the same growth and a smaller amount. */
function lowerThan(next: Floor, earlier: Floor): boolean {
	return next.growth === earlier.growth && next.amount < earlier.amount
}

type Earlier = Floor | "plain"

function earlierOf(entry: unknown): Earlier | undefined {
	return typeof entry === "string" ? "plain" : floorOf(entry)
}

/** The problem an entry has beside the earlier entry of its Account, if any. */
function problemOf(here: Earlier, earlier: Earlier | undefined): ErrorCode | undefined {
	if (earlier === undefined) return undefined
	if (here === "plain") return earlier === "plain" ? "DUPLICATE_ID" : undefined
	return earlier === "plain" || !lowerThan(here, earlier) ? "WITHDRAW_FLOOR_ORDER" : undefined
}

/**
 * Emits `WITHDRAW_FLOOR_ORDER` at the `downTo` of an entry that repeats an Account without a provably
 * lower floor, or follows its plain entry. A plain entry has floor 0, so it may follow any floor.
 * Two plain entries of one Account stay `DUPLICATE_ID`, as before (ADR 0030).
 */
export function checkFloorOrder(list: unknown, path: Path, emit: Emit): void {
	if (!Array.isArray(list)) return
	const last = new Map<string, Earlier>()
	list.forEach((entry: unknown, index) => {
		const account = isRecord(entry) ? entry["account"] : entry
		const here = earlierOf(entry)
		if (typeof account !== "string" || here === undefined) return
		const code = problemOf(here, last.get(account))
		last.set(account, here)
		if (code !== undefined)
			emit(code, here === "plain" ? [...path, index] : [...path, index, "downTo"])
	})
}
