/**
 * Why a plan lacks a series, by the kind of series, in the words the picker shows. `has` is the ids the
 * plan does state: a plan that taxes under another Levy says which Levy this series is missing.
 */
export function reasonFor(id: string, has: ReadonlySet<string> = new Set()): string {
	if (id === "withdrawals") return "this plan has no withdrawal Flow"
	if (id.startsWith("tax:")) {
		const taxed = [...has].some((other) => other.startsWith("tax:"))
		return taxed ? `this plan has no tax for ${levyOf(id)}` : "this plan has no tax"
	}
	if (id.startsWith("rule:")) return "this plan has no such spending rule"
	if (id === "estate:heirs") return "this plan states no estate"
	if (id.startsWith("account:")) return "this plan has no such Account"
	if (id.startsWith("cash:")) return "this plan has no such cash-flow line"
	return "this plan does not state it"
}

/** The Levy a tax series id names: `tax:<levy>:due`. */
function levyOf(id: string): string {
	return id.slice("tax:".length, id.lastIndexOf(":"))
}
