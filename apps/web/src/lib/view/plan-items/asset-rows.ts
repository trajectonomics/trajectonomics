/** The terms of a real asset as the text rows of its card (cli ADR 0060). Every figure is the document's own text. */
import type { ScenarioFlow } from "../../contract/scenario-show"
import { formatBps } from "../../format/bps"
import type { AssetParts } from "./asset-parts"
import { shareOf } from "./asset-shape"

/** One row: its label, the text before an amount, the amount (the document's text) and the text after it. */
export interface AssetRow {
	readonly label: string
	readonly before: string
	readonly amount: string | null
	readonly after: string
}

function row(label: string, before: string, amount: string | null = null, after = ""): AssetRow {
	return { label, before, amount, after }
}

/** A running cost or rent: a yearly percent of the value, or a fixed monthly amount and its growth. */
function keepingRow(label: string, flow: ScenarioFlow, account: string): AssetRow {
	const share = shareOf(flow, account)
	if (share !== null) return row(label, `${formatBps(share.num)}% of its value a year`)
	const growth = flow.growth
	const grows =
		growth === undefined || growth === "inflation"
			? "following inflation"
			: `growing ${formatBps(growth.bps)}% a year`
	return row(label, "", flow.amount ?? null, `a month, ${grows}`)
}

/** The row of the sale's cost: a percent of the value, or an amount. */
function saleCostRow(flow: ScenarioFlow, account: string): AssetRow {
	const share = shareOf(flow, account)
	if (share !== null) return row("Selling costs", `${formatBps(share.num)}% of its value`)
	return row("Selling costs", "", flow.amount ?? null)
}

/** How the purchase is paid: from savings, or with the loan. */
function payingRow(parts: AssetParts): AssetRow {
	const level = parts.loan?.payment.level
	if (parts.loan === null || level === undefined) return row("Paid", "From savings")
	const rate = `${formatBps(parts.loan.account.rate)}% a year`
	return row("Paid", "With a loan of", level.principal, `at ${rate}, ${level.payments} payments`)
}

/** The value's yearly change, as the Account states it. */
function valueRow(parts: AssetParts): AssetRow {
	const rate = parts.account.rate
	const word = rate < 0 ? "Falls" : "Rises"
	return row("Value", `${word} ${formatBps(Math.abs(rate))}% a year (your own estimate)`)
}

/** The rows of the asset's terms, in the order a person reads them. */
export function assetRows(parts: AssetParts): AssetRow[] {
	const account = parts.account.id
	const rows = [valueRow(parts)]
	if (parts.purchase !== null) {
		rows.push(row("Bought", `On ${parts.purchase.start} for`, parts.purchase.amount ?? null))
		if (parts.buyCost !== null) rows.push(row("Buying costs", "", parts.buyCost.amount ?? null))
		rows.push(payingRow(parts))
	} else {
		rows.push(row("Owned", "Already owned: its value is the Baseline's"))
	}
	if (parts.running !== null) rows.push(keepingRow("Running costs", parts.running, account))
	if (parts.rent !== null) rows.push(keepingRow("Rent", parts.rent, account))
	if (parts.sale !== null) rows.push(row("Sold", `On ${parts.sale.start}`))
	if (parts.saleCost !== null) rows.push(saleCostRow(parts.saleCost, account))
	return rows
}
