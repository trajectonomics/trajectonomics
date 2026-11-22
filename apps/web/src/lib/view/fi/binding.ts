import type { FiResult } from "../../contract"

/** Every binding an unreachable FI answer may state: the survival bindings and `noCandidateMonth`. */
export type UnreachableBinding = Extract<FiResult, { reachable: false }>["binding"]

/**
 * What each binding means, in plain words, following cli ADR 0008 and the survival method ADR
 * (packages/core/sim ADR 0004). Keyed by the binding, so a new binding is a type error until it is said.
 */
const SENTENCES: Record<UnreachableBinding, string> = {
	noCandidateMonth:
		"The horizon falls in the month a stop would start, so there is no month left to test.",
	shortfallBeforeStop:
		"The money runs out before the first month earned income could stop, so no stop month can pass.",
	undrawableMoney:
		"The money runs out, and locked or unrouted assets would cover the gap, but they cannot be drawn on.",
	insufficientMoney:
		"The money runs out, and even the locked or unrouted assets are not enough to cover the gap.",
	minimumBuffer:
		"After the stop, accessible net worth falls below the minimum buffer, so the buffer test fails.",
}

/** The plain-words sentence for an unreachable binding. */
export function bindingSentence(binding: UnreachableBinding): string {
	return SENTENCES[binding]
}
