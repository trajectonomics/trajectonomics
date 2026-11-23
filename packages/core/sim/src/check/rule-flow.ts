import { FREQUENCIES } from "../vocab"
import type { Emit, Path } from "./codes"

/** A rule Flow pays monthly or annual: any other valid frequency is `RULE_FREQUENCY`, at `frequency`. */
export function checkRuleFlow(
	flow: Readonly<Record<string, unknown>>,
	path: Path,
	emit: Emit,
): void {
	if (!Object.hasOwn(flow, "rule")) return
	const frequency = flow["frequency"]
	if (typeof frequency !== "string" || !FREQUENCIES.some((known) => known === frequency)) return
	if (frequency !== "monthly" && frequency !== "annual")
		emit("RULE_FREQUENCY", [...path, "frequency"])
}
