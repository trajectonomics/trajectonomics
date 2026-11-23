/**
 * One real asset as a card on the Assets and debts page (cli ADR 0060): its terms as the document states them, its
 * value over time and this year's costs and rent as `traj` states them. Every amount is the CLI's decimal string;
 * the card computes nothing.
 */
import type { Baseline, ProjectionRun, Read, ScenarioDocument, ScenarioFlow } from "../../contract"
import { balanceOf } from "./accounts"
import { type AssetChart, assetChartOf } from "./asset-chart"
import { realAssetsOf } from "./asset-document"
import { assetIds } from "./asset-ids"
import { type AssetParts, flowsOf } from "./asset-parts"
import { type AssetRow, assetRows } from "./asset-rows"
import { type AssetYear, assetYearOf, unfundedYearsOf } from "./asset-year"

/** An item of the asset a What-if switch can take out, by the Flow's id. */
export interface AssetSwitch {
	readonly id: string
	readonly label: string
}

/** One real asset's card. */
export interface AssetCardView {
	/** The Account's id, which the asset's name is. */
	readonly id: string
	/** Its ledger name when the Baseline holds it, else its id. */
	readonly title: string
	readonly owned: boolean
	/** The Baseline's amount for an owned asset, or null. */
	readonly baselineValue: string | null
	readonly rows: readonly AssetRow[]
	readonly chart: AssetChart | null
	/** The loan's paid-off date; `known` is false when the run states no paid-off row for it. */
	readonly loan: { readonly paidOff: string | null; readonly known: boolean } | null
	readonly year: AssetYear | null
	/** The years of the purchase or sale in which the engine reports money not funded. */
	readonly unfunded: readonly { readonly from: string; readonly to: string }[]
	/** True for a taxed plan with rent or a sale: neither carries a Tally label, so neither is taxed. */
	readonly untaxed: boolean
	/** The ids that follow the asset's convention but were changed outside the form. */
	readonly outside: readonly string[]
	readonly switches: readonly AssetSwitch[]
}

/** Whether a Flow is there and carries no Tally label, so a Levy does not tax it (the form sets none). */
function unlabelled(flow: ScenarioFlow | null): boolean {
	return flow !== null && typeof flow["label"] !== "string"
}

const LABELS: Readonly<Record<string, string>> = {
	purchase: "Purchase",
	buyCost: "Buying costs",
	loanDraw: "Loan",
	loanPayment: "Loan payments",
	running: "Running costs",
	rent: "Rent",
	sale: "Sale",
	saleCost: "Selling costs",
	loanPayoff: "Loan repaid from the sale",
}

/** The Flows of the asset a What-if can switch off, each with its label. */
function switchesOf(parts: AssetParts): AssetSwitch[] {
	const ids = assetIds(parts.account.id)
	const roleOf = (flowId: string) => Object.entries(ids).find(([, id]) => id === flowId)?.[0] ?? ""
	return flowsOf(parts).map((flow) => ({ id: flow.id, label: LABELS[roleOf(flow.id)] ?? flow.id }))
}

/** The loan's paid-off date from the run's `paidOff` table. */
function loanOf(run: ProjectionRun | undefined, parts: AssetParts): AssetCardView["loan"] {
	if (parts.loan === null) return null
	const rows = (run?.tables ?? []).flatMap((table) =>
		table.name === "paidOff"
			? table.rows.filter((row) => row.account === parts.loan?.account.id)
			: [],
	)
	return { paidOff: rows[0]?.date ?? null, known: rows.length > 0 }
}

/** The card of one asset: the Baseline names it, and the run values it. */
function cardOf(
	parts: AssetParts,
	outside: readonly string[],
	context: { baseline: Read<Baseline> | undefined; run: ProjectionRun | undefined },
): AssetCardView {
	const { baseline, run } = context
	const owned = parts.purchase === null
	const baselineValue = owned ? balanceOf(parts.account, baseline) : null
	const named = baseline?.ok
		? baseline.data.rows.find((row) => row.account.id === parts.account.id)
		: undefined
	return {
		id: parts.account.id,
		title: named?.account.name ?? parts.account.id,
		owned,
		baselineValue,
		rows: assetRows(parts),
		chart: assetChartOf(run, parts),
		loan: loanOf(run, parts),
		year: assetYearOf(run, parts),
		unfunded: unfundedYearsOf(run, parts),
		untaxed:
			run !== undefined && run.tax !== "not_applied" && [parts.rent, parts.sale].some(unlabelled),
		outside,
		switches: switchesOf(parts),
	}
}

/** The real asset cards of a plan, in the order the document holds their Accounts. */
export function assetCardsOf(
	doc: ScenarioDocument,
	baseline: Read<Baseline> | undefined,
	run: ProjectionRun | undefined,
): AssetCardView[] {
	return realAssetsOf(doc).map((asset) => cardOf(asset.parts, asset.outside, { baseline, run }))
}
