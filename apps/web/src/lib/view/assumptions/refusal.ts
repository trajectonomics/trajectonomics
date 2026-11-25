/**
 * Which field of the page a `traj` refusal names. The CLI's path runs through the Account by its id (`document.accounts.fund.volatility`, `…fund.fee.bps`,
 * after the `--decimal` conversion) or by its position (`accounts.1.rate`, from the engine's own checks), and through `economy`
 * for inflation. Both forms are matched against the Accounts the save sent, in the document's order.
 */
import type { ErrorBody } from "../../contract"
import type { Shown } from "../plan-items/problems"
import { fieldKey } from "./draft"

/** The Account a path's `accounts` segment names, by its id or its position in the document, or null. */
function accountOf(ref: string | undefined, accountIds: readonly string[]): string | null {
	if (ref === undefined) return null
	if (accountIds.includes(ref)) return ref
	return accountIds[/^\d+$/.test(ref) ? Number(ref) : -1] ?? null
}

/** The field a refusal names: `inflation`, or `rate:<id>`, `volatility:<id>` and the fee's; null when it names none of the page's. */
export function assumptionFieldOfRefusal(
	error: ErrorBody | null,
	accountIds: readonly string[],
): string | null {
	const segments = error?.path?.split(".") ?? []
	if (segments.includes("economy")) return "inflation"
	const at = segments.indexOf("accounts")
	const id = at < 0 ? null : accountOf(segments[at + 1], accountIds)
	const field = segments[at + 2]
	if (id === null) return null
	if (field === "rate" || field === "volatility") return fieldKey(field, id)
	// The key straight after `fee` names the field, as in the Account form: the rounding, else the share.
	if (field !== "fee") return null
	return fieldKey(segments[at + 3] === "rounding" ? "feeRounding" : "feeRate", id)
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
