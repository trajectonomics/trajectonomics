/**
 * The routing of a plan in a What-if session (web ADR 0022). A routing list is tried whole, as one Set of `cashflow.<list>`
 * (cli ADR 0070 replaces a path that exists), and a transfer is tried as any Flow is. `shownPlan` is the document as the
 * session shows it: the Sets put in, the removed Flows out and the added Flows in, so a drawer that tries a value starts from
 * the earlier tries and a new try keeps them. Object editing only: no figure is made.
 */
import type { ScenarioCashflow, ScenarioDocument, ScenarioFlow } from "../contract"
import { LISTS, type ListName } from "../view/routing/entries"
import type { Json } from "./json"
import { overlayDocument } from "./overlay"
import { type WhatIf, withSet } from "./session"

/** The session with one routing list tried whole, replacing any earlier try of that list. */
export function withTriedList(whatIf: WhatIf, list: ListName, items: readonly unknown[]): WhatIf {
	return withSet(whatIf, `cashflow.${list}`, JSON.parse(JSON.stringify(items)) as Json)
}

/** The routing lists the session tries, laid over the plan's own. */
function cashflowOf(doc: ScenarioDocument, whatIf: WhatIf): ScenarioCashflow | undefined {
	const tried = Object.fromEntries(
		LISTS.flatMap((list) => {
			const set = whatIf.sets.find((one) => one.path === `cashflow.${list}`)
			return set === undefined ? [] : [[list, set.value]]
		}),
	)
	return Object.keys(tried).length === 0
		? doc.cashflow
		: ({ ...doc.cashflow, ...tried } as ScenarioCashflow)
}

/** The plan as the session shows it, or the plan itself when no session holds a change. */
export function shownPlan(doc: ScenarioDocument, whatIf: WhatIf | null): ScenarioDocument {
	if (whatIf === null) return doc
	const base = overlayDocument(doc, {
		sets: whatIf.sets,
		removals: whatIf.removals,
	})
	const added = whatIf.additions.filter((one) => one.list === "flows").map((one) => one.item)
	const cashflow = cashflowOf(doc, whatIf)
	const flows = [...base.flows, ...(added as unknown as ScenarioFlow[])]
	return { ...base, flows, ...(cashflow === undefined ? {} : { cashflow }) }
}
