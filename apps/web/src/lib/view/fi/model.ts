import type { Fi, FiResult } from "../../contract"
import { formatDate, formatMonth } from "../../format"
import { agesText } from "../household/model"
import { bindingSentence, type UnreachableBinding } from "./binding"
import { type ReferenceView, referenceOf } from "./reference"

/** The best case an unreachable answer names: a run-out, or the buffer breach that stops the month. */
export type BestCaseView =
	| {
			readonly kind: "runsOut"
			readonly month: string
			readonly date: string
			readonly unmet: string
	  }
	| {
			readonly kind: "bufferBreach"
			readonly month: string
			readonly date: string
			readonly required: string
			readonly accessible: string
	  }

/** The FI date is reachable: its month, its day, and the reference it was read against. */
export interface ReachableFi {
	readonly kind: "reachable"
	readonly month: string
	readonly date: string
	/** Each household person's age on the FI date, as the CLI states it ("me 54, partner 52"); null without a household. */
	readonly ages: string | null
	readonly reference: ReferenceView
}

/** The FI date is not reachable before the horizon: what binds, and the best case when there is one. */
export interface UnreachableFi {
	readonly kind: "unreachable"
	readonly horizon: string
	readonly binding: UnreachableBinding
	readonly sentence: string
	readonly best: BestCaseView | null
}

/** The FI answer of one Scenario, ready to render. */
export type FiModel = ReachableFi | UnreachableFi

/** The FI answer of a Scenario as the page shows it. */
export function fiModelOf(fi: Fi): FiModel {
	const result = fi.fi
	if (result.reachable) {
		return {
			kind: "reachable",
			month: formatMonth(result.fiDate),
			date: formatDate(result.fiDate),
			ages: result.ages.length === 0 ? null : agesText(result.ages),
			reference: referenceOf(result.reference),
		}
	}
	return {
		kind: "unreachable",
		horizon: formatDate(fi.horizon),
		binding: result.binding,
		sentence: bindingSentence(result.binding),
		best: "bestCase" in result ? bestCaseOf(result.bestCase) : null,
	}
}

function bestCaseOf(
	best: Extract<FiResult, { reachable: false; bestCase: unknown }>["bestCase"],
): BestCaseView {
	if ("runsOut" in best) {
		return {
			kind: "runsOut",
			month: formatMonth(best.month),
			date: formatDate(best.runsOut.date),
			unmet: best.runsOut.unmet,
		}
	}
	return {
		kind: "bufferBreach",
		month: formatMonth(best.month),
		date: formatDate(best.bufferBreach.date),
		required: best.bufferBreach.required,
		accessible: best.bufferBreach.accessible,
	}
}
