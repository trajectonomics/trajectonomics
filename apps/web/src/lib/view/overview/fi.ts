import type { Fi } from "../../contract"
import { formatDate, formatMonth } from "../../format"

/** The FI answer as a card states it: a month, or the horizon it is not reached by and what binds. */
export type FiView =
	| { readonly reachable: true; readonly month: string }
	| { readonly reachable: false; readonly horizon: string; readonly binding: string }

/** What each binding means, in words a reader can act on. Keyed by the CLI's binding names. */
const BINDING_WORDS: Readonly<Record<Extract<Fi["fi"], { reachable: false }>["binding"], string>> =
	{
		noCandidateMonth: "No month before the horizon can be the month work stops.",
		shortfallBeforeStop: "The money runs out before any month in which work could stop.",
		undrawableMoney:
			"The shortfall could be covered only by locked money, or money not routed to an account.",
		insufficientMoney:
			"Even with every asset, the money does not cover the spending once work stops.",
		minimumBuffer: "Accessible money falls below the minimum buffer the Scenario requires.",
	}

/** The FI card's reading of one `fi` Read. */
export function fiView(data: Fi): FiView {
	const result = data.fi
	if (result.reachable) return { reachable: true, month: formatMonth(result.fiDate) }
	return {
		reachable: false,
		horizon: formatDate(data.horizon),
		binding: BINDING_WORDS[result.binding],
	}
}
