/**
 * What a drawer shows: its own problems, and the CLI's refusal in its own words at the field its path names. A refusal that
 * names the row or the transfer this drawer sent lands at that field (`FIELDS` says which); any other refusal, and a
 * failure to reach traj, is shown for the form as a whole.
 */
import type { Shown } from "../plan-items/problems"
import type { ListName } from "./entries"
import type { Place } from "./refusal"

/** The drawer field of each key a refusal's path may end in. */
export const STEP_FIELDS: Readonly<Record<string, string>> = {
	account: "account",
	upTo: "amount",
	amount: "amount",
	share: "share",
	growth: "rate",
	bps: "rate",
}
export const ENTRY_FIELDS: Readonly<Record<string, string>> = {
	account: "account",
	downTo: "amount",
	amount: "amount",
	growth: "rate",
	bps: "rate",
}
export const TRANSFER_FIELDS: Readonly<Record<string, string>> = {
	source: "source",
	target: "target",
	amount: "amount",
	rate: "rate",
	share: "share",
	start: "start",
	startAt: "start",
	end: "end",
	frequency: "frequency",
	realise: "realise",
}

/** What a drawer shows, given where the refusal landed (`field` is the drawer's field, or null when it names none). */
function shownAt(
	problems: Readonly<Record<string, string>>,
	field: string | null | undefined,
	message: string | null,
): Shown {
	return {
		at: (name) => problems[name] ?? (field === name ? (message ?? undefined) : undefined),
		general:
			problems["general"] ??
			(field === undefined || field === null ? (message ?? undefined) : undefined),
	}
}

/** What the drawer of one routing row shows. `sentAt` is the row's position in the list the drawer sent. */
export function shownForRow(
	problems: Readonly<Record<string, string>>,
	place: Place | null,
	message: string | null,
	row: { list: ListName; sentAt: number | null; fields: Readonly<Record<string, string>> },
): Shown {
	const mine = place?.kind === "row" && place.list === row.list && place.index === row.sentAt
	return shownAt(problems, mine ? (row.fields[place.field] ?? null) : undefined, message)
}

/** What the drawer of one transfer shows. */
export function shownForFlow(
	problems: Readonly<Record<string, string>>,
	place: Place | null,
	message: string | null,
	id: string | null,
): Shown {
	const mine = place?.kind === "flow" && place.id === id
	return shownAt(problems, mine ? (TRANSFER_FIELDS[place.field] ?? null) : undefined, message)
}

/** The CLI's refusal at a row of a routing list, to show on the row itself, or undefined when it names another place. */
export function rowRefusal(
	place: Place | null,
	message: string | null,
	list: ListName,
	index: number,
): string | undefined {
	const mine = place?.kind === "row" && place.list === list && place.index === index
	return mine ? (message ?? undefined) : undefined
}
