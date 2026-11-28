/**
 * The Estate date the address asks for (web ADR 0033). Estate's date is a choice, not a month, so it lives in
 * `?estate=`. An old link put it in `?at=`, which now holds the viewing date: a value there that is not a
 * `YYYY-MM` month is still the Estate's, and a month is not.
 */
import { parseMonth } from "../viewing-date/month"

/** The Estate choice: `?estate=` when set, else an old `?at=` that is not a viewing month, else the page's default (`""`). */
export function estateChoice(estate: string, at: string): string {
	if (estate !== "") return estate
	if (at !== "" && parseMonth(at) === null) return at
	return ""
}
