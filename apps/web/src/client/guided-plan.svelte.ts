import { goto } from "$app/navigation"
import type { Snapshot } from "../lib/contract"
import { guidedEditOf, seedOf } from "../lib/view/guided/compose"
import type { RowDraft, RowDrafts, TotalsDraft } from "../lib/view/guided/money-draft"
import { blankPerson } from "../lib/view/guided/people"
import { type GuidedDraft, previousOf, type Step } from "../lib/view/guided/steps"
import type { PersonDraft } from "../lib/view/household/person-draft"
import { withSearch } from "../lib/view/links"
import { storedNames } from "../lib/view/plans/rows"
import { editSession } from "./edit.svelte.js"
import { currentSearch } from "./location.svelte.js"
import { withParam } from "./query-string.js"
import { selectPlan } from "./select-plan.svelte.js"

/**
 * The guided first plan of this tab: the step it is on and the answers given so far. Nothing is written until
 * Save, and nothing is stored, so a reload starts over ([web ADR 0031](../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)).
 * The steps start from the Snapshot's own values, which the page reads as their seed.
 */
class GuidedPlanSession {
	step = $state<Step>("household")
	people = $state<readonly PersonDraft[] | null>(null)
	rows = $state<RowDrafts | null>(null)
	totals = $state<TotalsDraft | null>(null)
	name = $state("")
	age = $state("")
	/** The CLI's refusal, unchanged, and whether it offers Reload. */
	refusal = $state<string | null>(null)
	reloadable = $state(false)

	/** Everything the steps ask, as it stands on top of the Snapshot's seed. */
	draftOf(snapshot: Snapshot): GuidedDraft {
		const seed = seedOf(snapshot)
		return {
			money: seed.money,
			people: this.people ?? seed.people,
			rows: this.rows ?? seed.rows,
			totals: this.totals ?? seed.totals,
			name: this.name,
			age: this.age,
			stored: storedNames(snapshot),
		}
	}

	/** Back keeps every answer. */
	back(): void {
		const before = previousOf(this.step)
		if (before !== null) this.step = before
	}

	/** Cancel forgets everything, so the next visit starts from the Snapshot again, and goes back to Plans. */
	cancelAndLeave(): void {
		this.cancel()
		void goto(withSearch("/plans/", currentSearch()))
	}

	/** Saves the one Edit, selects the plan it made and opens Home; a refusal stays above Save. */
	async save(snapshot: Snapshot): Promise<void> {
		const made = guidedEditOf(this.draftOf(snapshot), snapshot.params.asOf)
		if (!made.ok) {
			this.refusal = made.problem
			this.reloadable = false
			return
		}
		this.refusal = null
		this.reloadable = false
		if (await editSession.run(made.edit)) {
			const search = withParam(currentSearch(), "scenario", made.edit.name)
			selectPlan(made.edit.name)
			this.cancel()
			await goto(withSearch("/", search))
			return
		}
		const failure = editSession.failure
		this.refusal = failure?.message ?? editSession.error ?? "The plan was not saved."
		this.reloadable = failure?.code === "guided_ledger_changed"
		// A plan saved without its household is in the ledger already: read again so Plans lists it.
		if (failure?.code === "guided_plan_half_saved") await editSession.addPlan(made.edit.name)
	}

	/** Reads the Snapshot again and keeps every answer, so the save may be tried once more. */
	async reload(): Promise<void> {
		if (await editSession.reread()) this.refusal = null
	}

	changePerson(seed: readonly PersonDraft[], index: number, change: Partial<PersonDraft>): void {
		const people = [...(this.people ?? seed)]
		const person = people[index]
		if (person === undefined) return
		people[index] = { ...person, ...change }
		this.people = people
	}

	addPerson(seed: readonly PersonDraft[], role: "partner" | "dependent"): void {
		this.people = [...(this.people ?? seed), blankPerson(role)]
	}

	changeRow(seed: RowDrafts, id: string, change: Partial<RowDraft>): void {
		const rows = this.rows ?? seed
		const row = rows[id]
		if (row === undefined) return
		this.rows = { ...rows, [id]: { ...row, ...change } }
	}

	changeTotal(seed: TotalsDraft, field: "income" | "spending", value: string): void {
		this.totals = { ...(this.totals ?? seed), [field]: value }
	}

	cancel(): void {
		this.step = "household"
		this.people = null
		this.rows = null
		this.totals = null
		this.name = ""
		this.age = ""
		this.refusal = null
		this.reloadable = false
	}
}

/** The one guided plan of the page. */
export const guidedSession = new GuidedPlanSession()
