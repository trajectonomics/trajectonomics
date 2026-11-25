/**
 * The estate form as it holds its text. Every share and amount is the person's own: no field starts with a value
 * (`traj` ships none, cli ADR 0064), and the way a line is set, what a share is of and its rounding start unchosen.
 * The form moves text and works no figure out: a share or an amount stays as typed until `traj` reads it.
 */
import type { EstateBlock, EstateLine } from "../../contract"
import { formatBps } from "../../format/bps"

/** One cost or gift as text. `how` is "" until chosen, then "share" or "fixed". */
export interface LineDraft {
	/** The id an existing line keeps; "" for a line the person is adding, which takes its id from `name`. */
	id: string
	name: string
	how: string
	/** A cost's base: "" until chosen, then "gross" or "accounts". A gift's base is the net estate and is not chosen. */
	of: string
	accounts: string[]
	share: string
	rounding: string
	amount: string
	/** "" until chosen, then "inflation" or "fixed" (the percent in `rate`). */
	growth: string
	rate: string
}

/** The two lists of the block, in the order the plan states them. */
export interface EstateDraft {
	costs: LineDraft[]
	gifts: LineDraft[]
}

/** The two lists a line belongs to. */
export type ListName = keyof EstateDraft

/** A line with nothing typed and nothing chosen. */
export function emptyLine(): LineDraft {
	return {
		id: "",
		name: "",
		how: "",
		of: "",
		accounts: [],
		share: "",
		rounding: "",
		amount: "",
		growth: "",
		rate: "",
	}
}

/** How a line is set, as the form's choice: a share, a fixed amount, or neither (which the form asks again). */
function howOf(line: EstateLine): string {
	if (line.bps !== undefined) return "share"
	return line.amount !== undefined ? "fixed" : ""
}

/** A cost's base as the form's choice: "gross", "accounts" with the Accounts, or "" for none. */
function baseOf(line: EstateLine): { of: string; accounts: string[] } {
	const of = line.of
	if (of === undefined) return { of: "", accounts: [] }
	return typeof of === "string"
		? { of, accounts: [] }
		: { of: "accounts", accounts: [...of.accounts] }
}

/** A fixed amount's growth as the form's choice and the percent a fixed one holds. */
function growthOf(line: EstateLine): { growth: string; rate: string } {
	const growth = line.growth
	if (growth === undefined) return { growth: "", rate: "" }
	return growth === "inflation"
		? { growth, rate: "" }
		: { growth: "fixed", rate: formatBps(growth.bps) }
}

/** The text of a line the plan holds. */
function lineDraftOf(line: EstateLine): LineDraft {
	return {
		...emptyLine(),
		id: line.id,
		name: line.id,
		how: howOf(line),
		...baseOf(line),
		share: line.bps ?? "",
		rounding: line.rounding ?? "",
		amount: line.amount ?? "",
		...growthOf(line),
	}
}

/** The form's text for the plan's estate block: its lines as they stand, or two empty lists. */
export function draftOf(block: EstateBlock | undefined): EstateDraft {
	return {
		costs: (block?.costs ?? []).map(lineDraftOf),
		gifts: (block?.gifts ?? []).map(lineDraftOf),
	}
}

/** The key of a field in the form: the list, the line's place in it and the field, which a problem and a refusal share. */
export function fieldKey(list: ListName, index: number, field: string): string {
	return `${list}.${index}.${field}`
}

/** The draft with a line moved one place up or down its list; a line at the edge stays. Gifts take only what earlier ones left, so the order is the person's. */
export function moveLine(
	draft: EstateDraft,
	list: ListName,
	index: number,
	by: -1 | 1,
): EstateDraft {
	const lines = [...draft[list]]
	const to = index + by
	const line = lines[index]
	const other = lines[to]
	if (line === undefined || other === undefined) return draft
	lines[index] = other
	lines[to] = line
	return { ...draft, [list]: lines }
}
