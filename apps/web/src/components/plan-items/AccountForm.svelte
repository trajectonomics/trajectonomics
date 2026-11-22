<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { ScenarioAccount, ScenarioDocument } from "../../lib/contract"
import { accountFromDraft } from "../../lib/view/plan-items/account-draft"
import { accountDraftOf } from "../../lib/view/plan-items/accounts"
import { accountIds, withAccount, withoutAccount } from "../../lib/view/plan-items/document"
import { type Problems, shownProblems } from "../../lib/view/plan-items/problems"
import AccountFields from "./AccountFields.svelte"
import ItemActions from "./ItemActions.svelte"

interface Props {
	/** The plan's name, which the Edit saves the document under. */
	name: string
	/** The content hash of the plan the page read, which every Edit to it names (cli ADR 0051). */
	contentHash: string
	doc: ScenarioDocument
	/** The Account to edit; absent for a new one. */
	existing?: ScenarioAccount | undefined
	/** Runs once the Edit has run, so the drawer closes and the page shows the new Snapshot. */
	onDone: () => void
}

let { name, doc, existing, onDone, contentHash }: Props = $props()
const initial = () => accountDraftOf(existing)
let draft = $state(initial())
let problems: Problems = $state({})
const FIELDS = ["name", "kind", "rate", "compounding", "lockedUntil"]
const shown = $derived(shownProblems(problems, editSession.failure, editSession.error, FIELDS))

/** Saves the plan's document with one change, as one Edit; the drawer closes only when it ran. */
async function commit(next: ScenarioDocument): Promise<void> {
	if (await editSession.run({ kind: "apply-plan", name, contentHash, document: next })) onDone()
}

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = accountFromDraft(draft, { existing, taken: accountIds(doc) })
	if (!result.ok) {
		editSession.clear()
		problems = result.problems
		return
	}
	problems = {}
	await commit(withAccount(doc, result.account))
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={existing ? `Edit ${existing.id}` : "Add account"}>
	<AccountFields bind:draft existingId={existing?.id} {shown} />
	<ItemActions id={existing?.id} onDelete={() => commit(withoutAccount(doc, existing?.id ?? ""))} />
</form>
