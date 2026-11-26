import type { FlowBand, FlowInput, FlowKind } from "../../chart/flow"
import { type ItemNames, NO_ITEM_NAMES } from "../item-names"
import type { CashflowLine, Rollup } from "./cashflow"
import { intoKey, isRefund, lineKey, lineLabel } from "./cashflow-labels"

/**
 * The bands of a roll-up's flow diagram. Sources are income, withdrawals, money drawn, tax refunds and
 * unmet money; uses are the tax paid, spending by category, saving per Flow and money left over. A
 * refund is a source with the sign taken off its CLI string. Unfunded money is not in the flow: the
 * engine's identity does not count it, so it is only in the table.
 */
export function flowOf(
	rollup: Rollup,
	accountName: ReadonlyMap<string, string>,
	names: ItemNames = NO_ITEM_NAMES,
): FlowInput {
	const band = (line: CashflowLine, kind: FlowKind, amount = line.amount): FlowBand => ({
		key: lineKey(line),
		kind,
		label: lineLabel(line, accountName, names),
		amount,
	})
	// Each side's bands follow the order the diagram reads: a source by its kind, a use by its kind.
	const linesIn = (group: CashflowLine["group"]) =>
		rollup.lines.filter((line) => line.group === group)
	const sources = [
		...linesIn("income").map((line) => band(line, "income")),
		...linesIn("payout").map((line) => band(line, "payout")),
		...linesIn("employer").map((line) => band(line, "employer")),
		...linesIn("withdrawal").map((line) => band(line, "withdrawal")),
		...linesIn("drawn").map((line) => band(line, "drawn")),
		...linesIn("settlement")
			.filter(isRefund)
			.map((line) => band(line, "refund", line.amount.slice(1))),
		...linesIn("unmet").map((line) => band(line, "unmet")),
	]
	const uses = [
		...linesIn("prepaid").map((line) => band(line, "tax")),
		...linesIn("settlement")
			.filter((line) => !isRefund(line))
			.map((line) => band(line, "tax")),
		...linesIn("category").map((line) => band(line, "spending")),
		...linesIn("contribution").map((line) => band(line, "saving")),
		// The employer's money never enters cash, so its band stands on both sides: in from the employer, on into the account.
		...linesIn("employer").map((line) => ({
			...band(line, "employer"),
			key: intoKey(lineKey(line)),
		})),
		...linesIn("surplus").map((line) => band(line, "left-over")),
	]
	return { sources, uses }
}
