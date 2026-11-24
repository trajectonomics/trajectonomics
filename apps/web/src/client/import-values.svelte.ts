import type { AccountValues } from "../lib/contract"
import { FRESH } from "../lib/view/import-values/fresh"
import { keepChoices, type Matches, type Target, withChoice } from "../lib/view/import-values/match"
import { type ImportPlan, importEdit } from "../lib/view/import-values/plan"
import {
	IDLE,
	type ImportPreview,
	previewOf,
	RUNNING,
	refusedWith,
} from "../lib/view/import-values/preview"
import { importRefusal } from "../lib/view/import-values/refusals"
import type { StepName } from "../lib/view/import-values/steps"
import type { ImportSource, Layout } from "../lib/view/import-values/types"
import { chosenAgainst } from "../lib/view/record-values/draft"
import type { ValueSheet } from "../lib/view/record-values/types"
import { editSession } from "./edit.svelte.js"
import { readPickedText } from "./pick-text-file.js"
import { valueSheetSession } from "./record-values.svelte.js"

/**
 * The Import a balance history wizard of this tab: the draft text and its matches, and what the dry run said. Nothing
 * is written until `commit`, and `cancel` forgets the draft. The account to count against is the sheet's, chosen
 * once ([ADR 0008](../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
 */
class ImportSession {
	open = $state(false)
	step = $state<StepName>("load")
	text = $state("")
	layout = $state<Layout>("dates-down")
	fileName = $state<string | null>(null)
	fileProblem = $state<string | null>(null)
	matches = $state<Matches>({})
	preview = $state<ImportPreview>(IDLE)
	/** What `traj` stated for the import; null until one ran. */
	saved = $state<AccountValues | null>(null)
	/** True while the Import is running: the wizard cannot be closed or stepped back until traj answers. */
	committing = $state(false)
	private asked = 0

	show(): void {
		this.open = true
	}

	/** Closes the wizard and forgets the draft: nothing was written before the import. */
	cancel(): void {
		if (this.committing) return
		Object.assign(this, FRESH)
		this.asked++
	}

	/** Puts a chosen file's text in the draft, where it can be fixed by hand. */
	async load(input: HTMLInputElement): Promise<void> {
		const picked = await readPickedText(input)
		if (picked === null) return
		this.fileProblem = "problem" in picked ? picked.problem : null
		if ("text" in picked) {
			this.text = picked.text
			this.fileName = picked.name
		}
	}

	/** To the match, with the accounts whose name or id the table states already chosen, and the person's earlier choices kept. */
	toMatch(sources: readonly ImportSource[], targets: readonly Target[]): void {
		this.matches = keepChoices(this.matches, sources, targets)
		this.step = "match"
	}

	choose(key: string, choice: string): void {
		this.matches = withChoice(this.matches, key, choice)
	}

	back(): void {
		if (this.committing || this.preview.state === "running") return
		this.preview = IDLE
		this.asked++
		this.step = this.step === "review" ? "match" : "load"
	}

	/** To the review, which asks traj for the dry run at once. */
	async toReview(plan: ImportPlan, sheet: ValueSheet): Promise<void> {
		this.step = "review"
		await this.check(plan, sheet)
	}

	/** Runs the Edit as a preview: traj's dry run, nothing written. Asked again when the account to count against changes. */
	async check(plan: ImportPlan, sheet: ValueSheet): Promise<void> {
		const against = chosenAgainst(valueSheetSession.draft(), sheet)
		const ask = ++this.asked
		if (against === null || plan.sent.length === 0 || plan.tooMany) {
			this.preview = IDLE
			return
		}
		this.preview = RUNNING
		const answer = await editSession.preview(importEdit(plan, against.id, true))
		if (ask !== this.asked) return
		this.preview =
			answer === null
				? refusedWith("Another change is still running. Try again in a moment.")
				: previewOf(answer, plan.sent)
	}

	/** Runs the same Edit for real. A refusal at this point is shown as the dry run's would be, and nothing is written. */
	async commit(plan: ImportPlan, sheet: ValueSheet): Promise<void> {
		const against = chosenAgainst(valueSheetSession.draft(), sheet)
		if (against === null) return
		const ask = ++this.asked
		this.committing = true
		const ran = await editSession.run(importEdit(plan, against.id, false), "import-values")
		this.committing = false
		if (ask !== this.asked) return
		if (ran) {
			this.saved = editSession.result
			this.step = "done"
			return
		}
		const failure = editSession.failure
		this.preview = failure
			? { state: "refused", refusal: importRefusal(failure, plan.sent) }
			: refusedWith(editSession.error ?? "The values were not imported.")
	}
}

/** The one wizard of the page. */
export const importSession = new ImportSession()
