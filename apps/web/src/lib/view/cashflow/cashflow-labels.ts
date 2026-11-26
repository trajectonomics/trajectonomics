import { type ItemLabel, type ItemNames, itemLabel, NO_ITEM_NAMES } from "../item-names"
import { wordsOf } from "../words"
import type { CashflowLine } from "./cashflow"

/** The key of a line, unique in its roll-up, so a band and its table row can name each other. */
export function lineKey(line: CashflowLine): string {
	return JSON.stringify([line.group, line.id, line.account, line.category])
}

const INTO = "|into"

/** The key of the band an employer's line has on the right of the diagram, where it goes on into its account. */
export function intoKey(key: string): string {
	return `${key}${INTO}`
}

/** The key of the line a band stands for: an employer's band on the right is the same line as its band on the left. */
export function rowKeyOf(key: string): string {
	return key.endsWith(INTO) ? key.slice(0, -INTO.length) : key
}

/** Whether a settlement is a refund: its CLI string keeps the minus sign. */
export function isRefund(line: CashflowLine): boolean {
	return line.group === "settlement" && line.amount.startsWith("-")
}

/**
 * The groups whose line's `id` names a Flow, which the plan's label names. A prepaid or settlement id names a Levy, a
 * category's names a category, and the rest name no item (web ADR 0029).
 */
const FLOW_GROUPS: ReadonlySet<CashflowLine["group"]> = new Set([
	"income",
	"expense",
	"contribution",
	"unfunded",
	"employer",
	"withdrawal",
])

/** The label of a line given its Account's name and the Flow it names, by the line's group. */
type Namer = (line: CashflowLine, account: string, flow: ItemLabel | null) => readonly LinePart[]

/** A piece of a line's label: words, or the plan's words for a Flow, which a page without a label draws in code. */
export type LinePart = string | { readonly item: ItemLabel }

/** A Flow's words as a part: its plan's label, or the id in code when the plan states none. */
function flowPart(flow: ItemLabel | null): LinePart {
	return flow === null ? "" : { item: flow }
}

const NAMERS: Readonly<Record<CashflowLine["group"], Namer>> = {
	income: (_line, _account, flow) => (flow === null ? ["Income"] : [flowPart(flow)]),
	payout: (_line, account) => [`Paid out by ${account}`],
	prepaid: (line) => [`Prepayment, ${line.id ?? ""}`],
	settlement: (line) => [`${isRefund(line) ? "Refund" : "Settlement"}, ${line.id ?? ""}`],
	expense: (_line, _account, flow) => (flow === null ? ["Expense"] : [flowPart(flow)]),
	category: (line) => [line.id ?? "Uncategorised"],
	contribution: (_line, account, flow) => [flowPart(flow), ` into ${account}`],
	unfunded: (_line, account, flow) => [flowPart(flow), ` not funded into ${account}`],
	employer: (_line, account, flow) => [
		"From your employer into ",
		account,
		" (",
		flowPart(flow),
		")",
	],
	withdrawal: (_line, account, flow) => [flowPart(flow), ` from ${account}`],
	drawn: (_line, account) => [`Drawn from ${account}`],
	surplus: (_line, account) => [`Left over in ${account}`],
	unmet: () => ["Unmet"],
}

/** The words of a Flow a line names, or null for a line that names none. */
function flowNamed(line: CashflowLine, names: ItemNames): ItemLabel | null {
	if (line.id === null || !FLOW_GROUPS.has(line.group)) return null
	return itemLabel(names, "flow", line.id)
}

/**
 * A line's label as parts, with the Account's name where the line has one and the plan's words for the Flow it names.
 * The names hold both: the ledger's Account names and the plan's Flow labels. A Flow the plan labels reads its label,
 * and one it does not label shows its id in code. A null category is named as uncategorised.
 */
export function lineWords(
	line: CashflowLine,
	names: ItemNames = NO_ITEM_NAMES,
): readonly LinePart[] {
	const account = line.account === null ? "" : (names.accounts.get(line.account) ?? line.account)
	return NAMERS[line.group](line, account, flowNamed(line, names))
}

/** A line's label as plain text, for a chart's label, which holds no markup (web ADR 0029). */
export function lineLabel(line: CashflowLine, names: ItemNames = NO_ITEM_NAMES): string {
	return wordsOf(lineWords(line, names)).text
}

/**
 * A twin Flow's `(id)`, which a diagram keeps in view when it cuts the line's name, or null for a line
 * that names no twin. Two Flows that share a label take their id in brackets (web ADR 0029), so the id is
 * what tells them apart, whether it ends the label or sits before words such as "into Bank".
 */
export function lineTwinId(line: CashflowLine, names: ItemNames = NO_ITEM_NAMES): string | null {
	const flow = flowNamed(line, names)
	if (flow === null) return null
	return flow.text.endsWith(` (${flow.id})`) ? `(${flow.id})` : null
}
