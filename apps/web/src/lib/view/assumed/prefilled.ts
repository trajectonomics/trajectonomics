import type { AssumedItem } from "../../contract"
import { withSearch } from "../links"

/** A value the template wrote that no edit has stated since (cli ADR-0084). */
export type Prefilled = Extract<AssumedItem, { kind: "template-default" }>

/** A group's "Change" link, with the address's query kept. */
export const change = (href: string, search: string) => ({
	href: withSearch(href, search),
	label: "Change",
})

export const keepOf = (item: Prefilled) => ({ path: item.path, value: item.value })
