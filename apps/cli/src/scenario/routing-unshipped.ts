import { type AppError, fail } from "../errors"
import { isPlainObject } from "../json"
import { flows, unshippedFlowAt } from "./transfer-unshipped"

/*
 * The routing keys the engine accepts and the CLI does not take yet (sim ADR 0030): a surplus step's
 * `share`, a `withdraw` entry that is an object (an Account with a `downTo` floor), and an `upTo` or
 * `downTo` that is `{ amount, growth }`. The published shape (`shape/cashflow.ts`) still describes
 * the plain forms, and the decimal form finds its money fields from that shape, so a key stored now
 * would be stored in the wrong unit (a `downTo` of 3000 read as 30.00) and shown wrongly by
 * `traj schema`. The CLI refuses them until the shape publishes them, with the decimal conversion
 * for them. This is not a second validator: the engine's `check()` already accepts these keys, and
 * every other refusal of a document is still the engine's.
 *
 * A `transfer` Flow (sim ADR 0031) is refused the same way: the engine accepts the kind and its
 * `source`, `target` and `realise`, and the published shape does not describe them yet, so a stored
 * one would be shown wrongly by `traj schema` and its amounts read in the wrong unit.
 */

/** The code of a refusal the CLI states itself, beside the engine's. */
export const ROUTING_NOT_SHIPPED = "ROUTING_NOT_SHIPPED"

/** An unshipped key as a Scenario problem: the CLI's own code, with its sentence and way out. */
export type UnshippedProblem = {
	readonly code: typeof ROUTING_NOT_SHIPPED
	readonly segments: readonly (string | number)[]
	readonly said: { readonly message: string; readonly hint: string }
}

export type Unshipped = {
	/** Where the refused key is, from the document root (or from the path a Set names). */
	readonly segments: readonly (string | number)[]
	readonly said: { readonly message: string; readonly hint: string }
}

const SHARE: Unshipped["said"] = {
	message:
		'A surplus step with "share" ships in a later release; this release takes a step with an Account and a whole-amount "upTo" only.',
	hint: 'Leave "share" out of the step, or give the step an "upTo".',
}

const FLOOR: Unshipped["said"] = {
	message:
		'A "withdraw" entry that is an object, an Account with a "downTo" floor, ships in a later release; this release takes an Account\'s id alone.',
	hint: "List the Account by its id alone.",
}

const GROWN: Unshipped["said"] = {
	message:
		'An "upTo" given as { "amount", "growth" } ships in a later release; this release takes a whole amount in minor units.',
	hint: 'Give "upTo" as a whole number of minor units.',
}

function at(prefix: readonly (string | number)[], ...more: (string | number)[]) {
	return [...prefix, ...more]
}

/** One surplus step: a `share` key, and an `upTo` that is an object. */
function surplusStep(step: unknown, path: readonly (string | number)[], out: Unshipped[]): void {
	if (!isPlainObject(step)) return
	if (Object.hasOwn(step, "share")) out.push({ segments: at(path, "share"), said: SHARE })
	if (isPlainObject(step["upTo"])) out.push({ segments: at(path, "upTo"), said: GROWN })
}

/** `cashflow` itself: the surplus steps and the withdraw entries. */
function cashflow(value: unknown, path: readonly (string | number)[], out: Unshipped[]): void {
	if (!isPlainObject(value)) return
	const surplus = value["surplus"]
	if (Array.isArray(surplus)) {
		for (const [index, step] of surplus.entries()) {
			surplusStep(step, at(path, "surplus", index), out)
		}
	}
	const withdraw = value["withdraw"]
	if (Array.isArray(withdraw)) {
		for (const [index, entry] of withdraw.entries()) {
			if (typeof entry !== "string") {
				out.push({ segments: at(path, "withdraw", index), said: FLOOR })
			}
		}
	}
}

/**
 * The unshipped routing keys in a whole Scenario document, in document order. A document that is
 * not an object, or has no `cashflow`, has none.
 */
export function unshippedRouting(document: unknown): Unshipped[] {
	const out: Unshipped[] = []
	if (!isPlainObject(document)) return out
	flows(document["flows"], ["flows"], out)
	cashflow(document["cashflow"], ["cashflow"], out)
	return out
}

/**
 * The unshipped routing keys in `value`, the value a `--set` or an `--add` puts at `segments`. The
 * path decides which part of the document the value is; a surplus step and a withdraw entry have no
 * id, so a Set reaches them only through the whole list or `cashflow`.
 */
export function unshippedRoutingAt(segments: readonly string[], value: unknown): Unshipped[] {
	if (segments.length === 0) return unshippedRouting(value)
	const [first, second] = segments
	if (first === "flows") return unshippedFlowAt(segments, value)
	if (first !== "cashflow" || segments.length > 2) return []
	const out: Unshipped[] = []
	if (second === undefined) cashflow(value, ["cashflow"], out)
	else if (second === "surplus") cashflow({ surplus: value }, ["cashflow"], out)
	else if (second === "withdraw") cashflow({ withdraw: value }, ["cashflow"], out)
	return out
}

/**
 * The `invalid_input` for the first unshipped key a document written in the decimal form holds, at
 * its document path, or null when it holds none.
 */
export function unshippedRoutingError(found: readonly Unshipped[]): AppError | null {
	const [first] = found
	if (first === undefined) return null
	const path = ["document", ...first.segments].join(".")
	return fail("invalid_input", {
		path,
		message: `${path}: ${first.said.message}`,
		hint: first.said.hint,
		details: found.map((entry) => ({
			path: ["document", ...entry.segments].join("."),
			code: ROUTING_NOT_SHIPPED,
		})),
	})
}
