import { goto } from "$app/navigation"
import type { Snapshot } from "../lib/contract"
import { seedOf } from "../lib/view/guided/compose"
import type { RowDraft, RowDrafts, TotalsDraft } from "../lib/view/guided/money-draft"
import { blankPerson, startingKeys } from "../lib/view/guided/people"
import { type GuidedDraft, nextOf, previousOf, type Step } from "../lib/view/guided/steps"
import type { PersonDraft } from "../lib/view/household/person-draft"
import { withSearch } from "../lib/view/links"
import { storedNames } from "../lib/view/plans/rows"
import { currentSearch } from "./location.svelte.js"

/**
 * The guided first plan of this tab: the step it is on and the answers given so far. Nothing is written until
 * Save, and nothing is stored, so a reload starts over ([web ADR 0031](../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)).
 * The steps start from the Snapshot's own values, which the page reads as their seed. The save itself is in
 * `guided-plan.svelte.ts`, which adds the write path to this state.
 */
export class GuidedPlanState {
	step = $state<Step>("household")
	people = $state<readonly PersonDraft[] | null>(null)
	/** One durable key per person, so a Remove never hands another person's answers to their fields. */
	personKeys = $state<readonly string[] | null>(null)
	private added = 0
	rows = $state<RowDrafts | null>(null)
	totals = $state<TotalsDraft | null>(null)
	name = $state("")
	age = $state("")
	/** True once Next found a problem: every field's problem shows until the step changes. */
	showProblems = $state(false)
	/** The CLI's refusal, unchanged, and the hint it offers under the refusal. */
	refusal = $state<string | null>(null)
	hint = $state<string | null>(null)
	reloadable = $state(false)

	/** Everything the steps ask, as it stands on top of the Snapshot's seed. */
	draftOf(snapshot: Snapshot): GuidedDraft {
		const seed = seedOf(snapshot)
		return {
			money: seed.money,
			people: this.people ?? seed.people,
			rows: this.rowsFor(seed.rows),
			totals: this.totals ?? seed.totals,
			name: this.name,
			age: this.age,
			stored: storedNames(snapshot),
		}
	}

	/** Back keeps every answer. */
	back(): void {
		const before = previousOf(this.step)
		if (before === null) return
		this.showProblems = false
		this.step = before
	}

	/** Next moves on while no problem holds the step; the page shows the problems instead when one does. */
	advance(): void {
		const next = nextOf(this.step)
		if (next === null) return
		this.showProblems = false
		this.step = next
	}

	/** Cancel forgets everything, so the next visit starts from the Snapshot again, and goes back to Plans. */
	cancelAndLeave(): void {
		this.cancel()
		void goto(withSearch("/plans/", currentSearch()))
	}

	changePerson(seed: readonly PersonDraft[], index: number, change: Partial<PersonDraft>): void {
		const people = [...(this.people ?? seed)]
		const person = people[index]
		if (person !== undefined) this.people = people.with(index, { ...person, ...change })
	}

	/** One key per person as they show now: the read's own, or one this tab gave a person it added. */
	keysFor = (seed: readonly PersonDraft[]) => this.personKeys ?? startingKeys(seed)

	addPerson(seed: readonly PersonDraft[], role: "partner" | "dependent"): void {
		this.people = [...(this.people ?? seed), blankPerson(role)]
		this.personKeys = [...this.keysFor(seed), `added-${this.added++}`]
	}

	/** A person the page added leaves the household; the holder stays, because the stop-work age is theirs. */
	removePerson(seed: readonly PersonDraft[], index: number): void {
		const people = [...(this.people ?? seed)]
		if (people[index] === undefined || people[index].role === "holder") return
		const keys = [...this.keysFor(seed)]
		people.splice(index, 1)
		keys.splice(index, 1)
		this.people = people
		this.personKeys = keys
	}

	/**
	 * The answers for every row the current seed carries, by id: a kept answer for a row that is still there,
	 * the seed for one that is new, and nothing for a row the read no longer carries.
	 */
	rowsFor(seed: RowDrafts): RowDrafts {
		const answers = this.rows
		if (answers === null) return seed
		return Object.fromEntries(Object.entries(seed).map(([id, row]) => [id, answers[id] ?? row]))
	}

	changeRow(seed: RowDrafts, id: string, change: Partial<RowDraft>): void {
		const rows = { ...seed, ...this.rowsFor(seed) }
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
		this.personKeys = null
		this.added = 0
		this.rows = null
		this.totals = null
		this.name = ""
		this.age = ""
		this.showProblems = false
		this.refusal = null
		this.hint = null
		this.reloadable = false
	}
}
