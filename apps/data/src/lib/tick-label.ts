import { compactCount } from "./format"
import { usdTick } from "./money"

/** How an axis writes its values. */
export type TickKind = "usd" | "percent" | "tokens"

/** One axis tick's label: dollars, a percentage, or a compact token count. */
export function tickText(kind: TickKind, value: number): string {
	if (kind === "usd") return usdTick(value)
	if (kind === "percent") return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
	return compactCount(value)
}
