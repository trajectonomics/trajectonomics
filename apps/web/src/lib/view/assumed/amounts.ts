import type { ScenarioDocument } from "../../contract"
import { splitPath } from "../document-path"
import { change, keepOf, type Prefilled } from "./prefilled"
import type { AssumedGroup, AssumedLine, AssumedSubject } from "./types"

/** The group of the pre-filled amounts, each line changed on the page its Flow is edited on. */
export function amounts(
	items: readonly Prefilled[],
	document: ScenarioDocument,
	search: string,
): AssumedGroup[] {
	const lines: (AssumedLine & { subject: AssumedSubject })[] = items.flatMap((item) => {
		const [section, id, field] = splitPath(item.path)
		if (section !== "flows" || id === undefined || field !== "amount") return []
		if (typeof item.value !== "string") return []
		const income = document.flows.some((flow) => flow.id === id && flow.kind === "income")
		return [
			{
				key: item.path,
				subject: { kind: "flow" as const, id },
				amount: { value: item.value, currency: document.currency },
				link: change(income === true ? "/income/" : "/expenses/", search),
				keep: keepOf(item),
			},
		]
	})
	const [first] = lines
	if (first === undefined) return []
	const sentence =
		lines.length === 1
			? { subject: first.subject, text: "is an amount you did not set" }
			: { subject: null, text: `${lines.length} incomes and expenses are amounts you did not set` }
	return [{ key: "amounts", sentence, lines, link: null }]
}
