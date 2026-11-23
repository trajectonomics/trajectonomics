/**
 * The bands of the estate's flow diagram, on the Cash flow page's own layout (`layoutFlow`): the gross estate on the
 * left, and on the right the debts, each cost, each gift and what heirs receive. A band's kind only picks its colour.
 * A negative net has no diagram: the uses would exceed the source, and the page says so in words (cli ADR 0064). Nor has a gross
 * estate of nothing: there is nothing to split.
 */
import type { FlowBand, FlowInput } from "../../chart/flow"
import { isZeroAmount } from "../compare/cell"
import type { EstateFigures, Item } from "./figures"

function band(item: Item, kind: FlowBand["kind"]): FlowBand {
	return { key: item.key, kind, label: item.label, amount: item.amount }
}

/** The diagram's bands, or null when there is nothing to draw (a negative net, or a gross estate of nothing). */
export function estateFlow(figures: EstateFigures): FlowInput | null {
	if (figures.shortfall !== null) return null
	const byKey = (key: string): Item | undefined => figures.items.find((item) => item.key === key)
	const gross = byKey("gross")
	const debts = byKey("debts")
	const heirs = byKey("heirs")
	if (gross === undefined || debts === undefined || heirs === undefined) return null
	if (isZeroAmount(gross.amount)) return null
	return {
		sources: [band(gross, "income")],
		uses: [
			band(debts, "tax"),
			...figures.costs.map((item) => band(item, "spending")),
			...figures.gifts.map((item) => band(item, "saving")),
			band(heirs, "left-over"),
		],
	}
}
