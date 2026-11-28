import type { Snapshot } from "../../contract"
import { householdOf, personNames } from "../item-names"
import { answerFocus, dataOf, runsOutFocus, setupFocus } from "./focus-cases"
import type { FocusView } from "./focus-types"
import { heroOf } from "./hero"
import { homePlan } from "./scenario"

export type {
	FocusButton,
	FocusCounts,
	FocusFace,
	FocusKind,
	FocusView,
} from "./focus-types"

/** The one answer Home opens on. The first case that matches wins, and every word is a CLI field. */
export function focusOf(snapshot: Snapshot, requested = ""): FocusView {
	const plan = homePlan(snapshot, requested)
	if (plan === null) return setupFocus("first")
	const fi = dataOf(snapshot.reads.fi[plan])
	const hero = heroOf(snapshot, requested)
	if (fi === null || hero === null) return setupFocus("plan")
	const run = dataOf(snapshot.reads.projections[plan])
	const household = householdOf(snapshot, plan)
	const people = personNames(household)
	const out = run?.runsOut ?? null
	if (run !== null && out !== null) return runsOutFocus(plan, run, out, household, people)
	return answerFocus(plan, fi, run, hero.sentence, snapshot.reads.chance[plan], household, people)
}
