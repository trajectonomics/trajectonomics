/**
 * Which field of the page a `traj` refusal names. The CLI's path runs through the Account by its id (`document.accounts.fund.volatility`,
 * after the `--decimal` conversion) or by its position (`accounts.1.rate`, from the engine's own checks), and through `economy`
 * for inflation. Both forms are matched against the Accounts the save sent, in the document's order.
 */
import type { ErrorBody } from "../../contract"
import type { Shown } from "../plan-items/problems"
import { fieldKey } from "./draft"

/** The field a refusal names: `inflation`, or `rate:<id>` / `volatility:<id>`; null when it names none of the page's. */
export function assumptionFieldOfRefusal(
	error: ErrorBody | null,
	accountIds: readonly string[],
): string | null {
	const segments = error?.path?.split(".") ?? []
	if (segments.includes("economy")) return "inflation"
	const at = segments.indexOf("accounts")
	const ref = segments[at + 1]
	const field = segments[at + 2]
	if (at < 0 || ref === undefined || (field !== "rate" && field !== "volatility")) return null
	const id = accountIds.includes(ref) ? ref : accountIds[/^\d+$/.test(ref) ? Number(ref) : -1]
	return id === undefined ? null : fieldKey(field, id)
}

/** What the page shows: its own problems, and the CLI's refusal in its own words on the row its path names. */
export function assumptionsShown(
	problems: Readonly<Record<string, string>>,
	refusal: ErrorBody | null,
	message: string | null,
	accountIds: readonly string[],
): Shown {
	const refused = assumptionFieldOfRefusal(refusal, accountIds)
	const text = message ?? undefined
	return {
		at: (field) => problems[field] ?? (refused === field ? text : undefined),
		general: problems["general"] ?? (refused === null ? text : undefined),
	}
}
