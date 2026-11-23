<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { Baseline, Read, ScenarioDocument } from "../../lib/contract"
import { balanceOf } from "../../lib/view/plan-items/accounts"
import { loanDocument, loanOf, withoutLoan } from "../../lib/view/plan-items/loan-document"
import { type LoanDraft, loanDraftOf, loanFromDraft } from "../../lib/view/plan-items/loan-draft"
import { type LoanLayout, loanLayoutOf, loanShown } from "../../lib/view/plan-items/loan-refusal"
import type { Problems } from "../../lib/view/plan-items/problems"
import ItemActions from "./ItemActions.svelte"
import LoanFields from "./LoanFields.svelte"
import { tryLoanInWhatIf } from "./loan-what-if"
import TryNotice from "./TryNotice.svelte"

interface Props {
	/** The plan's name, which the Edit saves the document under. */
	name: string
	/** The content hash of the plan the page read, which every Edit to it names (cli ADR 0055). */
	contentHash: string
	doc: ScenarioDocument
	/** The Baseline: a loan the ledger already owes shows the balance the Baseline holds. */
	baseline: Read<Baseline>
	/** The loan to edit, by the id of its liability Account; absent for a new loan. */
	loanId?: string | undefined
	/** Runs once the Edit has run, so the drawer closes and the page shows the new Snapshot. */
	onDone: () => void
	/** True when the drawer tries values in the What-if session, instead of saving them. */
	tryValue?: boolean
}

let { name, contentHash, doc, baseline, loanId, onDone, tryValue = false }: Props = $props()
const existing = $derived(loanId === undefined ? undefined : loanOf(doc, loanId))
const owed = $derived(existing === undefined ? null : balanceOf(existing.account, baseline))
const initial = () => loanDraftOf(existing)
let draft: LoanDraft = $state(initial())
let problems: Problems = $state({})
/** The layout of the document the last save sent, so a refusal's path is read against it. */
let layout: LoanLayout = $state({
	account: { id: "", index: -1 },
	payment: { id: "", index: -1 },
	draw: null,
})
let cleared: string[] = $state([])
const shown = $derived(loanShown(problems, editSession.failure, editSession.error, layout))

/** Saves the plan's document with the loan's change, as one Edit; the drawer closes only when it ran. */
async function commit(next: ScenarioDocument, sent: LoanLayout): Promise<void> {
	layout = sent
	if (await editSession.run({ kind: "apply-plan", name, contentHash, document: next })) onDone()
}

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = loanFromDraft(draft, { existing, doc })
	if (!result.ok) {
		editSession.clear()
		problems = result.problems
		return
	}
	problems = {}
	if (tryValue) {
		cleared =
			existing === undefined ? [] : tryLoanInWhatIf(name, contentHash, existing, result.loan)
		if (cleared.length === 0) onDone()
		return
	}
	const next = loanDocument(doc, result.loan, existing)
	await commit(next, loanLayoutOf(next, result.loan))
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={existing ? `Edit loan ${existing.account.id}` : "Add loan"}>
	<LoanFields bind:draft editing={existing !== undefined} {owed} {shown} />
	<TryNotice fields={cleared} />
	<ItemActions
		id={existing?.account.id}
		onDelete={() => commit(withoutLoan(doc, existing?.account.id ?? ""), layout)}
		trying={tryValue}
	/>
</form>
