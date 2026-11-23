/**
 * Which field of a real-asset form a `traj` refusal names. A refusal's path names an item by its index in its list
 * (`document.flows.3.derive.measures.1.num`) or by its id, so both are matched against where the asset's items sit in
 * the document the save sent. The item's role in the asset (its id under the convention) decides the field.
 */
import type { ErrorBody, ScenarioDocument } from "../../contract"
import { type AssetIds, assetIds } from "./asset-ids"
import { wordedRefusal } from "./asset-refusal-words"
import type { Problems, Shown } from "./problems"

/** The ids of the document a save sent, in list order, and the asset they belong to. */
export interface AssetLayout {
	readonly id: string
	readonly owned: boolean
	readonly accounts: readonly string[]
	readonly flows: readonly string[]
	/** The form's fields that work an amount out as a percent of the asset's value, in form order. */
	readonly percents: readonly string[]
}

/** The layout of the document a save sends for the asset of that id. */
export function assetLayoutOf(
	doc: ScenarioDocument,
	id: string,
	owned: boolean,
	percents: readonly string[] = [],
): AssetLayout {
	const accounts = doc.accounts.map((a) => a.id)
	return { id, owned, accounts, flows: doc.flows.map((f) => f.id), percents }
}

/** The id a path segment names: the id itself, or the id at that index in the list. */
function resolve(segment: string | undefined, list: readonly string[]): string | null {
	if (segment === undefined) return null
	if (list.includes(segment)) return segment
	return list[Number(segment)] ?? null
}

/** The field a computed amount's path names: its percent, or its rounding. */
function computedField(role: string, rest: readonly string[]): string | null {
	if (rest.includes("rounding")) return "rounding"
	return rest.includes("num") || rest.includes("den") ? `${role}.rate` : null
}

/** The field of a running cost's or rent's path. */
function keepingField(role: "running" | "rent", rest: readonly string[], layout: AssetLayout) {
	const [field] = rest
	if (field === "start") return layout.owned ? "from" : "purchaseDate"
	if (field === "end") return "saleDate"
	if (field === "amount") return `${role}.amount`
	if (field === "growth") return `${role}.growthRate`
	if (field === "category") return "category"
	return field === "derive" ? computedField(role, rest) : null
}

/** The field of a loan payment's path. */
function paymentField(rest: readonly string[]): string | null {
	const [field, part] = rest
	if (field === "start") return "loan.firstPayment"
	if (field === "frequency") return "loan.compounding"
	if (field === "end") return "saleDate"
	if (field !== "level") return null
	return part === undefined ? "loan.principal" : `loan.${part}`
}

const NO_LAYOUT: AssetLayout = { id: "", owned: false, accounts: [], flows: [], percents: [] }

type RoleField = (rest: readonly string[], layout: AssetLayout) => string | null

/** A field of an item that has a start and an amount: `start` is the date field, `amount` the amount's. */
function startAndAmount(start: string, amount: string | null): RoleField {
	return (rest) => {
		if (rest[0] === "start") return start
		return rest[0] === "amount" ? amount : null
	}
}

/** A field that names the form's own field when the path's first segment is one of these. */
function only(fields: Readonly<Record<string, string>>): RoleField {
	return (rest) => fields[rest[0] ?? ""] ?? null
}

/** The field of one item's path, by the role the item has in the asset. */
const ROLE_FIELDS: Readonly<Record<keyof AssetIds, RoleField>> = {
	account: only({ rate: "valueRate" }),
	loan: only({ rate: "loan.rate", compounding: "loan.compounding" }),
	purchase: startAndAmount("purchaseDate", "price"),
	buyCost: startAndAmount("purchaseDate", "buyCost"),
	loanDraw: startAndAmount("purchaseDate", "loan.principal"),
	running: (rest, layout) => keepingField("running", rest, layout),
	rent: (rest, layout) => keepingField("rent", rest, layout),
	loanPayment: paymentField,
	sale: only({ start: "saleDate" }),
	loanPayoff: only({ start: "saleDate" }),
	saleCost: (rest) => {
		if (rest[0] === "derive") return computedField("saleCost", rest)
		return startAndAmount("saleDate", "saleCost.amount")(rest, NO_LAYOUT)
	},
}

/** The asset form field a refusal names, or null. The path's list is found wherever it sits in the path. */
export function fieldOfAssetRefusal(error: ErrorBody | null, layout: AssetLayout): string | null {
	const segments = error?.path?.split(".") ?? []
	const at = segments.findIndex((segment) => segment === "flows" || segment === "accounts")
	if (at < 0) return null
	const [collection, ref, ...rest] = segments.slice(at)
	const id = resolve(ref, collection === "accounts" ? layout.accounts : layout.flows)
	const ids = assetIds(layout.id)
	const role = (Object.keys(ids) as (keyof AssetIds)[]).find((key) => ids[key] === id)
	return role === undefined ? null : ROLE_FIELDS[role](rest, layout)
}

/** What an asset form shows: its own problems, and the CLI's refusal at the field its path names. */
export function assetShown(
	problems: Problems,
	refusal: ErrorBody | null,
	message: string | null,
	layout: AssetLayout,
): Shown {
	const named = fieldOfAssetRefusal(refusal, layout)
	const worded = wordedRefusal(refusal, layout, named)
	const refused = worded === null ? named : worded.field
	const text = worded?.text ?? message ?? undefined
	return {
		at: (field) => problems[field] ?? (refused === field ? text : undefined),
		general: problems["general"] ?? (refused === null ? text : undefined),
	}
}
