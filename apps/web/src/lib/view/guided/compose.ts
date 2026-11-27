/**
 * The guided first plan composed from the Snapshot and the person's answers
 * ([web ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)): the
 * draft every step starts from, and the one Edit that saves it. Pure: the page computes no figure and no date.
 */
import type { Snapshot } from "../../contract"
import type { EditInput } from "../../edit/edit"
import type { GuidedEdit } from "../../edit/guided-edit"
import type { PersonDraft } from "../household/person-draft"
import { householdOf } from "../item-names/snapshot"
import { mainPlan } from "../plans/rows"
import { type MoneyView, moneyOf } from "./money"
import { amountSent, draftsOf, type RowDrafts, type TotalsDraft } from "./money-draft"
import { peopleOf, startingPeople } from "./people"
import { type GuidedDraft, problemsOf } from "./steps"

/** What the steps start from: the read's rows, the main household's people, and the CLI's two totals. */
export interface GuidedSeed {
	readonly money: MoneyView
	readonly people: readonly PersonDraft[]
	readonly rows: RowDrafts
	readonly totals: TotalsDraft
}

/** The draft of a fresh guided plan, as the Snapshot states it. */
export function seedOf(snapshot: Snapshot): GuidedSeed {
	const read = snapshot.reads.rates
	const money = moneyOf(read?.ok === true ? read.data : undefined)
	const household = householdOf(snapshot, mainPlan(snapshot))
	return {
		money,
		people: startingPeople(household?.people),
		rows: draftsOf(money.rows),
		totals: { income: money.totals.income ?? "", spending: money.totals.spending ?? "" },
	}
}

/** The Edit the answers make, or the first problem that stops it. */
export type Composed =
	| { readonly ok: true; readonly edit: Extract<EditInput, { kind: "start-guided-plan" }> }
	| { readonly ok: false; readonly problem: string }

/** One row of the history answers: every carried row, kept or not, with the typed amount and earned flag. */
function historyRows(draft: GuidedDraft) {
	return draft.money.rows.map((row) => {
		const answer = draft.rows[row.id] ?? { keep: true, amount: "", earned: true }
		// A dropped row takes no amount: its field is off, and the CLI would read a typed amount as a kept row's.
		const amount = answer.keep ? amountSent(answer.amount) : undefined
		return {
			id: row.id,
			keep: answer.keep,
			...(amount === undefined ? {} : { amount }),
			...(row.type === "income" ? { earned: answer.earned } : {}),
		}
	})
}

/** The one Edit the answers make, or the problem that stops the save. */
export function guidedEditOf(draft: GuidedDraft, asOf: string): Composed {
	const problems = [
		...problemsOf("household", draft),
		...problemsOf("money", draft),
		...problemsOf("stop", draft),
	]
	const first = problems[0]
	if (first !== undefined) return { ok: false, problem: first }
	const household = peopleOf(draft.people)
	const name = draft.name.trim()
	const money: GuidedEdit["money"] =
		draft.money.path === "history"
			? { from: "history", rows: historyRows(draft) }
			: {
					from: "totals",
					income: amountSent(draft.totals.income) ?? "",
					spending: amountSent(draft.totals.spending) ?? "",
				}
	return {
		ok: true,
		edit: {
			kind: "start-guided-plan",
			name,
			asOf,
			money,
			people: [...household.people],
			stopWork: { person: household.holder, age: Number(draft.age.trim()) },
		},
	}
}
