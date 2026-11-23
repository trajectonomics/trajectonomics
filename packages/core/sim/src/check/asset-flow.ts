import { FUNDINGS } from "../vocab"
import type { Emit, Path } from "./codes"
import { isValidDate } from "./date"
import type { LoanIndex } from "./loan-index"

/**
 * `funding` belongs to a Contribution into an asset: a debt payment is already an obligation, so any
 * stated value on a liability is `FUNDING_ON_LIABILITY`, or `EMPLOYER_INTO_LIABILITY` for an employer
 * share, which has its own words. An employer share into an Illiquid asset is `EMPLOYER_INTO_ILLIQUID`
 * (ADR 0026). A value outside the closed list is `INVALID_FUNDING` from the shape check alone, so it
 * is not reported a second time here.
 */
function checkFunding(
	flow: Readonly<Record<string, unknown>>,
	path: Path,
	index: LoanIndex,
	emit: Emit,
): void {
	if (!Object.hasOwn(flow, "funding")) return
	const target = flow["target"]
	const funding = flow["funding"]
	if (typeof funding !== "string" || !(FUNDINGS as readonly string[]).includes(funding)) return
	const rule = typeof target === "string" ? index.get(target) : undefined
	if (rule?.kind === "liability") {
		emit(funding === "employer" ? "EMPLOYER_INTO_LIABILITY" : "FUNDING_ON_LIABILITY", [
			...path,
			"funding",
		])
	} else if (funding === "employer" && rule?.kind === "asset" && rule.liquid === false) {
		emit("EMPLOYER_INTO_ILLIQUID", [...path, "funding"])
	}
}

/**
 * A sale from an Account that is locked on the Flow's first date, with no Milestone to wait for,
 * could never move anything on that date: `WITHDRAWAL_LOCKED` at `start`.
 */
function checkSaleLocked(
	flow: Readonly<Record<string, unknown>>,
	path: Path,
	index: LoanIndex,
	emit: Emit,
): void {
	const source = flow["source"]
	const rule = typeof source === "string" ? index.get(source) : undefined
	if (rule?.kind !== "asset" || Object.hasOwn(flow, "startAt")) return
	const { lockedUntil } = rule
	const { start } = flow
	if (isValidDate(lockedUntil) && isValidDate(start) && start < lockedUntil) {
		emit("WITHDRAWAL_LOCKED", [...path, "start"])
	}
}

/** The asset rules of one Flow: what `funding` may name, and when a sale may start. */
export function checkAssetFlow(
	flow: Readonly<Record<string, unknown>>,
	path: Path,
	index: LoanIndex,
	emit: Emit,
): void {
	if (flow["kind"] === "contribution") checkFunding(flow, path, index, emit)
	if (flow["kind"] === "withdrawal") checkSaleLocked(flow, path, index, emit)
}
