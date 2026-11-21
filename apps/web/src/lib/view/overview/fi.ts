import type { Fi } from "../../contract"
import { formatDate, formatMonth } from "../../format"
import { bindingSentence } from "../fi/binding"

/** The FI answer as a card states it: a month, or the horizon it is not reached by and what binds. */
export type FiView =
	| { readonly reachable: true; readonly month: string }
	| { readonly reachable: false; readonly horizon: string; readonly binding: string }

/** The FI card's reading of one `fi` Read. */
export function fiView(data: Fi): FiView {
	const result = data.fi
	if (result.reachable) return { reachable: true, month: formatMonth(result.fiDate) }
	return {
		reachable: false,
		horizon: formatDate(data.horizon),
		binding: bindingSentence(result.binding),
	}
}
