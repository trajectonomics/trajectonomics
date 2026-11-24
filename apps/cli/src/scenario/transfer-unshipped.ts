import { isPlainObject } from "../json"
import type { Unshipped } from "./routing-unshipped"

/*
 * A `transfer` Flow (sim ADR 0031) is a kind the engine takes and the published shape does not describe yet,
 * so it is refused with the routing keys (routing-unshipped.ts): a stored one would be shown wrongly by
 * `traj schema` and its amounts read in the wrong unit.
 */

const TRANSFER: Unshipped["said"] = {
	message:
		'A "transfer" Flow, money moved between your own Accounts, ships in a later release; this release takes the kinds "income", "expense", "contribution" and "withdrawal".',
	hint: 'Leave the "transfer" Flow out of the document.',
}

function at(prefix: readonly (string | number)[], ...more: (string | number)[]) {
	return [...prefix, ...more]
}

/** One Flow: a `kind` that is `transfer`. */
function flowKind(flow: unknown, path: readonly (string | number)[], out: Unshipped[]): void {
	if (isPlainObject(flow) && flow["kind"] === "transfer") {
		out.push({ segments: at(path, "kind"), said: TRANSFER })
	}
}

/** The Flows of a document, in order. */
export function flows(value: unknown, path: readonly (string | number)[], out: Unshipped[]): void {
	if (!Array.isArray(value)) return
	for (const [index, flow] of value.entries()) flowKind(flow, at(path, index), out)
}

/** The unshipped Flow in a value a Set or an Add puts at `flows`, `flows.<id>` or `flows.<id>.kind`. */
export function unshippedFlowAt(segments: readonly string[], value: unknown): Unshipped[] {
	const out: Unshipped[] = []
	const [, id, key] = segments
	if (segments.length === 1) {
		flows(value, ["flows"], out)
		flowKind(value, ["flows"], out)
	} else if (segments.length === 2) flowKind(value, ["flows", id as string], out)
	else if (segments.length === 3 && key === "kind" && value === "transfer") {
		out.push({ segments: ["flows", id as string, "kind"], said: TRANSFER })
	}
	return out
}
