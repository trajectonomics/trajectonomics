import { financialIndependence, type LevyReport, project } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { isAppError } from "../errors"
import { agesOn } from "../scenario/household/ages"
import type { Placed } from "./carryin-apply"
import { echoOf } from "./echo"
import { refusal } from "./engine"
import { bestCaseView, referenceView } from "./fi-figures"
import { FI_METHOD, horizonNote } from "./fi-method"
import type { FiAnswer, FiLeafAnswer, FiView } from "./fi-view"
import { fundingNotes } from "./funding"
import { taxYearsOf } from "./tax-view"
import { withdrawNotes } from "./withdraw-notes"

/** The engine's survival answer in the CLI's money, with its own definition echo (ADR-0008). */
export type FiSolution = {
	fi: FiAnswer
	/** The Levy results of the path a reachable answer describes, earned income stopped at FI (ADR-0051). */
	levies?: readonly LevyReport[]
	definition: { method: "survival"; definitionVersion: number }
}

export function fiAnswerOf(prepared: Placed): FiSolution | AppError {
	const result = financialIndependence(prepared.baseline, prepared.document, prepared.timeline, {
		method: "survival",
	})
	if (!result.ok) return refusal(result.problems)
	const answer = result.financialIndependence
	const definition = {
		method: answer.definition.method,
		definitionVersion: answer.definition.definitionVersion,
	}
	if (answer.reachable) {
		return {
			fi: {
				reachable: true,
				fiDate: answer.month,
				reference: referenceView(answer.reference, prepared.currency),
			},
			...(answer.levies === undefined ? {} : { levies: answer.levies }),
			definition,
		}
	}
	if (answer.binding === "noCandidateMonth") {
		return { fi: { reachable: false, binding: answer.binding }, definition }
	}
	return {
		fi: {
			reachable: false,
			binding: answer.binding,
			bestCase: bestCaseView(answer.bestCase, prepared.currency),
		},
		definition,
	}
}

/** A reachable answer states the household's ages on its FI date; the others carry none. */
function withAges(answer: FiAnswer, prepared: Placed): FiLeafAnswer {
	if (!answer.reachable) return answer
	return { ...answer, ages: agesOn(prepared.household, answer.fiDate) }
}

/** Said when `taxYears` describes the working path, because no FI date exists to stop it at (ADR-0051). */
export const WORKING_PATH_NOTE = "FI is not reachable, so taxYears describes the plan as written."

/** `traj fi`: the survival answer with its definition echoed (ADR-0008). */
export function independenceOf(prepared: Placed): FiView | AppError {
	const solution = fiAnswerOf(prepared)
	if (isAppError(solution)) return solution
	// The answer's own Levy results describe the stopped path. Only an unreachable answer has none,
	// so its rows come from the working path's Projection, and a note says so (ADR-0051).
	const result = project(prepared.baseline, prepared.document, prepared.timeline)
	if (!result.ok) return refusal(result.problems)
	return {
		...echoOf(prepared),
		notes: [
			...prepared.notes,
			...fundingNotes(result.projection.unfundedContributions, prepared.currency),
			...withdrawNotes(prepared.document, result.projection, prepared.currency),
			...(solution.fi.reachable ? [] : [WORKING_PATH_NOTE]),
			horizonNote(prepared.timeline.horizon),
		],
		horizon: prepared.timeline.horizon,
		currency: prepared.currency,
		method: solution.definition.method,
		definition: { ...solution.definition, explanation: FI_METHOD },
		fi: withAges(solution.fi, prepared),
		taxYears: taxYearsOf(
			solution.fi.reachable ? solution.levies : result.projection.levies,
			prepared.currency,
			prepared.document,
		),
	}
}
