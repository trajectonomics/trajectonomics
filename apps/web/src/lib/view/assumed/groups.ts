/**
 * A plan's Assumed values (cli ADR-0083, ADR-0084) in the groups a person reads. Every value is the one the CLI
 * printed (web ADR 0002), every item is named by its id's lookup (web ADR 0029), and every link keeps the
 * address's query ([web ADR 0032](../../../../docs/adr/0032-home-and-the-plan-page-show-what-a-plan-assumes.md)). Pure.
 */
import type { AssumedItem, ScenarioDocument } from "../../contract"
import { splitPath } from "../document-path"
import type { PersonName } from "../item-names"
import { withSearch } from "../links"
import { notStated } from "../tax-settings/not-stated"
import type { AssumedGroup } from "./types"
import { prefilledGroups } from "./values"

/** What an allowance class this page has no words for is called: its key is never shown. */
const UNNAMED_ALLOWANCE = "A tax allowance"

function unlabelled(items: readonly AssumedItem[], search: string): AssumedGroup[] {
	const lines = items.flatMap((item) => {
		const id = item.kind === "unlabelled-income" ? splitPath(item.path)[1] : undefined
		return id === undefined ? [] : [{ key: item.path, subject: { kind: "flow" as const, id } }]
	})
	const [first] = lines
	if (first === undefined) return []
	const sentence =
		lines.length === 1
			? { subject: first.subject, text: "has no tax label" }
			: { subject: null, text: `${lines.length} incomes have no tax label` }
	const link = { href: withSearch("/income/", search), label: "Change" }
	return [{ key: "unlabelled", sentence, lines, link }]
}

function allowances(
	items: readonly AssumedItem[],
	claimant: PersonName | null,
	search: string,
): AssumedGroup[] {
	const lines = items.flatMap((item) => {
		if (item.kind !== "unstated-allowance") return []
		const klass = splitPath(item.path)[1] ?? ""
		const [named] = notStated({ stated: [], notStated: [klass] }, claimant)
		const label = named === undefined || named.label === klass ? UNNAMED_ALLOWANCE : named.label
		return [{ key: item.path, text: label }]
	})
	const [first] = lines
	if (first === undefined) return []
	const text =
		lines.length === 1
			? `${first.text} is not in this plan's tax`
			: `${lines.length} tax allowances are not in this plan's tax`
	const link = { href: withSearch("/settings/tax/", search), label: "Change" }
	return [{ key: "allowances", sentence: { subject: null, text }, lines, link }]
}

function taxFigures(items: readonly AssumedItem[], search: string): AssumedGroup[] {
	const lines = items.flatMap((item) =>
		item.kind === "tax-figure" ? [{ key: item.path, text: item.note, cli: true }] : [],
	)
	if (lines.length === 0) return []
	const text =
		lines.length === 1
			? "1 tax figure is not yet confirmed"
			: `${lines.length} tax figures are not yet confirmed`
	const link = { href: withSearch("/tax/", search), label: "See tax" }
	return [{ key: "tax-figures", sentence: { subject: null, text }, lines, link }]
}

/** The groups of one plan's list, in the page's order; a kind the plan lacks has no group. */
export function assumedGroups(
	items: readonly AssumedItem[],
	document: ScenarioDocument,
	search: string,
	claimant: PersonName | null = null,
): AssumedGroup[] {
	return [
		...prefilledGroups(items, document, search),
		...unlabelled(items, search),
		...allowances(items, claimant, search),
		...taxFigures(items, search),
	]
}
